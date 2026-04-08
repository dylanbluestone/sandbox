/**
 * Validates that a value is a finite, non-NaN Date object.
 * Throws a descriptive error if the date is invalid.
 */
function assertValidDate(date: unknown, label: string): asserts date is Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError(`${label} must be a valid Date object`);
  }
}

/**
 * Calculates a person's exact age in whole years.
 *
 * The birthday is considered to have passed on the anniversary date itself,
 * so a person turns N years old at the start of their birthday (not the day after).
 *
 * Leap-year birthdays (Feb 29): the anniversary is treated as Mar 1 in non-leap years,
 * matching the most common legal convention.
 *
 * @param dob   - Date of birth
 * @param today - Reference date (defaults to current date if omitted)
 * @returns Age in whole years (integer)
 *
 * @throws {TypeError} If dob or today is not a valid Date
 * @throws {RangeError} If dob is in the future relative to today
 *
 * @example
 * calculateAge(new Date('1990-06-15'))         // age as of today
 * calculateAge(new Date('1990-06-15'), new Date('2025-06-15')) // 35 — birthday today
 * calculateAge(new Date('1990-06-15'), new Date('2025-06-14')) // 34 — birthday tomorrow
 */
export function calculateAge(dob: Date, today: Date = new Date()): number {
  assertValidDate(dob, 'dob');
  assertValidDate(today, 'today');

  if (dob > today) {
    throw new RangeError('dob cannot be in the future');
  }

  const birthYear = dob.getFullYear();
  const birthMonth = dob.getMonth(); // 0-indexed
  const birthDay = dob.getDate();

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  let age = todayYear - birthYear;

  // Determine whether this year's birthday has occurred yet.
  // Compare month first, then day-of-month. Subtract 1 if today is before
  // the birthday this calendar year.
  const birthdayPassedThisYear =
    todayMonth > birthMonth || (todayMonth === birthMonth && todayDay >= birthDay);

  if (!birthdayPassedThisYear) {
    age -= 1;
  }

  return age;
}

/**
 * Determines whether a person meets a minimum age requirement.
 *
 * A person meets the requirement on the exact anniversary of their birth
 * (i.e. the day they turn `minAge`), not the day after.
 *
 * @param dob    - Date of birth
 * @param minAge - Minimum required age in whole years (must be ≥ 0)
 * @param today  - Reference date (defaults to current date if omitted)
 * @returns `true` if age ≥ minAge, `false` otherwise
 *
 * @throws {TypeError}  If dob or today is not a valid Date
 * @throws {RangeError} If minAge is negative
 * @throws {RangeError} If dob is in the future relative to today
 *
 * @example
 * isOfAge(new Date('2007-04-07'), 18)  // true  — exactly 18 today (2025-04-07)
 * isOfAge(new Date('2007-04-08'), 18)  // false — turns 18 tomorrow
 * isOfAge(new Date('2007-04-06'), 18)  // true  — turned 18 yesterday
 */
export function isOfAge(dob: Date, minAge: number, today: Date = new Date()): boolean {
  if (!Number.isFinite(minAge) || minAge < 0) {
    throw new RangeError('minAge must be a non-negative finite number');
  }

  // Delegate date validation and age calculation to calculateAge.
  const age = calculateAge(dob, today);

  return age >= minAge;
}
