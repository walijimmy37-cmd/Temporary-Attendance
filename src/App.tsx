import React, { useState } from 'react';
import { Users, QrCode } from 'lucide-react';
import { CheckInCard } from './components/CheckInCard';
import { SuccessView } from './components/SuccessView';
import { DeskSign } from './components/DeskSign';
import { submitCheckIn } from './services/attendanceApi';
import { CheckInData } from './types';
import { APP_NAME, PRODUCTION_FRONTEND_URL } from './config';

export default function App() {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Header: Coventra Attendance */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
              {APP_NAME}
            </span>
          </div>
        </div>

        {/* Discreet Reception Desk Sign button */}
        <button
          id="open-desk-sign-btn"
          type="button"
          onClick={() => setIsDeskSignOpen(true)}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Reception Desk Sign (Print QR)"
          aria-label="Reception Desk Sign"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </header>

      {/* Main Check-In Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
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
      </main>

      {/* Footer: Unobtrusive single line */}
      <footer className="py-4 text-center text-xs text-slate-400 shrink-0">
        <p>{APP_NAME}</p>
      </footer>

      {/* Reception Desk Sign Modal */}
      <DeskSign
        isOpen={isDeskSignOpen}
        onClose={() => setIsDeskSignOpen(false)}
      />
    </div>
  );
}
