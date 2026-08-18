import React, { useState, useEffect } from 'react';
import { QrCode, Settings, Shield, Building2, Users, Copy, Check } from 'lucide-react';
import { CheckInCard } from './components/CheckInCard';
import { SuccessView } from './components/SuccessView';
import { AdminModal } from './components/AdminModal';
import { submitCheckIn, getApiUrl } from './services/attendanceApi';
import { CheckInData } from './types';

export default function App() {
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('attendance_company_name') || 'NEXUS CORP';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CheckInData | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Keep live time updated for sleek reception header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentTime(now.toLocaleDateString(undefined, options));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setApiUrl(getApiUrl());
  }, [isAdminOpen]);

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : '';

  const handleCopyQrUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleUpdateCompanyName = (name: string) => {
    const clean = name.trim() || 'NEXUS CORP';
    setCompanyName(clean);
    localStorage.setItem('attendance_company_name', clean);
  };

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
        setErrorMessage(response.message || 'Something went wrong while recording your attendance. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage('Something went wrong while recording your attendance. Please try again.');
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
      {/* Sleek Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
              {companyName}
            </span>
            <span className="text-xs font-medium text-slate-500 block">
              Attendance System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-slate-500">
          <div className="hidden md:flex items-center gap-2 text-slate-600">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Reception Desk</span>
          </div>
          <span className="hidden md:inline-block h-4 w-px bg-slate-200"></span>
          <span className="hidden sm:inline-block text-slate-600">{currentTime}</span>
          
          <button
            id="open-admin-btn"
            type="button"
            onClick={() => setIsAdminOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/80 transition-all active:scale-[0.98]"
            title="Desk QR Sign & Google Sheet Setup"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>QR Sign & Setup</span>
          </button>
        </div>
      </nav>

      {/* Main Check-In Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
        <div className="w-full max-w-md">
          {successData ? (
            <SuccessView data={successData} onReset={handleReset} />
          ) : (
            <CheckInCard
              companyName={companyName}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              onSubmit={handleCheckInSubmit}
              onClearError={() => setErrorMessage(null)}
              isApiConfigured={Boolean(apiUrl)}
              onOpenAdmin={() => setIsAdminOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Sleek Dark Administrator Footer */}
      <footer className="bg-slate-900 text-slate-400 p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 border-t border-slate-800">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
            Reception Desk QR Link
          </span>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
            <code className="bg-slate-800 text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-mono select-all max-w-[240px] sm:max-w-xs truncate border border-slate-700/50">
              {currentAppUrl}
            </code>
            <button
              id="footer-copy-qr-url-btn"
              type="button"
              onClick={handleCopyQrUrl}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors uppercase flex items-center gap-1.5 border border-slate-700"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        <div className="text-center sm:text-right">
          <p className="text-xs text-slate-400 font-medium">
            Powered by Google Sheets & Apps Script
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-3 text-[11px] text-slate-500 mt-1">
            <button
              type="button"
              onClick={() => setIsAdminOpen(true)}
              className="hover:text-indigo-400 transition-colors underline cursor-pointer"
            >
              System Settings & QR Sign
            </button>
            <span>•</span>
            <span className="text-slate-500">Live Sync</span>
          </div>
        </div>
      </footer>

      {/* Admin / QR Code Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          setApiUrl(getApiUrl());
        }}
        companyName={companyName}
        onUpdateCompanyName={handleUpdateCompanyName}
      />
    </div>
  );
}
