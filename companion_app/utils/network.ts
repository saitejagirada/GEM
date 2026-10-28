/**
 * Standalone Network Reachability Utility
 * Checks genuine public internet connectivity (via DNS/HTTP 204).
 * Accurately detects active 4G cellular data and Wi-Fi without relying on localhost backend ports.
 */

let lastKnownOnlineTimestamp = 0;
const ONLINE_CACHE_TTL_MS = 25000; // 25 seconds grace period for cellular jitter

export function markNetworkOnline(): void {
  lastKnownOnlineTimestamp = Date.now();
}

export async function isNetworkOnline(timeoutMs: number = 7000): Promise<boolean> {
  const now = Date.now();
  if (now - lastKnownOnlineTimestamp < ONLINE_CACHE_TTL_MS) {
    return true;
  }

  const probes = [
    'https://connectivitycheck.gstatic.com/generate_204',
    'https://www.google.com/generate_204',
    'https://clients3.google.com/generate_204',
    'https://1.1.1.1',
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const requests = probes.map((url) =>
      fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      })
        .catch(() =>
          fetch(url, {
            method: 'GET',
            signal: controller.signal,
          })
        )
        .then((res) => {
          if (res.status === 204 || res.ok || res.status < 400) return true;
          throw new Error('Non-204/ok status');
        })
    );
    const result = await Promise.any(requests);
    clearTimeout(timer);
    if (result) {
      lastKnownOnlineTimestamp = Date.now();
      return true;
    }
  } catch {
    // Secondary fallback: Cloudflare CDN trace
    try {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 3500);
      const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'GET',
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimer);
      if (res.ok) {
        lastKnownOnlineTimestamp = Date.now();
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

