/**
 * GeM Mobile Companion App - Live Countdown Calculation Service
 * Provides pure mathematical cutoff time remaining calculations and urgency thresholds.
 */

export interface CountdownInfo {
  totalSecondsRemaining: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean;    // < 12 Hours
  isCritical: boolean;  // < 2 Hours
  formatted: string;    // "14h 28m 42s" or "01m 15s"
}

export class CountdownService {
  /**
   * Calculates time remaining until target ISO timestamp or fallback hours from now.
   */
  public static calculateTimeRemaining(
    targetUtc?: string,
    nowMs: number = Date.now()
  ): CountdownInfo {
    let targetMs: number;

    if (targetUtc) {
      targetMs = new Date(targetUtc).getTime();
      if (isNaN(targetMs)) {
        // Fallback default: 18 hours from now
        targetMs = nowMs + 18 * 3600 * 1000;
      }
    } else {
      // Default cutoff (e.g. 18 hours)
      targetMs = nowMs + 18 * 3600 * 1000;
    }

    const diffSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    const isExpired = diffSeconds <= 0;
    const isCritical = diffSeconds > 0 && diffSeconds <= 2 * 3600;
    const isUrgent = diffSeconds > 0 && diffSeconds <= 12 * 3600;

    let formatted = 'Ended';
    if (!isExpired) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (hours > 0) {
        formatted = `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
      } else {
        formatted = `${pad(minutes)}m ${pad(seconds)}s`;
      }
    }

    return {
      totalSecondsRemaining: diffSeconds,
      hours,
      minutes,
      seconds,
      isExpired,
      isUrgent,
      isCritical,
      formatted,
    };
  }
}
