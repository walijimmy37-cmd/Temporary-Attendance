import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Copy, Check, Calendar, Clock, Tag, ShieldCheck } from 'lucide-react';
import { CheckInData } from '../types';

interface SuccessViewProps {
  data: CheckInData;
  onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ data, onReset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (data.id) {
      navigator.clipboard.writeText(data.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="success-view-container" className="w-full max-w-md mx-auto">
      <div id="success-card" className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden text-center">
        {/* Success Header */}
        <div className="p-6 sm:p-8">
          <div className="w-20 h-20 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Check-In Confirmed
          </span>

          <h1 id="success-title" className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Check-In Recorded
          </h1>

          <p id="success-thank-you" className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto">
            Thank you, <span className="font-bold text-indigo-600">{data.name}</span>. Your attendance has been recorded successfully at <span className="font-semibold text-slate-800">{data.time}</span>.
          </p>

          {/* Details Section */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 text-left text-xs">
            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </span>
              <span className="font-semibold text-slate-800">{data.date}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time
              </span>
              <span className="font-semibold text-slate-800">{data.time}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Type
              </span>
              <span className="font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                {data.checkInType || 'Check-In'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-0.5">
              <span className="font-medium">Unique Entry ID</span>
              <div className="flex items-center gap-1.5">
                <code className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {data.id}
                </code>
                <button
                  id="copy-entry-id-btn"
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Copy Entry ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Reset / Check In Another Person Button */}
          <div className="mt-6 space-y-3">
            <button
              id="check-in-another-btn"
              type="button"
              onClick={onReset}
              className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Check in another person</span>
            </button>

            <p className="text-center text-xs text-slate-400">
              You may now close this browser tab or scan again on your next visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
