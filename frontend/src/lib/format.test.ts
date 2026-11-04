import { describe, expect, it } from 'vitest';
import { formatMoney, formatRelative } from './format';

describe('formatMoney', () => {
  it('formats rupees with the en-IN grouping and two decimals', () => {
    expect(formatMoney(1299)).toBe('₹1,299.00');
  });

  it('uses lakh grouping for large amounts', () => {
    expect(formatMoney(125000)).toBe('₹1,25,000.00');
  });

  it('keeps paise', () => {
    expect(formatMoney(4999.5)).toBe('₹4,999.50');
  });
});

describe('formatRelative', () => {
  it('describes a time in days relative to now', () => {
    const now = Date.parse('2026-10-16T12:00:00Z');
    expect(formatRelative('2026-10-11T12:00:00Z', now)).toBe('5 days ago');
  });
});
