import { describe, it, expect } from './test-utils.ts';
import { CountdownService } from '../services/CountdownService.ts';

describe('CountdownService', () => {
  const baseNow = 1792833600000; // Fixed timestamp for deterministic testing

  it('calculates hours, minutes, and seconds remaining accurately', () => {
    // 3 hours, 25 minutes, 40 seconds in the future
    const targetMs = baseNow + (3 * 3600 + 25 * 60 + 40) * 1000;
    const targetUtc = new Date(targetMs).toISOString();

    const result = CountdownService.calculateTimeRemaining(targetUtc, baseNow);

    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(25);
    expect(result.seconds).toBe(40);
    expect(result.formatted).toBe('3h 25m 40s');
    expect(result.isExpired).toBe(false);
    expect(result.isUrgent).toBe(true);
    expect(result.isCritical).toBe(false);
  });

  it('marks auctions under 2 hours as critical', () => {
    // 1 hour, 15 minutes remaining
    const targetMs = baseNow + (1 * 3600 + 15 * 60) * 1000;
    const targetUtc = new Date(targetMs).toISOString();

    const result = CountdownService.calculateTimeRemaining(targetUtc, baseNow);

    expect(result.isCritical).toBe(true);
    expect(result.isUrgent).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.formatted).toBe('1h 15m 00s');
  });

  it('correctly handles expired timestamps', () => {
    // 10 minutes in the past
    const targetMs = baseNow - 10 * 60 * 1000;
    const targetUtc = new Date(targetMs).toISOString();

    const result = CountdownService.calculateTimeRemaining(targetUtc, baseNow);

    expect(result.isExpired).toBe(true);
    expect(result.formatted).toBe('Ended');
    expect(result.totalSecondsRemaining).toBe(0);
  });
});
