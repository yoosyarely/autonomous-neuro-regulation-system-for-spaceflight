// AI-assisted code. See README: AI use disclosure.

export interface EphemerisEntry {
  date: string;
  deltaAu?: number;
  oneWayDelayMin: number;
  sunEarthMarsAngleDeg: number;
}

export interface NasaSnapshot {
  placeholder?: boolean;
  fetchedAt: string;
  source: string;
  oneWayDelayMin: number;
  sunEarthMarsAngleDeg: number;
  solarEvents30d: number | null;
  ephemeris?: EphemerisEntry[];
}

export interface EarthLinkData {
  oneWayDelayMin: number;
  sunEarthMarsAngleDeg: number;
  solarEvents30d: number | null;
  fetchedAt: string;
  ephemerisDate?: string;
  source: string;
  placeholder?: boolean;
}

export type LinkStatusCategory = 'conjunction' | 'degraded' | 'nominal';

export interface LinkStatusInfo {
  label: string;
  category: LinkStatusCategory;
}

const SNAPSHOT_STORAGE_KEY = 'anrs_nasa_snapshot_v1';
const DONKI_STORAGE_KEY = 'anrs_nasa_donki_live_v1';
const LIVE_TIMEOUT_MS = 5000;

let memorySnapshot: NasaSnapshot | null = null;
let memoryDonkiLive: { count: number; fetchedAt: string } | null | undefined = undefined;

/**
 * Derives communication link status from the Sun-Earth-Mars angle.
 * - <= 2 deg: "No reliable link (solar conjunction)"
 * - > 2 and <= 4 deg: "Degraded link"
 * - > 4 deg: "Nominal link"
 */
export function getLinkStatus(angleDeg: number): LinkStatusInfo {
  if (angleDeg <= 2) {
    return {
      label: 'No reliable link (solar conjunction)',
      category: 'conjunction',
    };
  }
  if (angleDeg <= 4) {
    return {
      label: 'Degraded link',
      category: 'degraded',
    };
  }
  return {
    label: 'Nominal link',
    category: 'nominal',
  };
}

function readSessionJson<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

async function loadSnapshot(): Promise<NasaSnapshot> {
  if (memorySnapshot) return memorySnapshot;

  const cached = readSessionJson<NasaSnapshot>(SNAPSHOT_STORAGE_KEY);
  if (cached && Array.isArray(cached.ephemeris) && cached.ephemeris.length > 0) {
    memorySnapshot = cached;
    return cached;
  }

  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${normalizedBase}nasa-snapshot.json`;

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load Earth link telemetry (HTTP ${response.status})`);
  }

  const data = (await response.json()) as NasaSnapshot;
  memorySnapshot = data;
  writeSessionJson(SNAPSHOT_STORAGE_KEY, data);
  return data;
}

/**
 * Attempts live NASA DONKI (SEP + GST, which support CORS) with a 5s timeout.
 * JPL Horizons does not send Access-Control-Allow-Origin, so ephemeris always uses the snapshot.
 */
async function tryLiveDonkiCount(): Promise<{ count: number; fetchedAt: string } | null> {
  if (memoryDonkiLive !== undefined) return memoryDonkiLive;

  const cached = readSessionJson<{ count: number; fetchedAt: string }>(DONKI_STORAGE_KEY);
  if (cached && typeof cached.count === 'number') {
    memoryDonkiLive = cached;
    return cached;
  }

  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

    try {
      const [sepRes, gstRes] = await Promise.all([
        fetch(
          `https://api.nasa.gov/DONKI/SEP?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`,
          { signal: controller.signal },
        ),
        fetch(
          `https://api.nasa.gov/DONKI/GST?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`,
          { signal: controller.signal },
        ),
      ]);

      if (!sepRes.ok && !gstRes.ok) {
        memoryDonkiLive = null;
        return null;
      }

      let count = 0;
      if (sepRes.ok) {
        const sepData = (await sepRes.json()) as unknown;
        if (Array.isArray(sepData)) count += sepData.length;
      }
      if (gstRes.ok) {
        const gstData = (await gstRes.json()) as unknown;
        if (Array.isArray(gstData)) count += gstData.length;
      }

      const result = { count, fetchedAt: new Date().toISOString() };
      memoryDonkiLive = result;
      writeSessionJson(DONKI_STORAGE_KEY, result);
      return result;
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    memoryDonkiLive = null;
    return null;
  }
}

/**
 * Fetches Earth-spacecraft link telemetry for the given mission day.
 * Uses the JPL Horizons ephemeris snapshot (CORS-blocked in browsers) and attempts live DONKI
 * space-weather counts with a 5-second timeout, falling back cleanly to the snapshot.
 */
export async function getEarthLink(missionDay: number): Promise<EarthLinkData> {
  const snapshot = await loadSnapshot();
  const liveDonki = await tryLiveDonkiCount();

  const ephemeris = Array.isArray(snapshot.ephemeris) ? snapshot.ephemeris : [];
  const dayIndex = ephemeris.length > 0 ? (Math.max(1, missionDay) - 1) % ephemeris.length : -1;
  const entry = dayIndex >= 0 ? ephemeris[dayIndex] : null;

  const snapshotDate =
    typeof snapshot.fetchedAt === 'string' && snapshot.fetchedAt.length >= 10
      ? snapshot.fetchedAt.slice(0, 10)
      : 'unknown date';

  const source = liveDonki
    ? `NASA data snapshot, ${snapshotDate} · Live NASA DONKI`
    : typeof snapshot.source === 'string' && snapshot.source.length > 0
      ? snapshot.source
      : `NASA data snapshot, ${snapshotDate}`;

  return {
    oneWayDelayMin: entry
      ? entry.oneWayDelayMin
      : typeof snapshot.oneWayDelayMin === 'number'
        ? snapshot.oneWayDelayMin
        : 0,
    sunEarthMarsAngleDeg: entry
      ? entry.sunEarthMarsAngleDeg
      : typeof snapshot.sunEarthMarsAngleDeg === 'number'
        ? snapshot.sunEarthMarsAngleDeg
        : 0,
    solarEvents30d: liveDonki
      ? liveDonki.count
      : typeof snapshot.solarEvents30d === 'number'
        ? snapshot.solarEvents30d
        : null,
    fetchedAt: typeof snapshot.fetchedAt === 'string' ? snapshot.fetchedAt : 'Unavailable',
    ephemerisDate: entry?.date,
    source,
    placeholder: Boolean(snapshot.placeholder),
  };
}
