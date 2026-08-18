import { CheckInRequest, CheckInResponse, CheckInData } from '../types';
import { normalizeName } from '../utils/nameFormatter';

const STORAGE_KEY_RECENT_CHECKINS = 'attendance_recent_submissions';
const STORAGE_KEY_API_URL = 'attendance_custom_api_url';
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Known working Google Apps Script Web App production endpoint.
 */
export const DEFAULT_PRODUCTION_API_URL =
  'https://script.google.com/macros/s/AKfycbyfAbSLsXuhNbNMN-S5k8_nT4dT61xr8gYhiz2B1jq9GFkF6kF7NxDoT7Yd5qwLS8xXdg/exec';

/**
 * Validates whether an attendance API URL matches the Google Apps Script Web App structure.
 * Must begin with https://, contain script.google.com, and end with /exec.
 */
export function isValidGoogleAppsScriptUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://') &&
    trimmed.includes('script.google.com') &&
    trimmed.endsWith('/exec')
  );
}

/**
 * Retrieves the effective Google Apps Script Web App API URL.
 * Order of precedence:
 * 1. Manually configured API URL in localStorage (if valid)
 * 2. VITE_ATTENDANCE_API_URL from environment (if valid)
 * 3. Default known working production endpoint
 */
export function getApiUrl(): string {
  // 1. Manually configured custom URL in localStorage
  try {
    const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
    if (customUrl && typeof customUrl === 'string') {
      const trimmed = customUrl.trim();
      if (isValidGoogleAppsScriptUrl(trimmed)) {
        return trimmed;
      } else {
        // Obsolete, broken or non-conforming URL - remove so it doesn't cause silent failure
        localStorage.removeItem(STORAGE_KEY_API_URL);
      }
    }
  } catch (e) {
    // Ignore localStorage access issues (e.g. private mode restrictions)
  }

  // 2. VITE_ATTENDANCE_API_URL environment variable
  const envUrl = (import.meta as any).env?.VITE_ATTENDANCE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    const trimmedEnv = envUrl.trim();
    if (isValidGoogleAppsScriptUrl(trimmedEnv)) {
      return trimmedEnv;
    }
  }

  // 3. Known working default production endpoint
  return DEFAULT_PRODUCTION_API_URL;
}

/**
 * Saves a custom API URL override (for admin testing/configuration).
 */
