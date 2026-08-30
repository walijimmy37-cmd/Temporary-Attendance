import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Copy, Check, Calendar, Clock, Tag, CalendarX2, FileText, Timer } from 'lucide-react';
import { CheckInData } from '../types';

interface SuccessViewProps {
  data: CheckInData;
  onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ data, onReset }) => {
  const [copied, setCopied] = useState(false);
  const isShortLeave = data.status === 'Short Leave';
  const isAbsence = data.status === 'Absent' || (Boolean(data.reason) && !isShortLeave);

  const handleCopyId = () => {
    if (data.id) {
      navigator.clipboard.writeText(data.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="success-view-container" className="w-full max-w-md mx-auto animate-fadeIn">
      <div
        id="success-card"
        className={`bg-white rounded-2xl shadow-xl shadow-slate-200/70 border overflow-hidden text-center transition-all ${
          isShortLeave
            ? 'border-sky-200'
            : isAbsence
            ? 'border-amber-200'
            : 'border-slate-100'
        }`}
      >
        {/* Success Header */}
        <div className="p-6 sm:p-8">
          {isShortLeave ? (
            <>
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-sky-50">
                <Timer className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
                Short leave recorded successfully
              </span>
              <h1 id="success-title" className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                {data.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Short leave status has been logged in the system.
              </p>
            </>
          ) : isAbsence ? (
            <>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50">
                <CalendarX2 className="w-8 h-8 stroke-[2.2]" />
              </div>
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                Absence recorded successfully
              </span>
              <h1 id="success-title" className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                {data.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Absence status has been logged in the system.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-100/90 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
                Check-in recorded successfully
              </span>
              <h1 id="success-title" className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Thank you, {data.name}.
              </h1>
            </>
          )}

          {/* Details Section */}
          <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 text-left text-xs">
            {/* Status / Type */}
            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Status
              </span>
              {isShortLeave ? (
                <span className="font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  Short Leave
                </span>
              ) : isAbsence ? (
                <span className="font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                  Absent
                </span>
              ) : (
                <span className="font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {data.checkInType || 'Present / Check-In'}
                </span>
              )}
            </div>

            {/* Reason if Short Leave or Absence */}
            {data.reason && (
              <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Reason
                </span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                  {data.reason}
                </span>
              </div>
            )}

            {/* Notes if provided */}
            {isAbsence && data.notes && (
              <div className="flex items-start justify-between text-slate-600 pb-2 border-b border-slate-200/60 gap-2">
                <span className="flex items-center gap-1.5 font-medium shrink-0">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Notes
                </span>
                <span className="font-normal text-slate-700 text-right text-[11px] leading-relaxed break-words">
                  {data.notes}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </span>
              <span className="font-semibold text-slate-800">{data.date}</span>
            </div>

            {/* Time */}
            <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time
              </span>
              <span className="font-semibold text-slate-800">{data.time}</span>
            </div>

            {/* Entry ID */}
            {data.id && (
              <div className="flex items-center justify-between text-slate-600 pt-0.5">
                <span className="font-medium">Entry ID</span>
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
            )}
          </div>

          {/* Reset / Return Button */}
          <div className="mt-6">
            <button
              id="success-done-btn"
              type="button"
              onClick={onReset}
              className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {isShortLeave
                  ? 'Record another attendance or leave'
                  : isAbsence
                  ? 'Record another attendance or absence'
                  : 'Check in another person'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
