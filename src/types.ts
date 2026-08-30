export type AttendanceStatus = 'Present' | 'Absent' | 'Short Leave';

export type AbsenceReason =
  | 'Sick Leave'
  | 'Personal Leave'
  | 'Emergency'
  | 'Approved Leave'
  | 'Work From Home'
  | 'Late / Unable to Attend'
  | 'Other';

export interface CheckInRequest {
  name: string;
  checkInType?: string;
  source?: string;
}

export interface ShortLeaveRequest {
  name: string;
  status: 'Short Leave';
  reason: string;
  source?: string;
}

export interface AbsenceRequest {
  name: string;
  status: 'Absent';
  reason: string;
  notes?: string;
  source?: string;
}

export interface CheckInData {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  time: string;
  status?: AttendanceStatus | string;
  checkInType?: string;
  reason?: string;
  notes?: string;
  source: string;
  isDuplicate?: boolean;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  data?: CheckInData;
  isDuplicate?: boolean;
}

export interface RecentCheckIn {
  id: string;
  name: string;
  timestamp: number;
  formattedTime: string;
  date: string;
  source: string;
  status?: string;
  reason?: string;
}
