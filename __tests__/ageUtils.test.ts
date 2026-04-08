import { calculateAge, isOfAge } from '@/lib/utils/ageUtils';

/**
 * All tests use a fixed reference date so results never drift as real time passes.
 * REF = 2025-06-15 (a Sunday, in a non-leap year).
 */
const REF = new Date('2025-06-15');

// ─── calculateAge ──────────────────────────────────────────────────────────

describe('calculateAge', () => {
  // ── Standard cases ──────────────────────────────────────────────────────

  describe('standard cases', () => {
    it('returns correct age for a person born exactly 25 years ago (birthday already passed this year)', () => {
      // Born Jan 1 — by Jun 15 their birthday has already passed
      expect(calculateAge(new Date('2000-01-01'), REF)).toBe(25);
    });

    it('returns correct age when birthday has not yet occurred this calendar year', () => {
      // Born Dec 31 — birthday is still 6 months away on REF date
      expect(calculateAge(new Date('1990-12-31'), REF)).toBe(34);
    });

    it('returns 0 when born on the reference date itself', () => {
      // Edge: same-day birth — age is 0, not negative or 1
      expect(calculateAge(REF, REF)).toBe(0);
    });
  });

  // ── Birthday boundary ────────────────────────────────────────────────────

  describe('birthday boundary — the day-of-birthday transitions', () => {
    it('counts as new age ON the birthday (birthday today)', () => {
      // Born Jun 15 1990, checked Jun 15 2025 → should be 35, not still 34
      const dob = new Date('1990-06-15');
      expect(calculateAge(dob, REF)).toBe(35);
    });

    it('is still previous age the day BEFORE birthday (birthday tomorrow)', () => {
      // Born Jun 16 1990, checked Jun 15 2025 → birthday is tomorrow, still 34
      const dob = new Date('1990-06-16');
      expect(calculateAge(dob, REF)).toBe(34);
    });

    it('is new age the day AFTER birthday (birthday was yesterday)', () => {
      // Born Jun 14 1990, checked Jun 15 2025 → birthday was yesterday, already 35
      const dob = new Date('1990-06-14');
      expect(calculateAge(dob, REF)).toBe(35);
    });
  });

  // ── Leap year birthdays ──────────────────────────────────────────────────

  describe('leap year birthdays (Feb 29)', () => {
    const leapDob = new Date('2000-02-29');

    it('returns correct age on Feb 29 in a leap year', () => {
      // 2024 is a leap year — Feb 29 exists, so birthday is today
      expect(calculateAge(leapDob, new Date('2024-02-29'))).toBe(24);
    });

    it('is still previous age on Feb 28 in a non-leap year', () => {
      // 2025 is not a leap year — birthday convention is Mar 1, so on Feb 28 they
      // have not yet turned 25
      expect(calculateAge(leapDob, new Date('2025-02-28'))).toBe(24);
    });

    it('counts as new age on Mar 1 in a non-leap year (Mar 1 convention)', () => {
      // On Mar 1 the birthday is considered to have passed in non-leap years
      expect(calculateAge(leapDob, new Date('2025-03-01'))).toBe(25);
    });

    it('returns correct age the day after a leap birthday in a non-leap year', () => {
      // Mar 2 — well past the Mar 1 convention date, still same year
      expect(calculateAge(leapDob, new Date('2025-03-02'))).toBe(25);
    });
  });

  // ── Very young / very old ────────────────────────────────────────────────

  describe('extreme age ranges', () => {
    it('handles a very young person born one week ago', () => {
      // Born Jun 8 2025, checked Jun 15 2025 → 0 years old
      const oneWeekOld = new Date('2025-06-08');
      expect(calculateAge(oneWeekOld, REF)).toBe(0);
    });

    it('handles a very young person born yesterday', () => {
      const yesterday = new Date('2025-06-14');
      expect(calculateAge(yesterday, REF)).toBe(0);
    });

    it('handles a person born 100 years ago', () => {
      // Born Jun 15 1925, checked Jun 15 2025 → exactly 100
      expect(calculateAge(new Date('1925-06-15'), REF)).toBe(100);
    });

    it('handles a person born 120 years ago', () => {
      // Oldest verified humans lived ~122 years; function should handle this
      expect(calculateAge(new Date('1905-01-01'), REF)).toBe(120);
    });
  });

  // ── Default today parameter ──────────────────────────────────────────────

  describe('default today parameter', () => {
    it('uses the current date when today is omitted', () => {
      // Build a DOB that is exactly 30 years before right now so the birthday
      // falls on today — result must be exactly 30 regardless of when test runs
      const now = new Date();
      const dob = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate());
      expect(calculateAge(dob)).toBe(30);
    });
  });

  // ── Input validation ─────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws TypeError with a descriptive message for an invalid dob', () => {
      expect(() => calculateAge(new Date('not-a-date'), REF)).toThrow(TypeError);
      expect(() => calculateAge(new Date('not-a-date'), REF)).toThrow('dob must be a valid Date');
    });

    it('throws TypeError with a descriptive message for an invalid today', () => {
      expect(() => calculateAge(new Date('1990-01-01'), new Date('bad'))).toThrow(TypeError);
      expect(() => calculateAge(new Date('1990-01-01'), new Date('bad'))).toThrow(
        'today must be a valid Date'
      );
    });

    it('throws RangeError when dob is in the future relative to today', () => {
      // Future dob is nonsensical — the function rejects it rather than returning
      // a negative age, which would be silently misleading
      expect(() => calculateAge(new Date('2099-01-01'), REF)).toThrow(RangeError);
      expect(() => calculateAge(new Date('2099-01-01'), REF)).toThrow(
        'dob cannot be in the future'
      );
    });

    it('throws RangeError when dob is one second in the future', () => {
      // Off-by-one: even a 1ms future date must be rejected
      const oneSecondAhead = new Date(REF.getTime() + 1000);
      expect(() => calculateAge(oneSecondAhead, REF)).toThrow(RangeError);
    });
  });
});

