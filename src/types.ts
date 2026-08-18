export interface CheckInRequest {
  name: string;
  checkInType?: string;
  source?: string;
}

export interface CheckInData {
  id: string;
  name: string;
  timestamp: string;
  date: string;
  time: string;
  checkInType: string;
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
}
