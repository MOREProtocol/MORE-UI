import type { NextApiRequest, NextApiResponse } from 'next';

// Basic allowlist for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://app.more.markets',
  'https://testnet.more.markets',
];

// Simple in-memory rate limiter: 120 req/min per client key
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 120;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function getClientKey(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const uaHash = userAgent.slice(-4);
  return `${ip || 'unknown'}-${uaHash}`;
}

function isOriginAllowed(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) return ALLOWED_ORIGINS.includes(origin);
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    } catch {
      return false;
    }
  }
  return process.env.NODE_ENV === 'development';
}

function isRateLimited(req: NextApiRequest): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  for (const [k, v] of rateLimitMap.entries()) {
    if (v.resetTime < windowStart) rateLimitMap.delete(k);
  }

  const current = rateLimitMap.get(key);
  if (!current || current.resetTime < windowStart) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (current.count >= RATE_LIMIT_REQUESTS) return true;
  current.count++;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  if (!isOriginAllowed(req)) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json({ error: 'Forbidden: origin not allowed' });
  }
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (isRateLimited(req)) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Server-side secrets
  const SUBGRAPH_URL =
    process.env.ETHEREUM_VAULTS_SUBGRAPH_URL ||
    'https://api.studio.thegraph.com/query/109306/more-vaults/version/latest';
  const AUTH_TOKEN = process.env.THEGRAPH_STUDIO_TOKEN;

  if (!AUTH_TOKEN) {
    return res.status(500).json({ error: 'Server not configured: THEGRAPH_STUDIO_TOKEN missing' });
  }

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    if (!response.ok) {
      // Forward error details while hiding token
      return res.status(response.status).send(text);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);
  } catch (error) {
    console.error('TheGraph proxy error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}