// ─── isOfAge ───────────────────────────────────────────────────────────────

describe('isOfAge', () => {
  // ── Standard cases ──────────────────────────────────────────────────────

  describe('standard cases', () => {
    it('returns true when person is clearly over minimum age', () => {
      // Born 1990, checking against 18 minimum in 2025 → 35 years old → true
      expect(isOfAge(new Date('1990-01-01'), 18, REF)).toBe(true);
    });

    it('returns true when person is way over minimum age (50+ years over)', () => {
      // 100 year old vs minAge 18 → comfortably true
      expect(isOfAge(new Date('1925-06-15'), 18, REF)).toBe(true);
    });

    it('returns false when person is clearly under minimum age', () => {
      // Born 2015, only 10 years old on REF date → false
      expect(isOfAge(new Date('2015-01-01'), 18, REF)).toBe(false);
    });
  });

  // ── Exact age boundary ───────────────────────────────────────────────────

  describe('exact minimum age boundary', () => {
    it('returns true on the EXACT day the person turns minAge (birthday today)', () => {
      // Born Jun 15 2007, checked Jun 15 2025 → turns exactly 18 today → true
      const dob = new Date('2007-06-15');
      expect(isOfAge(dob, 18, REF)).toBe(true);
    });

    it('returns false ONE DAY before reaching minAge (birthday tomorrow)', () => {
      // Born Jun 16 2007, checked Jun 15 2025 → still 17 today → false
      const oneDayShort = new Date('2007-06-16');
      expect(isOfAge(oneDayShort, 18, REF)).toBe(false);
    });

    it('returns true ONE DAY after reaching minAge (birthday was yesterday)', () => {
      // Born Jun 14 2007, checked Jun 15 2025 → turned 18 yesterday → true
      const oneDayOver = new Date('2007-06-14');
      expect(isOfAge(oneDayOver, 18, REF)).toBe(true);
    });
  });

  // ── Leap year age thresholds ─────────────────────────────────────────────

  describe('leap year birthdays at age threshold', () => {
    // Person born Feb 29 2000, checking 18th birthday
    const leapDob = new Date('2000-02-29');

    it('returns false on Feb 28 of the 18th year (birthday not yet reached)', () => {
      // In non-leap year 2018, birthday convention is Mar 1 → still 17 on Feb 28
      expect(isOfAge(leapDob, 18, new Date('2018-02-28'))).toBe(false);
    });

    it('returns true on Mar 1 of the 18th year (Mar 1 convention in non-leap year)', () => {
      // Mar 1 2018 is when the leap-birthday person turns 18 in a non-leap year
      expect(isOfAge(leapDob, 18, new Date('2018-03-01'))).toBe(true);
    });

    it('returns true on Feb 29 of the 24th year (actual leap day birthday)', () => {
      // 2024 is a leap year — their birthday actually exists, they turn 24
      expect(isOfAge(leapDob, 18, new Date('2024-02-29'))).toBe(true);
    });
  });

  // ── Zero minimum age ─────────────────────────────────────────────────────

  describe('zero minimum age', () => {
    it('returns true for a newborn (born today) with minAge 0', () => {
      expect(isOfAge(REF, 0, REF)).toBe(true);
    });

    it('returns true for any person with minAge 0', () => {
      // Everyone is at least 0 years old
      expect(isOfAge(new Date('1950-01-01'), 0, REF)).toBe(true);
      expect(isOfAge(new Date('2025-01-01'), 0, REF)).toBe(true);
    });
  });

  // ── Default today parameter ──────────────────────────────────────────────

  describe('default today parameter', () => {
    it('uses the current date when today is omitted', () => {
      const now = new Date();
      const dob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
      expect(isOfAge(dob, 18)).toBe(true);
    });
  });

  // ── Input validation ─────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws RangeError for negative minAge', () => {
      expect(() => isOfAge(new Date('1990-01-01'), -1, REF)).toThrow(RangeError);
      expect(() => isOfAge(new Date('1990-01-01'), -1, REF)).toThrow(
        'minAge must be a non-negative finite number'
      );
    });

    it('throws RangeError for Infinity minAge', () => {
      // Infinity is not a valid age requirement
      expect(() => isOfAge(new Date('1990-01-01'), Infinity, REF)).toThrow(RangeError);
    });

    it('throws RangeError for NaN minAge', () => {
      expect(() => isOfAge(new Date('1990-01-01'), NaN, REF)).toThrow(RangeError);
    });

    it('propagates TypeError from calculateAge for an invalid dob', () => {
      expect(() => isOfAge(new Date('not-a-date'), 18, REF)).toThrow(TypeError);
      expect(() => isOfAge(new Date('not-a-date'), 18, REF)).toThrow('dob must be a valid Date');
    });

    it('propagates RangeError from calculateAge for a future dob', () => {
      expect(() => isOfAge(new Date('2099-01-01'), 18, REF)).toThrow(RangeError);
      expect(() => isOfAge(new Date('2099-01-01'), 18, REF)).toThrow('dob cannot be in the future');
    });
  });
});
