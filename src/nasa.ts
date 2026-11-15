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

export type DataOriginKind = 'live' | 'snapshot';

export interface EarthLinkData {
  oneWayDelayMin: number;
  sunEarthMarsAngleDeg: number;
  solarEvents30d: number | null;
  fetchedAt: string;
  ephemerisDate: string;
  ephemerisOrigin: DataOriginKind;
  ephemerisLabel: string;
  solarOrigin: DataOriginKind;
  solarLabel: string;
  source: string;
  placeholder?: boolean;
}

export type LinkStatusCategory = 'conjunction' | 'degraded' | 'nominal';

export interface LinkStatusInfo {
  label: string;
  category: LinkStatusCategory;
}

const SNAPSHOT_STORAGE_KEY = 'anrs_nasa_snapshot_v1';
const HORIZONS_LIVE_PREFIX = 'anrs_horizons_live_v1_';
const DONKI_LIVE_KEY = 'anrs_donki_live_v3';
const LIVE_TIMEOUT_MS = 5000;
const BASELINE_MISSION_DAY = 142;

let memorySnapshot: NasaSnapshot | null = null;
const memoryHorizonsLive = new Map<string, { fetchedAt: string; entry: EphemerisEntry }>();
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

function getUtcDateWithOffset(offsetDays: number, now: Date = new Date()): string {
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + offsetDays,
  );
  return new Date(utcMidnight).toISOString().slice(0, 10);
}

function formatLiveLabel(fetchedAtIso: string): string {
  const hhmm = fetchedAtIso.length >= 16 ? fetchedAtIso.slice(11, 16) : '00:00';
  return `Live NASA data (fetched ${hhmm} UTC)`;
}

