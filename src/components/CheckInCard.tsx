import React, { useState, useRef, useEffect } from 'react';
import { User, Loader2, AlertCircle, ArrowRight, X, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { validateName } from '../utils/nameFormatter';

interface CheckInCardProps {
  companyName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (name: string, checkInType: string) => Promise<void>;
  onClearError: () => void;
  isApiConfigured: boolean;
  onOpenAdmin: () => void;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  companyName,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClearError,
  isApiConfigured,
  onOpenAdmin,
}) => {
  const [name, setName] = useState('');
  const [checkInType, setCheckInType] = useState('Check-In');
  const [inputTouched, setInputTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount for quick scanning experience
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const validation = validateName(name);
  const showError = inputTouched && !validation.isValid && name.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputTouched(true);

    if (!validation.isValid) {
      return;
    }

    onClearError();
    await onSubmit(validation.normalized, checkInType);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errorMessage) onClearError();
  };

  const handleClear = () => {
    setName('');
    if (errorMessage) onClearError();
    inputRef.current?.focus();
  };

  return (
    <div id="check-in-container" className="w-full max-w-md mx-auto">
      {/* Configuration notice if running in demo mode */}
      {!isApiConfigured && (
        <div id="demo-mode-banner" className="mb-4 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5 shadow-xs">
          <div className="p-1 bg-indigo-100/80 rounded-lg text-indigo-700 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold block text-indigo-950">Demo Simulation Mode</span>
            Submissions are saved locally. Connect your Google Apps Script URL in{' '}
            <button
              id="open-admin-from-banner"
              type="button"
              onClick={onOpenAdmin}
              className="font-semibold underline hover:text-indigo-950 transition-colors cursor-pointer"
            >
              Setup & Settings
            </button>
            .
          </div>
        </div>
      )}

      {/* Main Check-In Card */}
      <div id="check-in-card" className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden transition-all duration-200">
        {/* Card Header */}
        <div className="text-center p-6 sm:p-8 border-b border-slate-100">
          <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100/80 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            {companyName}
          </div>
          <h1 id="attendance-title" className="text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Check-In
          </h1>
          <p id="attendance-instruction" className="text-slate-500 text-sm mt-1">
            Please enter your name to record your attendance.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5" noValidate>
          {/* Error Message Box */}
          {errorMessage && (
            <div
              id="error-message-banner"
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

          {/* Type of Check-In Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Check-In Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              {(['Check-In', 'Visitor'] as const).map((type) => (
                <button
                  key={type}
                  id={`type-btn-${type.toLowerCase()}`}
                  type="button"
                  onClick={() => setCheckInType(type)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    checkInType === type
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'Check-In' ? 'Employee / Staff' : 'Visitor / Guest'}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="attendee-name-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Full Name <span className="text-rose-500">*</span>
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
                id="attendee-name-input"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setInputTouched(true)}
                placeholder="e.g. Ahmed Wali"
                maxLength={100}
                autoComplete="name"
                autoCapitalize="words"
                disabled={isSubmitting}
                className={`w-full pl-10 pr-10 py-3.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-800 font-medium placeholder:text-slate-400 ${
                  showError
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {name.length > 0 && !isSubmitting && (
                <button
                  id="clear-name-btn"
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear name input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showError && (
              <p id="name-validation-error" className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {validation.error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            id="check-in-submit-btn"
            type="submit"
            disabled={isSubmitting || (inputTouched && !validation.isValid)}
            className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base shadow-lg shadow-indigo-100 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Recording Check-In...</span>
              </>
            ) : (
              <>
                <span>Check In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Live System Status Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
              {isSubmitting ? 'Recording Check-In...' : 'System Ready: Enter Name'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">No login required</span>
        </div>
      </div>
    </div>
  );
};
