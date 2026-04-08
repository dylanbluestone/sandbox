'use client';

/**
 * AgeGate component — three-dropdown date entry for age verification.
 *
 * Design decision: three separate dropdowns (Month / Day / Year) instead of
 * an HTML5 <input type="date"> because:
 *  - Native date pickers have wildly inconsistent browser UI and cannot be
 *    styled reliably with Tailwind.
 *  - Dropdowns allow the Day list to be dynamically constrained to valid
 *    values for the chosen month/year, eliminating impossible dates before
 *    the user even submits.
 *  - Individual labelled selects are easier to make accessible and easier to
 *    test than a single opaque date input.
 */

import { useState } from 'react';

import { isOfAge } from '@/lib/utils/ageUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgeGateProps {
  /** Minimum age the user must meet to pass verification. */
  minAge: number;
  /** Called when the submitted date satisfies the minimum age requirement. */
  onAgeVerified: () => void;
  /** Called when the submitted date does not satisfy the minimum age requirement. */
  onAgeDenied?: () => void;
  /** When true, the entire form is non-interactive. */
  disabled?: boolean;
  /**
   * Overrides the under-age error message.
   * Defaults to "You must be at least {minAge} years old."
   */
  errorMessage?: string;
  /** Label for the submit button. Defaults to "Verify Age". */
  submitButtonText?: string;
}

interface DateFields {
  month: string; // '' | '1'–'12'
  day: string; // '' | '1'–'31'
  year: string; // '' | '1900'–current year
}

type FormError = string | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const CURRENT_YEAR = new Date().getFullYear();

/** Returns the number of days in a given month/year pair. */
function daysInMonth(month: number, year: number): number {
  // Day 0 of the next month = last day of this month
  return new Date(year, month, 0).getDate();
}

/**
 * Builds a Date from the three string fields and validates that it
 * represents a real calendar date (e.g. not Feb 31).
 * Returns the Date on success, or null if any field is empty or the
 * combination is impossible.
 */
function parseDate(fields: DateFields): Date | null {
  const { month, day, year } = fields;
  if (!month || !day || !year) return null;

  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);

  // Guard against impossible day for the chosen month/year (e.g. Apr 31)
  if (d > daysInMonth(m, y)) return null;

  const date = new Date(y, m - 1, d);

  // Belt-and-suspenders: Date constructor normalises invalid values, so
  // double-check that the components round-trip correctly.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }

  return date;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AgeGate
 *
 * Renders a labelled date-entry form. On submission it uses `isOfAge` from
 * ageUtils to determine whether the entered date of birth satisfies `minAge`,
 * then fires `onAgeVerified` or `onAgeDenied` accordingly.
 *
 * @example
 * <AgeGate
 *   minAge={18}
 *   onAgeVerified={() => router.push('/content')}
 *   onAgeDenied={() => router.push('/underage')}
 * />
 */
