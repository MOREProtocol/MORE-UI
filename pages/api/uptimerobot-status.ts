import type { NextApiRequest, NextApiResponse } from 'next';

type StatusResponse = {
  isDown: boolean;
  checkedAt: string; // ISO timestamp
};

let cachedData: StatusResponse | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minutes
const STALE_TTL_MS = 15 * 60 * 1000; // allow stale up to 15 minutes on upstream failure

export default async function handler(req: NextApiRequest, res: NextApiResponse<StatusResponse | { error: string }>) {
  // Cache headers so CDN/proxy can cache and share across users
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60, max-age=60');

  // Mark req as used to satisfy noUnusedParameters while keeping Next.js signature
  void req;

  const now = Date.now();
  if (cachedData && now - cachedAtMs < CACHE_TTL_MS) {
    return res.status(200).json(cachedData);
  }

  const apiKey = process.env.UPTIMEROBOT_READ_ONLY;
  if (!apiKey) {
    // If missing key but we have some cached value, serve it
    if (cachedData && now - cachedAtMs < STALE_TTL_MS) {
      return res.status(200).json(cachedData);
    }
    return res.status(500).json({ error: 'UPTIMEROBOT_READ_ONLY is not configured' });
  }

  try {
    const body = new URLSearchParams({
      api_key: apiKey,
      format: 'json',
      logs: '0',
    });

    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`UptimeRobot HTTP ${response.status}`);
    }

    const json = await response.json();
    const monitors: Array<{ status: number }>
      = Array.isArray(json?.monitors) ? json.monitors : [];

    // UptimeRobot status: 2 = up, 8 = seems down, 9 = down
    const isDown = monitors.some((m) => m?.status === 8 || m?.status === 9);

    cachedData = {
      isDown,
      checkedAt: new Date().toISOString(),
    };
    cachedAtMs = now;

    return res.status(200).json(cachedData);
  } catch (error) {
    // On error, serve last good value if reasonably fresh
    if (cachedData && now - cachedAtMs < STALE_TTL_MS) {
      return res.status(200).json(cachedData);
    }
    return res.status(502).json({ error: 'Failed to fetch UptimeRobot status' });
  }
}


