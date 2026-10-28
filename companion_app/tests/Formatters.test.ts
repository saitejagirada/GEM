import { describe, it, expect } from './test-utils.ts';
import { formatInr, formatLakhs, formatDateSafe } from '../utils/formatters.ts';

describe('Formatters & Hermes Crash Prevention', () => {
  it('formats INR numbers safely without crashing on null or undefined', () => {
    expect(formatInr(undefined)).toBe('0');
    expect(formatInr(null)).toBe('0');
    expect(formatInr(NaN)).toBe('0');
    expect(formatInr(0)).toBe('0');
    expect(formatInr(45000)).toBe('45,000');
    expect(formatInr(1850000)).toBe('18,50,000');
  });

  it('formats Lakhs and Crores accurately with safe fallbacks', () => {
    expect(formatLakhs(undefined)).toBe('₹0');
    expect(formatLakhs(null)).toBe('₹0');
    expect(formatLakhs(0)).toBe('₹0');
    expect(formatLakhs(75000)).toBe('₹75,000');
    expect(formatLakhs(1850000)).toBe('₹18.50 Lakhs');
    expect(formatLakhs(45000000)).toBe('₹4.50 Cr');
  });

  it('safely formats dates without throwing on invalid or missing strings', () => {
    expect(formatDateSafe(undefined)).toBe('N/A');
    expect(formatDateSafe(null)).toBe('N/A');
    expect(formatDateSafe('')).toBe('N/A');
    expect(formatDateSafe('invalid-date')).toBe('N/A');
    const validStr = '2026-10-28T08:00:00Z';
    expect(formatDateSafe(validStr)).not.toBe('N/A');
  });
});
