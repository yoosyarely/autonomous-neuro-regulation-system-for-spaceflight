// AI-assisted code. See README: AI use disclosure.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'nasa-snapshot.json');

const HORIZONS_START = '2026-11-15';
const HORIZONS_STOP = '2029-01-15';
const HORIZONS_URL =
  `https://ssd.jpl.nasa.gov/api/horizons.api?format=json` +
  `&COMMAND='499'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'` +
  `&CENTER='500@399'&START_TIME='${HORIZONS_START}'&STOP_TIME='${HORIZONS_STOP}'` +
  `&STEP_SIZE='1%20d'&QUANTITIES='20,21,23'`;

const MONTHS = {
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

/**
 * Parses JPL Horizons $$SOE..$$EOE observer table for Mars (499) from Earth (500@399).
 * Verified columns: Date__(UT)__HR:MN | delta (AU) | deldot (km/s) | 1-way_down_LT (min) | S-O-T (deg) | /r
 */
function parseHorizonsResult(resultText) {
  const lines = resultText.split(/\r?\n/);
  const soeIdx = lines.findIndex((line) => line.trim() === '$$SOE');
  const eoeIdx = lines.findIndex((line) => line.trim() === '$$EOE');

  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) {
    throw new Error('Could not locate $$SOE / $$EOE ephemeris block in Horizons response.');
  }

  const rows = [];
  const rowPattern =
    /^\s*(\d{4})-([A-Za-z]{3})-(\d{2})\s+\d{2}:\d{2}\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)/;

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

  if (rows.length === 0) {
    throw new Error('Parsed 0 ephemeris rows from JPL Horizons response.');
  }
  return rows;
}

async function fetchDonkiFeed(feed, startDate, endDate, apiKey) {
  const url = `https://api.nasa.gov/DONKI/${feed}?startDate=${startDate}&endDate=${endDate}&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    return { ok: false, status: res.status, count: null };
  }
  const data = await res.json();
  return {
    ok: true,
    status: res.status,
    count: Array.isArray(data) ? data.length : 0,
  };
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const snapshotDate = fetchedAt.slice(0, 10);
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

  console.log('Fetching JPL Horizons Mars ephemeris...');
  const horizonsRes = await fetch(HORIZONS_URL, { signal: AbortSignal.timeout(30000) });
  if (!horizonsRes.ok) {
    throw new Error(`JPL Horizons HTTP ${horizonsRes.status}`);
  }
  const horizonsJson = await horizonsRes.json();
  if (!horizonsJson.result) {
    throw new Error('JPL Horizons JSON missing "result" field.');
  }
  const ephemeris = parseHorizonsResult(horizonsJson.result);
  console.log(`Parsed ${ephemeris.length} daily ephemeris rows (${ephemeris[0].date} to ${ephemeris.at(-1).date}).`);

  const endDate = snapshotDate;
  const start = new Date(`${snapshotDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 30);
  const startDate = start.toISOString().slice(0, 10);

  console.log(`Fetching NASA DONKI (${startDate} to ${endDate})...`);
  const feeds = ['FLR', 'SEP', 'GST'];
  const donkiResults = {};
  const unavailableFeeds = [];
  let totalEvents = 0;
  let anyDonkiOk = false;

  for (const feed of feeds) {
    try {
      const result = await fetchDonkiFeed(feed, startDate, endDate, apiKey);
      donkiResults[feed.toLowerCase()] = result.ok ? result.count : null;
      if (result.ok) {
        anyDonkiOk = true;
        totalEvents += result.count;
      } else {
        unavailableFeeds.push(`${feed} (HTTP ${result.status})`);
      }
      console.log(`  DONKI ${feed}: ${result.ok ? `${result.count} events` : `HTTP ${result.status}`}`);
    } catch (err) {
      donkiResults[feed.toLowerCase()] = null;
      unavailableFeeds.push(`${feed} (${err instanceof Error ? err.message : 'error'})`);
      console.log(`  DONKI ${feed}: failed`);
    }
  }

  const snapshot = {
    placeholder: false,
    fetchedAt,
    source: `NASA data snapshot, ${snapshotDate}`,
    horizonRange: {
      startDate: HORIZONS_START,
      stopDate: HORIZONS_STOP,
    },
    oneWayDelayMin: ephemeris[0].oneWayDelayMin,
    sunEarthMarsAngleDeg: ephemeris[0].sunEarthMarsAngleDeg,
    solarEvents30d: anyDonkiOk ? totalEvents : null,
    donki: {
      windowStart: startDate,
      windowEnd: endDate,
      counts: donkiResults,
      unavailableFeeds,
    },
    ephemeris,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
