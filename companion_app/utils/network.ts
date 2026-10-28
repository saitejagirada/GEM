/**
 * Standalone Network Reachability Utility
 * Checks genuine public internet connectivity (via DNS/HTTP 204).
 * Accurately detects active 4G cellular data and Wi-Fi without relying on localhost backend ports.
 */

export async function isNetworkOnline(timeoutMs: number = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.status === 204 || res.ok;
  } catch {
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
      const res2 = await fetch('https://dns.google/resolve?name=gem.gov.in', {
        signal: controller2.signal,
      });
      clearTimeout(timer2);
      return res2.ok;
    } catch {
      return false;
    }
  }
}