export function saveCustomApiUrl(url: string): void {
  if (url && url.trim()) {
    const trimmed = url.trim();
    if (isValidGoogleAppsScriptUrl(trimmed)) {
      localStorage.setItem(STORAGE_KEY_API_URL, trimmed);
    } else {
      // If user typed something invalid or non-empty that doesn't match format, don't keep corrupt value
      localStorage.removeItem(STORAGE_KEY_API_URL);
    }
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
 * Helper to decode HTML entities in Google Apps Script error responses.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Extracts human-readable error descriptions from Google Apps Script HTML error pages.
 */
function extractGoogleScriptHtmlError(html: string): string | null {
  if (!html || typeof html !== 'string') return null;
  if (!html.includes('Google Apps Script') && !html.includes('errorMessage') && !html.includes('<title>Error</title>')) {
    return null;
  }

  const monospaceMatch = html.match(/style="[^"]*font-family:\s*monospace[^"]*"[^>]*>([^<]+)<\/div>/i);
  if (monospaceMatch && monospaceMatch[1]) {
    return decodeHtmlEntities(monospaceMatch[1].trim());
  }

  const classMatch = html.match(/class=["']errorMessage["'][^>]*>([^<]+)<\/div>/i);
  if (classMatch && classMatch[1]) {
    return decodeHtmlEntities(classMatch[1].trim());
  }

  return 'Google Apps Script runtime error (HTML response returned).';
}

/**
 * Tests connection to the Google Apps Script Web App endpoint using GET.
 */
export async function testApiEndpoint(urlToTest?: string): Promise<{ success: boolean; message: string; details?: any }> {
  const targetUrl = urlToTest?.trim() || getApiUrl();

  if (!targetUrl) {
    return {
      success: false,
      message: 'No API URL provided or configured.'
    };
  }

  if (!isValidGoogleAppsScriptUrl(targetUrl)) {
    return {
      success: false,
      message: 'Invalid API URL format. URL must begin with https://, contain script.google.com, and end with /exec.'
    };
  }

  console.log('[Attendance API Test] Testing endpoint (GET):', targetUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[Attendance API Test] HTTP response status:', response.status);

    const text = await response.text();
    console.log('[Attendance API Test] Response body:', text);

    const htmlError = extractGoogleScriptHtmlError(text);
    if (htmlError) {
      return {
        success: false,
        message: `Google Apps Script returned error: ${htmlError}`
      };
    }

    try {
      const json = JSON.parse(text);
      console.log('[Attendance API Test] Parsed JSON:', json);

      if (json.status === 'ok' || json.service === 'Attendance Check-In API') {
        return {
          success: true,
          message: 'Attendance API connected successfully.',
          details: json
        };
      } else if (json.message) {
        return {
          success: true,
          message: `Attendance API connected: ${json.message}`,
          details: json
        };
      } else {
        return {
          success: true,
          message: 'Attendance API connected successfully.',
          details: json
        };
      }
    } catch (parseErr) {
      return {
        success: false,
        message: `Received unexpected non-JSON response (Status ${response.status}).`
      };
    }
  } catch (err: any) {
    console.error('[Attendance API Test] Connection error:', err);
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Connection timed out. Please check your internet connection.'
      };
    }
    return {
      success: false,
      message: `Failed to connect: ${err.message || 'Network error'}`
    };
  }
}

/**
 * Submits attendance check-in to Google Apps Script using standard form-urlencoded POST.
 */
export async function submitCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
  const normalizedName = normalizeName(request.name);
  if (!normalizedName) {
    return {
      success: false,
      message: 'Please enter your name to record your attendance.'
    };
  }

  // 1. Client-side rapid duplicate check (within 2 minutes)
  if (checkClientDuplicate(normalizedName)) {
    return {
      success: false,
      isDuplicate: true,
      message: 'You have already checked in recently. Please check again later if needed.'
    };
  }

  const apiUrl = getApiUrl();
  console.log('[Attendance API] Resolved API URL:', apiUrl);

  // 2. Build form-urlencoded payload via URLSearchParams
  const body = new URLSearchParams();
  body.append('name', normalizedName);
  body.append('checkInType', request.checkInType || 'Check-In');
  body.append('source', request.source || 'Reception QR');

  console.log('[Attendance API] Sending form-urlencoded POST request:', body.toString());

  // 3. Send standard POST request without no-cors mode, waiting for backend response
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[Attendance API] HTTP response status:', response.status);

    const responseText = await response.text();
    console.log('[Attendance API] Response body:', responseText);

    // Check if Google Apps Script returned an HTML error
    const htmlError = extractGoogleScriptHtmlError(responseText);
    if (htmlError) {
      console.error('[Attendance API] Google Apps Script HTML error:', htmlError);
      return {
        success: false,
        message: `Google Sheets Script error: ${htmlError}`
      };
    }

    let jsonResult: any;
    try {
      jsonResult = JSON.parse(responseText);
      console.log('[Attendance API] Parsed JSON:', jsonResult);
    } catch (parseError) {
      console.error('[Attendance API] Invalid JSON received from backend:', responseText);
      return {
        success: false,
        message: "We couldn't confirm your check-in. Please try again."
      };
    }

    // Check backend confirmation
    if (jsonResult && jsonResult.success === true) {
      recordClientSubmission(normalizedName);
      return {
        success: true,
        message: jsonResult.message || 'Check-in recorded successfully. Thank you!',
        data: jsonResult.data
      };
    } else if (jsonResult && jsonResult.success === false) {
      return {
        success: false,
        isDuplicate: Boolean(jsonResult.isDuplicate),
        message: jsonResult.message || "We couldn't confirm your check-in. Please try again."
      };
    } else {
      return {
        success: false,
        message: "We couldn't confirm your check-in. Please try again."
      };
    }
  } catch (err: any) {
    console.error('[Attendance API] Submission error:', err);
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please check your network and try again.'
      };
    }
    return {
      success: false,
      message: "We couldn't confirm your check-in. Please try again."
    };
  }
}

/**
 * Diagnostic test check-in that sends real POST to Google Apps Script for 'FRONTEND TEST USER'.
 */
export async function sendDiagnosticTestCheckIn(): Promise<CheckInResponse> {
  const apiUrl = getApiUrl();
  console.log('[Attendance API Diagnostic] Sending real test check-in to:', apiUrl);

  const body = new URLSearchParams();
  body.append('name', 'FRONTEND TEST USER');
  body.append('checkInType', 'Check-In');
  body.append('source', 'Frontend Test');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[Attendance API Diagnostic] Response:', responseText);

    const htmlError = extractGoogleScriptHtmlError(responseText);
    if (htmlError) {
      return {
        success: false,
        message: `Google Sheets Script error: ${htmlError}`
      };
    }

    try {
      const jsonResult = JSON.parse(responseText);
      if (jsonResult && jsonResult.success === true) {
        return {
          success: true,
          message: 'Frontend test check-in recorded in Google Sheet successfully!',
          data: jsonResult.data
        };
      } else {
        return {
          success: false,
          isDuplicate: Boolean(jsonResult?.isDuplicate),
          message: jsonResult?.message || "Test submission failed."
        };
      }
    } catch {
      return {
        success: false,
        message: `Backend returned non-JSON response: ${responseText.slice(0, 100)}`
      };
    }
  } catch (err: any) {
    console.error('[Attendance API Diagnostic] Test error:', err);
    return {
      success: false,
      message: `Failed to send diagnostic test: ${err.message || 'Network error'}`
    };
  }
}
