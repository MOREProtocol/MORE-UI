import type { NextApiRequest, NextApiResponse } from 'next';

// Rate limiting: 100 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://localhost:3000', 'https://app.more.markets'];

function getRateLimitKey(req: NextApiRequest): string {
  // Get IP address, handling proxies
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;

  // Add user agent hash for additional uniqueness in private browsing
  const userAgent = req.headers['user-agent'] || '';
  const uaHash = userAgent.slice(-4); // Last 4 chars as simple hash

  return `${ip || 'unknown'}-${uaHash}`;
}

function isOriginAllowed(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // For preflight OPTIONS requests, check origin
  if (origin) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Fallback to referer validation for direct requests
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  // Allow requests without origin/referer in development
  return process.env.NODE_ENV === 'development';
}

function isRateLimited(req: NextApiRequest): boolean {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries
  for (const [k, v] of rateLimitMap.entries()) {
    if (v.resetTime < windowStart) {
      rateLimitMap.delete(k);
    }
  }

  const current = rateLimitMap.get(key);

  if (!current || current.resetTime < windowStart) {
    // First request in window or window has reset
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (current.count >= RATE_LIMIT_REQUESTS) {
    return true; // Rate limited
  }

  // Increment count
  current.count++;
  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if origin is allowed
  if (!isOriginAllowed(req)) {
    console.log('Unauthorized origin blocked:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    });

    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32403,
        message: 'Forbidden',
        data: 'Origin not allowed'
      }
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(403).json(errorResponse);
  }

  // Add CORS headers for allowed origin
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Check rate limit
  if (isRateLimited(req)) {
    console.log('Rate limit exceeded for IP:', getRateLimitKey(req));

    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32429,
        message: 'Too many requests',
        data: 'Rate limit: 100 requests per minute exceeded'
      }
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(429).json(errorResponse);
  }

  try {
    // The private Alchemy URL - kept server-side
    const ALCHEMY_URL = process.env.ALCHEMY_URL;

    if (!ALCHEMY_URL) {
      throw new Error('ALCHEMY_URL environment variable is not configured');
    }

    const clientIP = getRateLimitKey(req);
    const clientStats = rateLimitMap.get(clientIP);

    console.log('Proxying RPC request to Alchemy:', {
      method: req.body?.method,
      id: req.body?.id,
      clientIP,
      origin: req.headers.origin,
      referer: req.headers.referer,
      requestCount: clientStats?.count || 0,
      rateLimitRemaining: Math.max(0, RATE_LIMIT_REQUESTS - (clientStats?.count || 0))
    });

    // Forward the request to Alchemy
    const response = await fetch(ALCHEMY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      console.error('Alchemy response not ok:', response.status, response.statusText);
      throw new Error(`Alchemy RPC error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Alchemy response received:', {
      hasResult: !!data.result,
      hasError: !!data.error,
      id: data.id
    });

    // Return the response from Alchemy with proper headers
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (error) {
    console.error('Ethereum RPC proxy error:', error);

    // Return a proper JSON-RPC error response
    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json(errorResponse);
  }
} 