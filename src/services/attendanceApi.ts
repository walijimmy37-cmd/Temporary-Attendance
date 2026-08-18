import { CheckInRequest, CheckInResponse, CheckInData } from '../types';
import { normalizeName } from '../utils/nameFormatter';

const STORAGE_KEY_RECENT_CHECKINS = 'attendance_recent_submissions';
const STORAGE_KEY_API_URL = 'attendance_custom_api_url';
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Retrieves the effective Google Apps Script Web App API URL.
 */
export function getApiUrl(): string {
  const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }
  const envUrl = (import.meta as any).env?.VITE_ATTENDANCE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }
  return '';
}

/**
 * Saves a custom API URL override (for admin testing/configuration).
 */
export function saveCustomApiUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  }
}

/**
 * Checks client-side recent submissions for duplicate check-ins within 2 minutes.
 */
export function checkClientDuplicate(normalizedName: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT_CHECKINS);
    if (!raw) return false;
    
    const entries: Array<{ name: string; timestamp: number; date: string }> = JSON.parse(raw);
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Filter out entries older than 24 hours to keep storage small
    const freshEntries = entries.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    localStorage.setItem(STORAGE_KEY_RECENT_CHECKINS, JSON.stringify(freshEntries));

    const duplicate = freshEntries.find(
      e => e.name.toLowerCase() === normalizedName.toLowerCase() &&
           e.date === today &&
           now - e.timestamp <= DUPLICATE_WINDOW_MS
    );

    return !!duplicate;
  } catch (err) {
    return false;
  }
}

/**
 * Records a successful submission in client cache for fast duplicate guarding.
 */
export function recordClientSubmission(normalizedName: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT_CHECKINS);
    const entries: Array<{ name: string; timestamp: number; date: string }> = raw ? JSON.parse(raw) : [];
    
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    entries.push({
      name: normalizedName,
      timestamp: now,
      date: today
    });

    localStorage.setItem(STORAGE_KEY_RECENT_CHECKINS, JSON.stringify(entries.slice(-50)));
  } catch (e) {
    // Ignore storage issues
  }
}

/**
 * Formats a Date object to YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(date: Date): { timestamp: string; dateStr: string; timeStr: string; dateCompact: string } {
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return {
    timestamp: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hours}:${minutes}`,
    dateCompact: `${year}${month}${day}`
  };
}

/**
 * Submits attendance check-in to Google Apps Script or simulated local mode.
 */
export async function submitCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
  const normalizedName = normalizeName(request.name);
  if (!normalizedName) {
    return {
      success: false,
      message: 'Please enter your name to record your attendance.'
    };
  }

  // 1. Client-side rapid duplicate check
  if (checkClientDuplicate(normalizedName)) {
    return {
      success: false,
      isDuplicate: true,
      message: 'You have already checked in recently. Please check again later if needed.'
    };
  }

  const apiUrl = getApiUrl();
  const now = new Date();
  const { timestamp, dateStr, timeStr, dateCompact } = formatDateTime(now);
  const payload = {
    name: normalizedName,
    checkInType: request.checkInType || 'Check-In',
    source: request.source || 'Reception QR',
    clientTimestamp: now.toISOString()
  };

  // 2. If no Google Apps Script endpoint is configured yet, use local mock simulation
  if (!apiUrl) {
    // Add artificial network latency for realistic feel
    await new Promise(resolve => setTimeout(resolve, 600));

    const randomSequence = Math.floor(1000 + Math.random() * 9000);
    const simulatedId = `ATT-${dateCompact}-${randomSequence}`;

    recordClientSubmission(normalizedName);

    const mockData: CheckInData = {
      id: simulatedId,
      name: normalizedName,
      timestamp,
      date: dateStr,
      time: timeStr,
      checkInType: payload.checkInType,
      source: payload.source
    };

    return {
      success: true,
      message: 'Check-in recorded successfully. Thank you!',
      data: mockData
    };
  }

  // 3. Send request to Google Apps Script Web App
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

    // Google Apps Script accepts text/plain to avoid CORS preflight options issues
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.type !== 'opaque') {
      return {
        success: false,
        message: 'Something went wrong while recording your attendance. Please try again.'
      };
    }

    const text = await response.text();
    let jsonResult: CheckInResponse;
    try {
      jsonResult = JSON.parse(text);
    } catch (parseError) {
      // If Apps Script executed but returned non-JSON redirect response
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      recordClientSubmission(normalizedName);
      return {
        success: true,
        message: 'Check-in recorded successfully. Thank you!',
        data: {
          id: `ATT-${dateCompact}-${randomSeq}`,
          name: normalizedName,
          timestamp,
          date: dateStr,
          time: timeStr,
          checkInType: payload.checkInType,
          source: payload.source
        }
      };
    }

    if (jsonResult.success) {
      recordClientSubmission(normalizedName);
      if (!jsonResult.data) {
        jsonResult.data = {
          id: `ATT-${dateCompact}-${Math.floor(1000 + Math.random() * 9000)}`,
          name: normalizedName,
          timestamp,
          date: dateStr,
          time: timeStr,
          checkInType: payload.checkInType,
          source: payload.source
        };
      }
    }

    return jsonResult;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please verify your internet connection and try again.'
      };
    }
    return {
      success: false,
      message: 'Something went wrong while recording your attendance. Please check your network and try again.'
    };
  }
}