function formatSnapshotLabel(snapshotDate: string): string {
  return `NASA data snapshot (${snapshotDate})`;
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

async function tryLiveHorizons(
  targetDate: string,
  stopDate: string,
): Promise<{ fetchedAt: string; entry: EphemerisEntry } | null> {
  const mem = memoryHorizonsLive.get(targetDate);
  if (mem) return mem;

  const cacheKey = `${HORIZONS_LIVE_PREFIX}${targetDate}`;
  const cached = readSessionJson<{ fetchedAt: string; entry: EphemerisEntry }>(cacheKey);
  if (cached && cached.entry && typeof cached.entry.oneWayDelayMin === 'number') {
    memoryHorizonsLive.set(targetDate, cached);
    return cached;
  }

  try {
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${normalizedBase}api/horizons?start=${encodeURIComponent(targetDate)}&stop=${encodeURIComponent(stopDate)}`;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) return null;

      const json = (await res.json()) as {
        fetchedAt?: string;
        rows?: EphemerisEntry[];
      };

      const rows = Array.isArray(json.rows) ? json.rows : [];
      const entry = rows.find((r) => r.date === targetDate) ?? rows[0];
      if (!entry || typeof entry.oneWayDelayMin !== 'number') return null;

      const result = {
        fetchedAt: typeof json.fetchedAt === 'string' ? json.fetchedAt : new Date().toISOString(),
        entry,
      };
      memoryHorizonsLive.set(targetDate, result);
      writeSessionJson(cacheKey, result);
      return result;
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function tryLiveDonki(): Promise<{ count: number; fetchedAt: string } | null> {
  if (memoryDonkiLive !== undefined) return memoryDonkiLive;

  const cached = readSessionJson<{ count: number; fetchedAt: string }>(DONKI_LIVE_KEY);
  if (cached && typeof cached.count === 'number') {
    memoryDonkiLive = cached;
    return cached;
  }

  try {
    const startDate = getUtcDateWithOffset(-30);
    const endDate = getUtcDateWithOffset(0);
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

    try {
      const feeds = ['FLR', 'SEP', 'GST'] as const;
      const responses = await Promise.all(
        feeds.map((type) =>
          fetch(
            `${normalizedBase}api/donki?type=${type}&startDate=${startDate}&endDate=${endDate}`,
            { signal: controller.signal },
          ).catch(() => null),
        ),
      );

      let anyOk = false;
      let count = 0;

      for (const res of responses) {
        if (!res || !res.ok) continue;
        const ct = res.headers.get('content-type') ?? '';
        if (!ct.includes('application/json')) continue;
        const json = (await res.json()) as { count?: number };
        if (typeof json.count === 'number') {
          anyOk = true;
          count += json.count;
        }
      }

      if (!anyOk) {
        memoryDonkiLive = null;
        return null;
      }

      const result = { count, fetchedAt: new Date().toISOString() };
      memoryDonkiLive = result;
      writeSessionJson(DONKI_LIVE_KEY, result);
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
 * Fetches Earth-spacecraft link telemetry for the current UTC date (+ simulated mission day offset).
 * Attempts live calls via the stateless /api/horizons and /api/donki proxy (5s timeout, session cache),
 * falling back cleanly to public/nasa-snapshot.json if unavailable.
 */
export async function getEarthLink(missionDay: number): Promise<EarthLinkData> {
  const dayOffset = missionDay - BASELINE_MISSION_DAY;
  const targetDate = getUtcDateWithOffset(dayOffset);
  const stopDate = getUtcDateWithOffset(dayOffset + 2);

  const [snapshot, liveHorizons, liveDonki] = await Promise.all([
    loadSnapshot(),
    tryLiveHorizons(targetDate, stopDate),
    tryLiveDonki(),
  ]);

  const snapshotDate =
    typeof snapshot.fetchedAt === 'string' && snapshot.fetchedAt.length >= 10
      ? snapshot.fetchedAt.slice(0, 10)
      : 'unknown date';

  let ephemerisEntry: EphemerisEntry | null = liveHorizons?.entry ?? null;
  if (!ephemerisEntry) {
    const ephemeris = Array.isArray(snapshot.ephemeris) ? snapshot.ephemeris : [];
    ephemerisEntry = ephemeris.find((row) => row.date === targetDate) ?? null;
    if (!ephemerisEntry && ephemeris.length > 0) {
      const idx = Math.max(0, dayOffset) % ephemeris.length;
      ephemerisEntry = ephemeris[idx];
    }
  }

  const ephemerisOrigin: DataOriginKind = liveHorizons ? 'live' : 'snapshot';
  const ephemerisLabel = liveHorizons
    ? formatLiveLabel(liveHorizons.fetchedAt)
    : formatSnapshotLabel(snapshotDate);

  const solarOrigin: DataOriginKind = liveDonki ? 'live' : 'snapshot';
  const solarLabel = liveDonki
    ? formatLiveLabel(liveDonki.fetchedAt)
    : formatSnapshotLabel(snapshotDate);

  return {
    oneWayDelayMin: ephemerisEntry
      ? ephemerisEntry.oneWayDelayMin
      : typeof snapshot.oneWayDelayMin === 'number'
        ? snapshot.oneWayDelayMin
        : 0,
    sunEarthMarsAngleDeg: ephemerisEntry
      ? ephemerisEntry.sunEarthMarsAngleDeg
      : typeof snapshot.sunEarthMarsAngleDeg === 'number'
        ? snapshot.sunEarthMarsAngleDeg
        : 0,
    solarEvents30d: liveDonki
      ? liveDonki.count
      : typeof snapshot.solarEvents30d === 'number'
        ? snapshot.solarEvents30d
        : null,
    fetchedAt: liveHorizons?.fetchedAt ?? snapshot.fetchedAt ?? 'Unavailable',
    ephemerisDate: ephemerisEntry?.date ?? targetDate,
    ephemerisOrigin,
    ephemerisLabel,
    solarOrigin,
    solarLabel,
    source: ephemerisLabel,
    placeholder: Boolean(snapshot.placeholder),
  };
}
