import { calculateAge, isOfAge } from '@/lib/utils/ageUtils';

// Fixed reference date used throughout — not today, so tests never drift.
const REF = new Date('2025-06-15');

// ─── calculateAge ──────────────────────────────────────────────────────────

describe('calculateAge', () => {
  describe('standard cases', () => {
    it('returns correct age mid-year', () => {
      expect(calculateAge(new Date('1990-01-01'), REF)).toBe(35);
    });

    it('returns correct age when birthday is later in the year', () => {
      expect(calculateAge(new Date('1990-12-31'), REF)).toBe(34);
    });

    it('handles a person born on the reference date (age 0)', () => {
      expect(calculateAge(REF, REF)).toBe(0);
    });
  });

  describe('birthday boundary — the critical edge cases', () => {
    it('counts as new age ON the birthday', () => {
      const dob = new Date('1990-06-15');
      expect(calculateAge(dob, REF)).toBe(35); // birthday today
    });

    it('is still previous age the day BEFORE birthday', () => {
      const dob = new Date('1990-06-16');
      expect(calculateAge(dob, new Date('2025-06-15'))).toBe(34); // birthday tomorrow
    });

    it('is new age the day AFTER birthday', () => {
      const dob = new Date('1990-06-14');
      expect(calculateAge(dob, REF)).toBe(35); // birthday was yesterday
    });
  });

  describe('leap year birthdays (Feb 29)', () => {
    const leapDob = new Date('2000-02-29');

    it('is correct age on Feb 29 in a leap year', () => {
      expect(calculateAge(leapDob, new Date('2024-02-29'))).toBe(24);
    });

    it('is previous age on Feb 28 in a non-leap year', () => {
      // Birthday not yet passed — Mar 1 convention means they turn N on Mar 1
      expect(calculateAge(leapDob, new Date('2025-02-28'))).toBe(24);
    });

    it('counts as new age on Mar 1 in a non-leap year', () => {
      // Mar 1 > Feb 29 so birthday is considered passed
      expect(calculateAge(leapDob, new Date('2025-03-01'))).toBe(25);
    });
  });

  describe('default today parameter', () => {
    it('uses current date when today is omitted', () => {
      const now = new Date();
      const dob = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate());
      expect(calculateAge(dob)).toBe(30);
    });
  });

  describe('input validation', () => {
    it('throws TypeError for invalid dob', () => {
      expect(() => calculateAge(new Date('not-a-date'), REF)).toThrow(TypeError);
      expect(() => calculateAge(new Date('not-a-date'), REF)).toThrow('dob must be a valid Date');
    });

    it('throws TypeError for invalid today', () => {
      expect(() => calculateAge(new Date('1990-01-01'), new Date('bad'))).toThrow(TypeError);
      expect(() => calculateAge(new Date('1990-01-01'), new Date('bad'))).toThrow(
        'today must be a valid Date'
      );
    });

    it('throws RangeError when dob is in the future', () => {
      const future = new Date('2099-01-01');
      expect(() => calculateAge(future, REF)).toThrow(RangeError);
      expect(() => calculateAge(future, REF)).toThrow('dob cannot be in the future');
    });
  });
});

// ─── isOfAge ───────────────────────────────────────────────────────────────

describe('isOfAge', () => {
  describe('standard cases', () => {
    it('returns true when clearly over minimum age', () => {
      expect(isOfAge(new Date('1990-01-01'), 18, REF)).toBe(true);
    });

    it('returns false when clearly under minimum age', () => {
      expect(isOfAge(new Date('2015-01-01'), 18, REF)).toBe(false);
    });
  });

  describe('exact age boundary', () => {
    it('returns true on the exact day the person turns minAge', () => {
      const dob = new Date('2007-06-15'); // turns 18 on REF date
      expect(isOfAge(dob, 18, REF)).toBe(true);
    });

    it('returns false one day before minAge', () => {
      const oneDayShort = new Date('2007-06-16');
      expect(isOfAge(oneDayShort, 18, new Date('2025-06-15'))).toBe(false);
    });

    it('returns true when age exactly equals minAge of 0', () => {
      expect(isOfAge(REF, 0, REF)).toBe(true);
    });
  });

  describe('default today parameter', () => {
    it('uses current date when today is omitted', () => {
      const now = new Date();
      const dob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
      expect(isOfAge(dob, 18)).toBe(true);
    });
  });

  describe('input validation', () => {
    it('throws RangeError for negative minAge', () => {
      expect(() => isOfAge(new Date('1990-01-01'), -1, REF)).toThrow(RangeError);
      expect(() => isOfAge(new Date('1990-01-01'), -1, REF)).toThrow(
        'minAge must be a non-negative finite number'
      );
    });

    it('throws RangeError for Infinity minAge', () => {
      expect(() => isOfAge(new Date('1990-01-01'), Infinity, REF)).toThrow(RangeError);
    });

    it('throws RangeError for NaN minAge', () => {
      expect(() => isOfAge(new Date('1990-01-01'), NaN, REF)).toThrow(RangeError);
    });

    it('propagates TypeError from calculateAge for invalid dob', () => {
      expect(() => isOfAge(new Date('bad'), 18, REF)).toThrow(TypeError);
    });

    it('propagates RangeError from calculateAge for future dob', () => {
      expect(() => isOfAge(new Date('2099-01-01'), 18, REF)).toThrow(RangeError);
    });
  });
});
