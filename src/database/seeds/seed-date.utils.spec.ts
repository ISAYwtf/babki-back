import { getSeedDate, getSeedMonthRange } from './seed-date.utils';

describe('seed date utils', () => {
  const anchor = new Date('2026-08-08T18:30:00.000Z');

  it('creates a midnight UTC date in the anchor month', () => {
    expect(getSeedDate(0, 8, anchor)).toBe('2026-08-08T00:00:00.000Z');
  });

  it('moves across year boundaries', () => {
    expect(getSeedDate(-8, 15, anchor)).toBe('2025-12-15T00:00:00.000Z');
    expect(getSeedDate(5, 3, anchor)).toBe('2027-01-03T00:00:00.000Z');
  });

  it('returns the first and last calendar dates of a leap-year month', () => {
    expect(getSeedMonthRange(0, new Date('2024-02-10T12:00:00.000Z'))).toEqual({
      startDate: '2024-02-01T00:00:00.000Z',
      endDate: '2024-02-29T00:00:00.000Z',
    });
  });

  it('rejects a day outside the target month', () => {
    expect(() => getSeedDate(0, 32, anchor)).toThrow(RangeError);
  });
});
