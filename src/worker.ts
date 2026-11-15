// AI-assisted code. See README: AI use disclosure.
// Stateless, CORS-enabled proxy for JPL Horizons and NASA DONKI on Cloudflare Workers.
// No user logs, no cookies, no analytics.

interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface WorkerEnv {
  ASSETS: AssetsFetcher;
  NASA_API_KEY?: string;
}

const CACHE_TTL_SEC = 900; // 15 minutes
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_DONKI_TYPES = new Set(['FLR', 'SEP', 'GST']);

const MONTHS: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: unknown, status = 200, cacheable = true): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
    'Cache-Control': cacheable ? `public, max-age=${CACHE_TTL_SEC}` : 'no-store',
  };
  return new Response(JSON.stringify(body), { status, headers });
}

function utcDateStr(offsetDays = 0): string {
  const now = new Date();
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
  return new Date(ms).toISOString().slice(0, 10);
}

function parseHorizonsRows(resultText: string) {
  const lines = resultText.split(/\r?\n/);
  const soeIdx = lines.findIndex((line) => line.trim() === '$$SOE');
  const eoeIdx = lines.findIndex((line) => line.trim() === '$$EOE');
  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) {
    return [];
  }

  const rowPattern =
    /^\s*(\d{4})-([A-Za-z]{3})-(\d{2})\s+\d{2}:\d{2}\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)/;
  const rows: Array<{
    date: string;
    deltaAu: number;
    oneWayDelayMin: number;
    sunEarthMarsAngleDeg: number;
  }> = [];

  for (let i = soeIdx + 1; i < eoeIdx; i++) {
    const match = lines[i].match(rowPattern);
    if (!match) continue;
    const [, year, monAbbr, day, deltaStr, , lightTimeMinStr, sotDegStr] = match;
    const month = MONTHS[monAbbr];
    if (!month) continue;
    rows.push({
      date: `${year}-${month}-${day}`,
      deltaAu: Number(Number(deltaStr).toFixed(4)),
      oneWayDelayMin: Number(Number(lightTimeMinStr).toFixed(2)),
      sunEarthMarsAngleDeg: Number(Number(sotDegStr).toFixed(2)),
    });
  }
  return rows;
}

async function handleHorizons(url: URL): Promise<Response> {
  const start = url.searchParams.get('start') ?? utcDateStr(0);
  const stop = url.searchParams.get('stop') ?? utcDateStr(2);

  if (!DATE_RE.test(start) || !DATE_RE.test(stop)) {
    return jsonResponse({ error: 'Invalid date parameter. Expected YYYY-MM-DD.' }, 400, false);
  }

  // Strictly whitelisted host and fixed parameters (Mars 499 from Earth 500@399)
  const upstreamUrl =
    `https://ssd.jpl.nasa.gov/api/horizons.api?format=json` +
    `&COMMAND='499'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'` +
    `&CENTER='500@399'&START_TIME='${start}'&STOP_TIME='${stop}'` +
    `&STEP_SIZE='1%20d'&QUANTITIES='20,21,23'`;

  const upstreamRes = await fetch(upstreamUrl, {
    signal: AbortSignal.timeout(4500),
  });

  if (!upstreamRes.ok) {
    return jsonResponse({ error: `JPL Horizons upstream HTTP ${upstreamRes.status}` }, 502, false);
  }

  const payload = (await upstreamRes.json()) as { result?: string };
  if (!payload.result) {
    return jsonResponse({ error: 'JPL Horizons response missing result.' }, 502, false);
  }

  const rows = parseHorizonsRows(payload.result);
  if (rows.length === 0) {
    return jsonResponse({ error: 'No ephemeris rows parsed.' }, 502, false);
  }

  return jsonResponse({
    fetchedAt: new Date().toISOString(),
    rows,
  });
}

async function handleDonki(url: URL, env: WorkerEnv): Promise<Response> {
  const type = (url.searchParams.get('type') ?? '').toUpperCase();
  if (!ALLOWED_DONKI_TYPES.has(type)) {
    return jsonResponse({ error: 'Invalid type. Allowed: FLR, SEP, GST.' }, 400, false);
  }

  const startDate = url.searchParams.get('startDate') ?? utcDateStr(-30);
  const endDate = url.searchParams.get('endDate') ?? utcDateStr(0);

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return jsonResponse({ error: 'Invalid date parameter. Expected YYYY-MM-DD.' }, 400, false);
  }

  const apiKey = env.NASA_API_KEY || 'DEMO_KEY';
  const upstreamUrl =
    `https://api.nasa.gov/DONKI/${type}?startDate=${startDate}&endDate=${endDate}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const upstreamRes = await fetch(upstreamUrl, {
    signal: AbortSignal.timeout(4500),
  });

  if (!upstreamRes.ok) {
    return jsonResponse({ error: `NASA DONKI upstream HTTP ${upstreamRes.status}` }, upstreamRes.status, false);
  }

  const data = (await upstreamRes.json()) as unknown;
  const count = Array.isArray(data) ? data.length : 0;

  return jsonResponse({
    fetchedAt: new Date().toISOString(),
    type,
    startDate,
    endDate,
    count,
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed. Use GET.' }, 405, false);
      }

      if (url.pathname === '/api/horizons') {
        return handleHorizons(url);
      }
      if (url.pathname === '/api/donki') {
        return handleDonki(url, env);
      }

      return jsonResponse({ error: 'Not found.' }, 404, false);
    }

    return env.ASSETS.fetch(request);
  },
};
