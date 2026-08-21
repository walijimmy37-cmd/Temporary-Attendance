import React, { useState } from 'react';
import { Building2, Users } from 'lucide-react';
import { PaperModeAnnouncement } from './components/PaperModeAnnouncement';
import { CheckInCard } from './components/CheckInCard';
import { SuccessView } from './components/SuccessView';
import { DeskSign } from './components/DeskSign';
import { submitCheckIn } from './services/attendanceApi';
import { CheckInData } from './types';
import { APP_NAME, COMPANY_NAME } from './config';

/**
 * Temporary Frontend Announcement Mode
 * Set to false when management un-cancels the future to restore regular digital check-in.
 */
const IS_PAPER_MODE_ACTIVE = true;

export default function App() {
  // Preserved check-in state management for easy restoration
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CheckInData | null>(null);
  const [isDeskSignOpen, setIsDeskSignOpen] = useState(false);

  const handleCheckInSubmit = async (name: string, checkInType: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitCheckIn({
        name,
        checkInType,
        source: 'Reception QR',
      });

      if (response.success && response.data) {
        setSuccessData(response.data);
      } else {
        setErrorMessage(
          response.message || "We couldn't confirm your check-in. Please try again."
        );
      }
    } catch (err: any) {
      setErrorMessage("We couldn't confirm your check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between selection:bg-slate-900 selection:text-white font-sans antialiased">
      {/* Header: Coventra Attendance */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block">
              {COMPANY_NAME}
            </span>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-none mt-0.5">
              {APP_NAME}
            </span>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-600 font-mono">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="hidden sm:inline">STATUS:</span>
          <span>PAPER MODE</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        {IS_PAPER_MODE_ACTIVE ? (
          <PaperModeAnnouncement />
        ) : (
          <div className="w-full max-w-md">
            {successData ? (
              <SuccessView data={successData} onReset={handleReset} />
            ) : (
              <CheckInCard
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
                onSubmit={handleCheckInSubmit}
                onClearError={() => setErrorMessage(null)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer: Coventra Attendance */}
      <footer className="py-4 text-center text-xs text-slate-400 shrink-0">
        <p className="font-medium tracking-wide">
          {COMPANY_NAME} &bull; {APP_NAME}
        </p>
      </footer>

      {/* Reception Desk Sign Modal (Preserved for digital restoration) */}
      {!IS_PAPER_MODE_ACTIVE && (
        <DeskSign
          isOpen={isDeskSignOpen}
          onClose={() => setIsDeskSignOpen(false)}
        />
      )}
    </div>
  );
}

