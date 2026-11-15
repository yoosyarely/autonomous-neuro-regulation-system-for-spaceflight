// AI-assisted code. See README: AI use disclosure.
import { Radio, AlertTriangle, CheckCircle2, Sun, RefreshCw } from 'lucide-react';
import type { MissionType } from '../engine';
import { getLinkStatus, type EarthLinkData } from '../nasa';

interface EarthLinkPanelProps {
  mission: MissionType;
  data: EarthLinkData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatUtcDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function EarthLinkPanel({
  mission,
  data,
  loading,
  error,
  onRetry,
}: EarthLinkPanelProps) {
  const isMoon = mission === 'Moon';
  const linkInfo = data ? getLinkStatus(data.sunEarthMarsAngleDeg) : null;

  const linkToneClasses =
    linkInfo?.category === 'conjunction'
      ? 'text-[#F87171]'
      : linkInfo?.category === 'degraded'
        ? 'text-[#FBBF24]'
        : 'text-[#34D399]';

  const LinkIcon =
    linkInfo?.category === 'conjunction'
      ? AlertTriangle
      : linkInfo?.category === 'degraded'
        ? AlertTriangle
        : CheckCircle2;

  // Compute orbital diagram coordinates for Sun-Earth-Mars angle
  const angleRad = ((data?.sunEarthMarsAngleDeg ?? 45) * Math.PI) / 180;
  const sunX = 110;
  const sunY = 58;
  const earthX = sunX + 38;
  const earthY = sunY;
  const marsR = 56;
  // Angle at Sun-Earth-Mars or Sun-centered display: represent Sun-Earth-Mars geometry clearly
  const marsX = sunX - Math.cos(angleRad) * marsR;
  const marsY = sunY - Math.sin(angleRad) * marsR;

  return (
    <section
      aria-labelledby="earth-link-heading"
      className="rounded-xl border border-[#253054] bg-[#141B33] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="earth-link-heading"
              className="font-display text-lg font-semibold text-[#E6EDF7]"
            >
              Earth Link
            </h2>
            <span className="text-xs font-medium text-[#A9B4CC]">· NASA data</span>
          </div>
          {data && (
            <div className="mt-1 space-y-0.5">
              <p className="font-mono text-xs text-[#A9B4CC]">
                Ephemeris date (UTC): {data.ephemerisDate}
              </p>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${
                  data.ephemerisOrigin === 'live'
                    ? 'border-[#34D399]/50 bg-[#34D399]/10 text-[#34D399]'
                    : 'border-[#253054] bg-[#0B1020]/80 text-[#A9B4CC]'
                }`}
              >
                {data.ephemerisLabel}
              </span>
            </div>
          )}
        </div>

        {data?.placeholder && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded border border-[#FBBF24]/60 bg-[#FBBF24]/15 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-[#FBBF24]"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>PLACEHOLDER DATA</span>
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-5 space-y-3" aria-busy="true">
          <div className="h-12 animate-pulse rounded-lg bg-[#0B1020]/70" />
          <div className="h-12 animate-pulse rounded-lg bg-[#0B1020]/70" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-lg border border-[#F87171]/50 bg-[#F87171]/10 p-4">
          <p className="text-sm text-[#F87171]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#253054] bg-[#0B1020] px-3 py-1.5 text-xs font-semibold text-[#E6EDF7] hover:border-[#5EEAD4]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry load</span>
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="mt-4 space-y-4">
          {isMoon ? (
            <div className="rounded-lg border border-[#5EEAD4]/35 bg-[#5EEAD4]/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#5EEAD4]">
                <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Delay: seconds, not minutes</span>
              </div>
              <p className="mt-1 text-xs text-[#A9B4CC]">
                Lunar proximity enables near-real-time voice and telemetry exchange with Houston (~1.3 s one-way). Solar conjunction status is hidden for Moon missions.
              </p>
            </div>
          ) : (
            <>
              {/* Delay Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#253054] bg-[#0B1020]/60 p-3">
                  <div className="text-xs text-[#A9B4CC]">One-way delay</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#E6EDF7]">
                    {data.oneWayDelayMin.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-[#A9B4CC]">min</span>
                  </div>
                </div>
                <div className="rounded-lg border border-[#253054] bg-[#0B1020]/60 p-3">
                  <div className="text-xs text-[#A9B4CC]">Round-trip delay</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#E6EDF7]">
                    {(data.oneWayDelayMin * 2).toFixed(1)}{' '}
                    <span className="text-xs font-normal text-[#A9B4CC]">min</span>
                  </div>
                </div>
              </div>

              {/* Sun-Earth-Mars Angle & Geometric Diagram */}
              <div className="rounded-lg border border-[#253054] bg-[#0B1020]/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#A9B4CC]">Sun–Earth–Mars angle</div>
                    <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-[#E6EDF7]">
                      {data.sunEarthMarsAngleDeg.toFixed(1)}°
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 220 96"
                    className="h-20 w-44 shrink-0"
                    role="img"
                    aria-label={`Geometry diagram showing Sun-Earth-Mars angle of ${data.sunEarthMarsAngleDeg} degrees`}
                  >
                    {/* Mars orbital arc */}
                    <circle
                      cx={sunX}
                      cy={sunY}
                      r={marsR}
                      fill="none"
                      stroke="#253054"
                      strokeDasharray="3 3"
                    />
                    {/* Line of sight Earth -> Mars */}
                    <line
                      x1={earthX}
                      y1={earthY}
                      x2={marsX}
                      y2={marsY}
                      stroke="#5EEAD4"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                    {/* Sun */}
                    <circle cx={sunX} cy={sunY} r="7" fill="#FBBF24" />
                    <text
                      x={sunX}
                      y={sunY + 17}
                      textAnchor="middle"
                      className="fill-[#A9B4CC] font-mono text-[9px]"
                    >
                      Sun
                    </text>
                    {/* Earth */}
                    <circle cx={earthX} cy={earthY} r="4.5" fill="#5EEAD4" />
                    <text
                      x={earthX + 8}
                      y={earthY + 3}
                      className="fill-[#E6EDF7] font-mono text-[9px]"
                    >
                      Earth
                    </text>
                    {/* Mars */}
                    <circle cx={marsX} cy={marsY} r="4" fill="#F87171" />
                    <text
                      x={marsX - 6}
                      y={marsY - 7}
                      textAnchor="end"
                      className="fill-[#E6EDF7] font-mono text-[9px]"
                    >
                      Mars
                    </text>
                  </svg>
                </div>

                {/* Link Status (word + icon, never color alone) */}
                {linkInfo && (
                  <div className="mt-3 flex items-center gap-2 border-t border-[#253054] pt-2.5 text-sm font-medium">
                    <LinkIcon className={`h-4 w-4 shrink-0 ${linkToneClasses}`} aria-hidden="true" />
                    <span className={linkToneClasses}>{linkInfo.label}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Solar Activity (both Mars and Moon) */}
          <div className="rounded-lg border border-[#253054] bg-[#0B1020]/60 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-[#A9B4CC]">
                <Sun className="h-4 w-4 shrink-0 text-[#FBBF24]" aria-hidden="true" />
                <span>Recent solar activity (30d)</span>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#E6EDF7]">
                {data.solarEvents30d === null ? 'data unavailable' : `${data.solarEvents30d} events`}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#A9B4CC]">DONKI feed</span>
              <span
                className={`font-mono font-medium ${
                  data.solarOrigin === 'live' ? 'text-[#34D399]' : 'text-[#A9B4CC]'
                }`}
              >
                {data.solarLabel}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#A9B4CC]">Source: {data.source}</p>
        </div>
      )}
    </section>
  );
}
