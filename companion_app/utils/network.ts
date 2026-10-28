/**
 * Standalone Network Reachability Utility
 * Checks genuine public internet connectivity (via DNS/HTTP 204).
 * Accurately detects active 4G cellular data and Wi-Fi without relying on localhost backend ports.
 */

export async function isNetworkOnline(timeoutMs: number = 4000): Promise<boolean> {
  const probes = [
    'https://connectivitycheck.gstatic.com/generate_204',
    'https://www.google.com/generate_204',
    'https://clients3.google.com/generate_204',
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const requests = probes.map((url) =>
      fetch(url, {
        method: 'GET',
        signal: controller.signal,
      }).then((res) => {
        if (res.status === 204 || res.ok) return true;
        throw new Error('Non-204/ok status');
      })
    );
    const result = await Promise.any(requests);
    clearTimeout(timer);
    return result;
  } catch {
    // Fallback: try cloudflare trace in case Google CDN is restricted
    try {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 2000);
      const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'GET',
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimer);
      return res.ok;
    } catch {
      return false;
    }
  }
}
