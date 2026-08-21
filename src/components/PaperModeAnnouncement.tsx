import React from 'react';
import { Building2, FileText, AlertCircle } from 'lucide-react';
import { COMPANY_NAME, APP_NAME } from '../config';

export const PaperModeAnnouncement: React.FC = () => {
  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Premium Corporate Announcement Card */}
      <div
        id="paper-mode-announcement"
        className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden transition-all duration-300"
      >
        {/* Top Status Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-[11px] font-mono font-semibold tracking-widest uppercase text-slate-300">
              SYSTEM STATUS: PAPER MODE ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400/90 text-xs font-mono">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-[10px] tracking-wider uppercase">ANNOUNCEMENT</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-10 text-center">
          {/* Coventra Global Brand Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 mb-3.5">
              <Building2 className="w-6 h-6 text-slate-100" />
            </div>
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
              {COMPANY_NAME}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              {APP_NAME}
            </h1>
          </div>

          {/* Primary Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                OFFICIAL NOTICE
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="my-6 sm:my-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase font-mono leading-tight">
              The future has been cancelled.
            </h2>
          </div>

          {/* Secondary Divider */}
          <div className="w-16 h-0.5 bg-slate-900 mx-auto my-6 opacity-80" />

          {/* Core Announcement Body Copy */}
          <div className="space-y-4 text-slate-700 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
            <p className="font-medium text-slate-900">
              Management has decided that your attendance is better recorded using paper, ink, and human suffering.
            </p>
            <p className="text-slate-600">
              Please proceed to reception and sign the attendance sheet.
            </p>
            <p className="text-slate-500 text-sm italic pt-1">
              We apologize for the inconvenience caused.
            </p>
          </div>

          {/* Tertiary Notice Container */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 inline-block text-left sm:text-center w-full">
              <div className="flex items-start sm:items-center justify-center gap-2.5 text-slate-600 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                <p className="font-medium">
                  Please do not scan the QR code. It has been emotionally retired.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Card Footer */}
        <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[11px] font-medium text-slate-400 tracking-wide">
            Coventra Global Operations &bull; Reception Services
          </p>
        </div>
      </div>
    </div>
  );
};
