import React, { useState, useRef, useEffect } from 'react';
import { User, AlertCircle, Clock, ArrowRight, X, Loader2, FileText, CalendarX2 } from 'lucide-react';
import { validateName } from '../utils/nameFormatter';

interface ShortLeaveCardProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (data: { name: string; reason: string }) => Promise<void>;
  onSwitchToCheckIn: () => void;
  onSwitchToAbsence: () => void;
  onClearError: () => void;
}

export const ShortLeaveCard: React.FC<ShortLeaveCardProps> = ({
  isSubmitting,
  errorMessage,
  onSubmit,
  onSwitchToCheckIn,
  onSwitchToAbsence,
  onClearError,
}) => {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const nameValidation = validateName(name);
  const showNameError = nameTouched && !nameValidation.isValid && name.length > 0;
  const isReasonValid = reason.trim().length > 0;
  const showReasonError = reasonTouched && !isReasonValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setReasonTouched(true);

    if (!nameValidation.isValid) {
      return;
    }

    if (!isReasonValid) {
      return;
    }

    onClearError();
    await onSubmit({
      name: nameValidation.normalized,
      reason: reason.trim(),
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errorMessage) onClearError();
  };

  const handleClearName = () => {
    setName('');
    if (errorMessage) onClearError();
    inputRef.current?.focus();
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (errorMessage) onClearError();
  };

  return (
    <div id="short-leave-container" className="w-full max-w-md mx-auto animate-fadeIn">
      {/* Short Leave Card */}
      <div
        id="short-leave-card"
        className="bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-sky-200/80 overflow-hidden transition-all duration-200"
      >
        {/* Top 3 Action Mode Switcher */}
        <div className="p-2 bg-slate-50/90 border-b border-slate-100 grid grid-cols-3 gap-1.5">
          <button
            id="tab-check-in-from-short-leave"
            type="button"
            onClick={onSwitchToCheckIn}
            disabled={isSubmitting}
            className="py-2 px-2 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-white font-bold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>Check In</span>
          </button>
          <button
            id="tab-short-leave-active"
            type="button"
            className="py-2 px-2 rounded-xl bg-white text-sky-700 font-bold text-[11px] sm:text-xs shadow-xs border border-sky-200/80 flex items-center justify-center gap-1 cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-sky-600"></span>
            <span>Short Leave</span>
          </button>
          <button
            id="tab-absence-from-short-leave"
            type="button"
            onClick={onSwitchToAbsence}
            disabled={isSubmitting}
            className="py-2 px-2 rounded-xl text-slate-600 hover:text-amber-800 hover:bg-white font-bold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <CalendarX2 className="w-3 h-3 text-amber-600" />
            <span className="truncate">Absence</span>
          </button>
        </div>

        {/* Card Header */}
        <div className="text-center p-6 sm:p-7 bg-linear-to-b from-sky-50/50 to-white border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-sky-100/80 border border-sky-300/80 text-sky-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2.5">
            <Clock className="w-3.5 h-3.5 text-sky-700" />
            Short Leave Record
          </div>
          <h1 id="short-leave-title" className="text-2xl font-bold text-slate-900 tracking-tight">
            Record Short Leave
          </h1>
          <p id="short-leave-instruction" className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Record a temporary short leave during office hours.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5" noValidate>
          {/* Error Message Box */}
          {errorMessage && (
            <div
              id="short-leave-error-banner"
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1 leading-snug font-medium">
                {errorMessage}
              </div>
              <button
                type="button"
                onClick={onClearError}
                className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Employee Name Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="short-leave-name-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Employee Full Name <span className="text-rose-500">*</span>
              </label>
              {name.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {name.length}/100
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                id="short-leave-name-input"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setNameTouched(true)}
                placeholder="Enter name"
                maxLength={100}
                autoComplete="name"
                autoCapitalize="words"
                disabled={isSubmitting}
                className={`w-full pl-10 pr-10 py-3.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-slate-800 text-base font-medium placeholder:text-slate-400 ${
                  showNameError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {name.length > 0 && !isSubmitting && (
                <button
                  id="clear-short-leave-name-btn"
                  type="button"
                  onClick={handleClearName}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear employee name"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showNameError && (
              <p
                id="short-leave-name-validation-error"
                className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {nameValidation.error}
              </p>
            )}
          </div>

          {/* Reason Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="short-leave-reason-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Reason <span className="text-rose-500">*</span>
              </label>
              {reason.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {reason.length}/200
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-5 h-5" />
              </div>
              <input
                id="short-leave-reason-input"
                type="text"
                value={reason}
                onChange={handleReasonChange}
                onBlur={() => setReasonTouched(true)}
                placeholder="Enter reason (e.g. Doctor appointment, Personal errand)"
                maxLength={200}
                disabled={isSubmitting}
                className={`w-full pl-10 pr-3.5 py-3.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400 ${
                  showReasonError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            {showReasonError && (
              <p
                id="short-leave-reason-validation-error"
                className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Please enter a reason for the short leave.
              </p>
            )}
          </div>

          {/* Action Buttons: [ RECORD SHORT LEAVE ] and [ Cancel ] */}
          <div className="space-y-2.5 pt-2">
            <button
              id="short-leave-submit-btn"
              type="submit"
              disabled={isSubmitting || (nameTouched && !nameValidation.isValid) || (reasonTouched && !isReasonValid)}
              className="w-full py-4 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-base shadow-lg shadow-sky-100 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Recording Short Leave...</span>
                </>
              ) : (
                <>
                  <span>Record Short Leave</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              id="short-leave-cancel-btn"
              type="button"
              onClick={onSwitchToCheckIn}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
