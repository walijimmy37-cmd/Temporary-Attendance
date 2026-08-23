import React, { useState, useRef, useEffect } from 'react';
import { User, AlertCircle, FileText, CalendarX2, ArrowRight, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { validateName } from '../utils/nameFormatter';
import { AbsenceReason } from '../types';

interface AbsenceCardProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (data: { name: string; reason: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
  onClearError: () => void;
}

const PREDEFINED_REASONS: AbsenceReason[] = [
  'Sick Leave',
  'Personal Leave',
  'Emergency',
  'Approved Leave',
  'Work From Home',
  'Late / Unable to Attend',
  'Other',
];

export const AbsenceCard: React.FC<AbsenceCardProps> = ({
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
  onClearError,
}) => {
  const [name, setName] = useState('');
  const [selectedReason, setSelectedReason] = useState<AbsenceReason | ''>('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [inputTouched, setInputTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);
  const [customReasonTouched, setCustomReasonTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const nameValidation = validateName(name);
  const showNameError = inputTouched && !nameValidation.isValid && name.length > 0;
  const isReasonValid = selectedReason !== '';
  const isCustomReasonValid = selectedReason !== 'Other' || customReason.trim().length > 0;
  const showReasonError = reasonTouched && !isReasonValid;
  const showCustomReasonError = customReasonTouched && selectedReason === 'Other' && customReason.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputTouched(true);
    setReasonTouched(true);
    if (selectedReason === 'Other') {
      setCustomReasonTouched(true);
    }

    if (!nameValidation.isValid) {
      return;
    }

    if (!isReasonValid) {
      return;
    }

    if (selectedReason === 'Other' && !isCustomReasonValid) {
      return;
    }

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;

    onClearError();
    await onSubmit({
      name: nameValidation.normalized,
      reason: finalReason,
      notes: notes.trim() ? notes.trim() : undefined,
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

  return (
    <div id="absence-form-container" className="w-full max-w-md mx-auto animate-fadeIn">
      {/* Absence Card */}
      <div
        id="absence-card"
        className="bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-amber-200/60 overflow-hidden transition-all duration-200"
      >
        {/* Header with clear Absentee visual distinction */}
        <div className="text-center p-6 sm:p-8 bg-linear-to-b from-amber-50/50 to-white border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-100/80 border border-amber-300/80 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <CalendarX2 className="w-3.5 h-3.5 text-amber-700" />
            Absentee Record
          </div>
          <h1 id="absence-title" className="text-2xl font-bold text-slate-900 tracking-tight">
            Record Absence
          </h1>
          <p id="absence-instruction" className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Submit an absentee record for an employee who is not attending today.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5" noValidate>
          {/* Error Message Box */}
          {errorMessage && (
            <div
              id="absence-error-banner"
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
                htmlFor="absentee-name-input"
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
                id="absentee-name-input"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setInputTouched(true)}
                placeholder="e.g. Ahmed Wali"
                maxLength={100}
                autoComplete="name"
                autoCapitalize="words"
                disabled={isSubmitting}
                className={`w-full pl-10 pr-10 py-3.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-slate-800 text-base font-medium placeholder:text-slate-400 ${
                  showNameError
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {name.length > 0 && !isSubmitting && (
                <button
                  id="clear-absentee-name-btn"
                  type="button"
                  onClick={handleClearName}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear name input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showNameError && (
              <p
                id="absentee-name-error"
                className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {nameValidation.error}
              </p>
            )}
          </div>

          {/* Reason Selection Dropdown */}
          <div>
            <label
              htmlFor="absence-reason-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Reason for Absence <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="absence-reason-select"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value as AbsenceReason);
                  setReasonTouched(true);
                  if (errorMessage) onClearError();
                }}
                onBlur={() => setReasonTouched(true)}
                disabled={isSubmitting}
                className={`w-full appearance-none pl-3.5 pr-10 py-3.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-slate-800 text-sm font-medium ${
                  showReasonError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
              >
                <option value="" disabled>
                  Select a reason...
                </option>
                {PREDEFINED_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {showReasonError && (
              <p id="absence-reason-error" className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Please select a reason for the absence.
              </p>
            )}
          </div>

          {/* Custom Reason Field (Shown when 'Other' is selected) */}
          {selectedReason === 'Other' && (
            <div className="animate-fadeIn">
              <label
                htmlFor="custom-reason-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Please Specify Reason <span className="text-rose-500">*</span>
              </label>
              <input
                id="custom-reason-input"
                type="text"
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (errorMessage) onClearError();
                }}
                onBlur={() => setCustomReasonTouched(true)}
                placeholder="e.g. Jury duty, family commitment"
                maxLength={200}
                disabled={isSubmitting}
                className={`w-full px-3.5 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400 ${
                  showCustomReasonError ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {showCustomReasonError && (
                <p id="custom-reason-error" className="text-xs text-rose-600 font-medium pt-1.5 pl-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Please enter the specific reason.
                </p>
              )}
            </div>
          )}

          {/* Optional Notes Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="absence-notes-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Additional Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {notes.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {notes.length}/500
                </span>
              )}
            </div>
            <textarea
              id="absence-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Expected return tomorrow morning, manager notified"
              maxLength={500}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              id="absence-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-base shadow-lg shadow-amber-200/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Recording Absence...</span>
                </>
              ) : (
                <>
                  <span>Record Absence</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              id="absence-cancel-btn"
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel (Back to Check-In)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
