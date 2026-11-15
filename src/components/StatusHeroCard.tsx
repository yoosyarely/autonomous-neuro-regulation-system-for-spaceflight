import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Lock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { AlertLevel, EvaluationResult } from '../engine';

interface StatusHeroCardProps {
  evaluation: EvaluationResult;
  missionDay: number;
  hoursInYellow: number;
}

const LEVEL_CONFIG: Record<
  AlertLevel,
  {
    word: string;
    subtitle: string;
    colorHex: string;
    borderClass: string;
    surfaceTintClass: string;
    textClass: string;
    Icon: typeof ShieldCheck;
  }
> = {
  GREEN: {
    word: 'GREEN',
    subtitle: 'Nominal',
    colorHex: '#34D399',
    borderClass: 'border-[#34D399]/40',
    surfaceTintClass: 'bg-[#34D399]/10',
    textClass: 'text-[#34D399]',
    Icon: ShieldCheck,
  },
  YELLOW: {
    word: 'YELLOW',
    subtitle: 'Autonomous Countermeasures',
    colorHex: '#FBBF24',
    borderClass: 'border-[#FBBF24]/45',
    surfaceTintClass: 'bg-[#FBBF24]/10',
    textClass: 'text-[#FBBF24]',
    Icon: AlertTriangle,
  },
  RED: {
    word: 'RED',
    subtitle: 'Critical Escalation',
    colorHex: '#F87171',
    borderClass: 'border-[#F87171]/55',
    surfaceTintClass: 'bg-[#F87171]/12',
    textClass: 'text-[#F87171]',
    Icon: OctagonAlert,
  },
};

