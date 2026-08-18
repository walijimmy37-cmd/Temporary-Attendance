/**
 * Coventra Attendance System Configuration
 *
 * The QR code points to this production frontend URL (Vercel deployment),
 * which loads the public check-in interface.
 * 
 * Update this constant with your final Vercel deployment URL when provided.
 */
export const PRODUCTION_FRONTEND_URL =
  (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
  'https://coventra-attendance.vercel.app';

export const APP_NAME = 'Coventra Attendance';
export const COMPANY_NAME = 'Coventra';