export default function AgeGate({
  minAge,
  onAgeVerified,
  onAgeDenied,
  disabled = false,
  errorMessage,
  submitButtonText = 'Verify Age',
}: AgeGateProps) {
  const [fields, setFields] = useState<DateFields>({ month: '', day: '', year: '' });
  const [error, setError] = useState<FormError>(null);

  // Dynamically cap the Day list to the real number of days in the chosen
  // month/year. Falls back to 31 until both month and year are selected.
  const maxDays =
    fields.month && fields.year
      ? daysInMonth(parseInt(fields.month, 10), parseInt(fields.year, 10))
      : 31;

  const years = Array.from(
    { length: CURRENT_YEAR - 1900 + 1 },
    (_, i) => CURRENT_YEAR - i // descending: most-recent first
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleChange(field: keyof DateFields, value: string) {
    setError(null); // clear error on any input change

    // If the month or year changes and the current day would no longer be
    // valid, reset the day selection to avoid submitting a stale value.
    if (field === 'month' || field === 'year') {
      const newFields = { ...fields, [field]: value };
      const m = parseInt(newFields.month || '0', 10);
      const y = parseInt(newFields.year || '0', 10);
      const currentDay = parseInt(fields.day || '0', 10);

      if (m && y && currentDay > daysInMonth(m, y)) {
        setFields({ ...newFields, day: '' });
        return;
      }
      setFields(newFields);
      return;
    }

    setFields((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // ── Validate all fields are filled ──────────────────────────────────────
    if (!fields.month || !fields.day || !fields.year) {
      setError('Please enter your complete date of birth.');
      return;
    }

    // ── Validate the date is real ────────────────────────────────────────────
    const dob = parseDate(fields);
    if (!dob) {
      setError('Please enter a valid date of birth.');
      return;
    }

    // ── Reject future dates ──────────────────────────────────────────────────
    if (dob > new Date()) {
      setError('Date of birth cannot be in the future.');
      return;
    }

    // ── Age check ────────────────────────────────────────────────────────────
    const qualified = isOfAge(dob, minAge);

    if (qualified) {
      setError(null);
      onAgeVerified();
    } else {
      setError(errorMessage ?? `You must be at least ${minAge} years old.`);
      onAgeDenied?.();
    }
  }

  // ── Derived state for accessibility ───────────────────────────────────────
  const errorId = 'age-gate-error';
  const hasError = error !== null;
  const isDisabled = disabled;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
          aria-hidden="true"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Age Verification</h2>
        <p className="mt-1 text-sm text-gray-500">You must be {minAge} or older to continue.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate aria-label="Age verification form">
        <fieldset disabled={isDisabled} className="space-y-4">
          <legend className="mb-3 block text-sm font-medium text-gray-700">
            Enter your date of birth
          </legend>

          {/* Three dropdowns in a row */}
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Date of birth">
            {/* Month */}
            <div className="flex flex-col gap-1">
              <label htmlFor="age-gate-month" className="text-xs font-medium text-gray-500">
                Month
              </label>
              <select
                id="age-gate-month"
                value={fields.month}
                onChange={(e) => handleChange('month', e.target.value)}
                aria-required="true"
                aria-invalid={hasError && !fields.month}
                aria-describedby={hasError ? errorId : undefined}
                className={selectClass(hasError && !fields.month, isDisabled)}
              >
                <option value="">MM</option>
                {MONTHS.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div className="flex flex-col gap-1">
              <label htmlFor="age-gate-day" className="text-xs font-medium text-gray-500">
                Day
              </label>
              <select
                id="age-gate-day"
                value={fields.day}
                onChange={(e) => handleChange('day', e.target.value)}
                aria-required="true"
                aria-invalid={hasError && !fields.day}
                aria-describedby={hasError ? errorId : undefined}
                className={selectClass(hasError && !fields.day, isDisabled)}
              >
                <option value="">DD</option>
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>
                    {String(d).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="flex flex-col gap-1">
              <label htmlFor="age-gate-year" className="text-xs font-medium text-gray-500">
                Year
              </label>
              <select
                id="age-gate-year"
                value={fields.year}
                onChange={(e) => handleChange('year', e.target.value)}
                aria-required="true"
                aria-invalid={hasError && !fields.year}
                aria-describedby={hasError ? errorId : undefined}
                className={selectClass(hasError && !fields.year, isDisabled)}
              >
                <option value="">YYYY</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error message */}
          {hasError && (
            <p
              id={errorId}
              role="alert"
              aria-live="polite"
              className="flex items-start gap-1.5 text-sm text-red-600"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            className={[
              'mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
              isDisabled
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800',
            ].join(' ')}
          >
            {submitButtonText}
          </button>
        </fieldset>
      </form>

      {/* Privacy note */}
      <p className="mt-5 text-center text-xs text-gray-400">
        Your date of birth is used only to verify your age and is not stored.
      </p>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

/** Returns Tailwind classes for a select element, varying on error/disabled state. */
function selectClass(isFieldError: boolean, isDisabled: boolean): string {
  const base =
    'w-full rounded-lg border px-2 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 appearance-none bg-white';
  if (isDisabled) return `${base} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400`;
  if (isFieldError) return `${base} border-red-400 bg-red-50 text-gray-900`;
  return `${base} border-gray-300 text-gray-900 hover:border-gray-400`;
}