export function StatusHeroCard({
  evaluation,
  missionDay,
  hoursInYellow,
}: StatusHeroCardProps) {
  const cfg = LEVEL_CONFIG[evaluation.level];
  const StatusIcon = cfg.Icon;

  const recentTrend = evaluation.trendSeries.slice(-7);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calibrated arc gauge math (240 degree sweep)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 240 / 360;
  const totalArcLength = circumference * arcFraction;
  const filledLength = totalArcLength * (evaluation.index / 100);

  // SVG trend chart geometry
  const chartW = 520;
  const chartH = 148;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const pointCoords = recentTrend.map((pt, i) => {
    const x =
      recentTrend.length === 1
        ? padL + plotW / 2
        : padL + (i / (recentTrend.length - 1)) * plotW;
    const y = padT + (1 - Math.min(100, Math.max(0, pt.index)) / 100) * plotH;
    return { ...pt, x, y };
  });

  const polylinePoints = pointCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    pointCoords.length > 0
      ? `M ${pointCoords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} ` +
        pointCoords.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L ${pointCoords[pointCoords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
      : '';

  const yellowLineY = padT + (1 - 50 / 100) * plotH;
  const activePoint =
    hoveredIdx !== null && pointCoords[hoveredIdx]
      ? pointCoords[hoveredIdx]
      : pointCoords[pointCoords.length - 1];

  return (
    <section
      aria-labelledby="status-card-heading"
      className={`rounded-xl border bg-[#141B33] p-5 sm:p-6 ${cfg.borderClass}`}
    >
      {/* Top Status Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-medium tracking-wide text-[#A9B4CC]">
            Onboard Neuro-Regulation Status · Day {missionDay}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2.5 rounded-lg border px-3.5 py-2 ${cfg.borderClass} ${cfg.surfaceTintClass}`}
            >
              <StatusIcon className={`h-6 w-6 shrink-0 ${cfg.textClass}`} aria-hidden="true" />
              <h2
                id="status-card-heading"
                className={`font-display text-2xl font-bold tracking-tight ${cfg.textClass}`}
              >
                {cfg.word}
              </h2>
            </div>
            <span className="font-display text-lg font-semibold text-[#E6EDF7]">
              {cfg.subtitle}
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-[#E6EDF7]">
            {evaluation.monitoringAction}
          </p>
        </div>

        {/* Peak SD / Yellow Duration Telemetry */}
        <div className="flex shrink-0 flex-row gap-4 border-t border-[#253054] pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <div className="text-xs text-[#A9B4CC]">Worst adverse deviation</div>
            <div className="font-mono text-lg font-semibold tabular-nums text-[#E6EDF7]">
              {evaluation.worstAdverseSD.toFixed(2)} SD
            </div>
          </div>
          {evaluation.level !== 'GREEN' && (
            <div className="text-left sm:text-right">
              <div className="text-xs text-[#A9B4CC]">Sustained non-improving</div>
              <div className="font-mono text-sm font-medium tabular-nums text-[#FBBF24]">
                {hoursInYellow.toFixed(1)} / 72.0 hrs
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Worsening Private Pre-Warning (Astronaut Only) */}
      {evaluation.worseningPreWarning && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
          className="mt-5 rounded-lg border border-[#A78BFA]/55 bg-[#A78BFA]/12 p-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#A78BFA]" aria-hidden="true" />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#A78BFA]">
                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Private trend warning · Stays on this device</span>
              </div>
              <p className="mt-1 font-display text-base font-semibold text-[#E6EDF7]">
                If this continues, the crew will be notified.
              </p>
              <p className="mt-1 text-xs text-[#A9B4CC]">
                Neuro-load index has increased for three consecutive days while in yellow. Nothing has been transmitted off-device.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Center Telemetry Core: 0-100 Index Gauge + Trigger Reason Breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-[#253054] pt-6 md:grid-cols-12 md:items-center">
        {/* Calibrated 0-100 Index Gauge */}
        <div className="flex flex-col items-center justify-center md:col-span-5">
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="h-full w-full"
              role="img"
              aria-label={`Neuro-load index ${evaluation.index} out of 100`}
            >
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#222D4F"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${totalArcLength} ${circumference}`}
                transform="rotate(150 80 80)"
              />
              {/* Calibrated Progress Arc */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={cfg.colorHex}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${totalArcLength} ${circumference}`}
                initial={false}
                animate={{ strokeDashoffset: totalArcLength - filledLength }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                transform="rotate(150 80 80)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 text-center">
              <span className="text-xs font-medium text-[#A9B4CC]">Neuro-Load Index</span>
              <span className="mt-0.5 font-mono text-4xl font-bold tabular-nums text-[#E6EDF7]">
                {evaluation.index}
              </span>
              <span className="font-mono text-xs tabular-nums text-[#A9B4CC]">
                0 – 100 scale
              </span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3 font-mono text-xs tabular-nums text-[#A9B4CC]">
            <span>0 SD = 0</span>
            <span aria-hidden="true">·</span>
            <span>1.5 SD = 50</span>
            <span aria-hidden="true">·</span>
            <span>3.0 SD = 100</span>
          </div>
        </div>

        {/* Reason for Current Level */}
        <div className="md:col-span-7">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#A9B4CC]">
            <Activity className="h-4 w-4 text-[#5EEAD4]" aria-hidden="true" />
            <span>Evaluation rationale</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {evaluation.reasons.map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-[#253054] bg-[#0B1020]/70 px-3.5 py-2.5 text-sm leading-relaxed text-[#E6EDF7]"
              >
                <StatusIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.textClass}`}
                  aria-hidden="true"
                />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {evaluation.level !== 'GREEN' && evaluation.pendingContinuousSignals.length > 0 && (
            <p className="mt-3 text-xs text-[#A9B4CC]">
              Pending 10-minute verification: {evaluation.pendingContinuousSignals.join(' ')}
            </p>
          )}
        </div>
      </div>

      {/* Multi-Day Trend Chart */}
      <div className="mt-6 border-t border-[#253054] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-[#E6EDF7]">
              7-Day Index Trend
            </h3>
            <p className="text-xs text-[#A9B4CC]">
              Daily onboard evaluation · Dashed line marks 1.5 SD threshold (index 50)
            </p>
          </div>
          {activePoint && (
            <div className="font-mono text-xs tabular-nums text-[#E6EDF7]">
              Day {activePoint.day}: <span className="font-semibold">{activePoint.index}/100</span> ({activePoint.level})
            </div>
          )}
        </div>

        <div className="mt-3 w-full overflow-hidden rounded-lg border border-[#253054] bg-[#0B1020]/60 p-2">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-40 w-full"
            role="img"
            aria-label={`Index trend across last ${recentTrend.length} days, currently ${evaluation.index} on Day ${missionDay}`}
          >
            <defs>
              <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.colorHex} stopOpacity="0.28" />
                <stop offset="100%" stopColor={cfg.colorHex} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y-axis reference lines (0, 50, 100) */}
            {[100, 50, 0].map((val) => {
              const y = padT + (1 - val / 100) * plotH;
              const isThreshold = val === 50;
              return (
                <g key={val}>
                  <line
                    x1={padL}
                    x2={chartW - padR}
                    y1={y}
                    y2={y}
                    stroke={isThreshold ? '#FBBF24' : '#253054'}
                    strokeOpacity={isThreshold ? 0.55 : 0.8}
                    strokeWidth="1"
                    strokeDasharray={isThreshold ? '4 4' : undefined}
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[#A9B4CC] font-mono text-[10px]"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#trendAreaFill)" />}

            {/* Trend Polyline */}
            {pointCoords.length > 1 && (
              <polyline
                fill="none"
                stroke={cfg.colorHex}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polylinePoints}
              />
            )}

            {/* Interactive Day Nodes */}
            {pointCoords.map((pt, i) => {
              const ptColor = LEVEL_CONFIG[pt.level].colorHex;
              const isSelected = hoveredIdx === i || (hoveredIdx === null && i === pointCoords.length - 1);
              return (
                <g
                  key={pt.day}
                  tabIndex={0}
                  role="button"
                  aria-label={`Day ${pt.day}, index ${pt.index}, status ${pt.level}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onFocus={() => setHoveredIdx(i)}
                  onBlur={() => setHoveredIdx(null)}
                  className="cursor-pointer focus:outline-none"
                >
                  <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 4}
                    fill="#0B1020"
                    stroke={ptColor}
                    strokeWidth="2.5"
                  />
                  <text
                    x={pt.x}
                    y={chartH - 7}
                    textAnchor="middle"
                    className="fill-[#A9B4CC] font-mono text-[10px]"
                  >
                    D{pt.day}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
