// AI-assisted code. See README: AI use disclosure.
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  Wind,
  Zap,
  Play,
  Square,
  CircleDashed,
  Activity,
  ShieldOff,
} from 'lucide-react';

interface CountermeasuresPanelProps {
  countermeasuresActive: boolean;
  countermeasuresNotEffective: boolean;
  onToggleNotEffective: (notEffective: boolean) => void;
  onActiveStateChange?: (isRunning: boolean) => void;
}

const INHALE_SEC = 4;
const HOLD_SEC = 4;
const EXHALE_SEC = 6;
const TOTAL_CYCLE_SEC = INHALE_SEC + HOLD_SEC + EXHALE_SEC; // 14s

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale';
type DeepPressureState = 'Inflating' | 'Holding' | 'Releasing';

function formatTimer(totalSec: number): string {
  const whole = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSynchronizedCycleState(totalSessionSec: number): {
  phase: BreathPhase;
  phaseRemainingSec: number;
  phaseProgress: number;
  cycleProgress: number;
  breathScale: number;
  pressurePct: number;
  pressureState: DeepPressureState;
} {
  const t = ((totalSessionSec % TOTAL_CYCLE_SEC) + TOTAL_CYCLE_SEC) % TOTAL_CYCLE_SEC;
  const isFirstOpeningBreath = totalSessionSec < INHALE_SEC + HOLD_SEC;

  let phase: BreathPhase;
  let phaseRemainingSec: number;
  let phaseProgress: number;
  let breathScale: number;

  if (t < INHALE_SEC) {
    const p = t / INHALE_SEC;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
    phase = 'Inhale';
    phaseRemainingSec = INHALE_SEC - t;
    phaseProgress = p;
    breathScale = 0.68 + 0.32 * eased;
  } else if (t < INHALE_SEC + HOLD_SEC) {
    const localT = t - INHALE_SEC;
    phase = 'Hold';
    phaseRemainingSec = HOLD_SEC - localT;
    phaseProgress = localT / HOLD_SEC;
    breathScale = 1.0;
  } else {
    const localT = t - INHALE_SEC - HOLD_SEC;
    const p = localT / EXHALE_SEC;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * p);
    phase = 'Exhale';
    phaseRemainingSec = EXHALE_SEC - localT;
    phaseProgress = p;
    breathScale = 1.0 - 0.32 * eased;
  }

  // Deep pressure synced to the same clock as breathing:
  // Rises during Exhale (Inflating 0->100% over 4s, Holding 100% for 2s),
  // Releases during Inhale (Releasing 100->0% over 4s, resting at 0% during Hold).
  let pressurePct = 0;
  let pressureState: DeepPressureState = 'Releasing';

  if (t < INHALE_SEC) {
    pressureState = 'Releasing';
    if (isFirstOpeningBreath) {
      pressurePct = 0;
    } else {
      const p = t / INHALE_SEC;
      const releaseEase = 0.5 * (1 + Math.cos(Math.PI * p));
      pressurePct = 100 * releaseEase;
    }
  } else if (t < INHALE_SEC + HOLD_SEC) {
    pressureState = 'Releasing';
    pressurePct = 0;
  } else if (t < INHALE_SEC + HOLD_SEC + 4) {
    const localT = t - (INHALE_SEC + HOLD_SEC);
    const p = localT / 4;
    const inflateEase = 0.5 - 0.5 * Math.cos(Math.PI * p);
    pressureState = 'Inflating';
    pressurePct = 100 * inflateEase;
  } else {
    pressureState = 'Holding';
    pressurePct = 100;
  }

  return {
    phase,
    phaseRemainingSec,
    phaseProgress,
    cycleProgress: t / TOTAL_CYCLE_SEC,
    breathScale,
    pressurePct,
    pressureState,
  };
}

export function CountermeasuresPanel({
  countermeasuresActive,
  countermeasuresNotEffective,
  onToggleNotEffective,
  onActiveStateChange,
}: CountermeasuresPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const [manualSessionOverride, setManualSessionOverride] = useState<boolean | null>(null);
  const [sessionSec, setSessionSec] = useState<number>(0);

  const isSessionRunning =
    manualSessionOverride !== null ? manualSessionOverride : countermeasuresActive;

  useEffect(() => {
    setManualSessionOverride(null);
    if (!countermeasuresActive) {
      setSessionSec(0);
    }
  }, [countermeasuresActive]);

  useEffect(() => {
    onActiveStateChange?.(isSessionRunning);
  }, [isSessionRunning, onActiveStateChange]);

  useEffect(() => {
    if (!isSessionRunning) return;
    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setSessionSec((prev) => prev + dt);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isSessionRunning]);

  const cycle = getSynchronizedCycleState(sessionSec);
  const activePressurePct = isSessionRunning ? cycle.pressurePct : 0;
  const activePressureState: DeepPressureState = isSessionRunning
    ? cycle.pressureState
    : 'Releasing';

  const ringRadius = 52;
  const ringCirc = 2 * Math.PI * ringRadius;
  const vestScale = prefersReducedMotion ? 1 : 1 + 0.085 * (activePressurePct / 100);

  const handleStartSession = () => {
    setManualSessionOverride(true);
  };

  const handleStopSession = () => {
    setManualSessionOverride(false);
    setSessionSec(0);
  };

  return (
    <section
      aria-labelledby="countermeasures-heading"
      className="flex flex-col gap-4 rounded-xl border border-[#253054] bg-[#141B33] p-5 sm:p-6"
    >
      {/* Header with single synchronized Start session / Stop controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="countermeasures-heading"
            className="font-display text-lg font-semibold text-[#E6EDF7]"
          >
            Countermeasures
          </h2>
          <p className="mt-0.5 text-xs text-[#A9B4CC]">
            Synchronized session · Private on device
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartSession}
            disabled={isSessionRunning}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-opacity ${
              isSessionRunning
                ? 'cursor-default border border-[#5EEAD4]/40 bg-[#5EEAD4]/15 text-[#5EEAD4]'
                : 'bg-[#5EEAD4] text-[#0B1020] hover:opacity-90'
            }`}
          >
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Start session</span>
          </button>

          <button
            type="button"
            onClick={handleStopSession}
            disabled={!isSessionRunning}
            aria-label="Stop countermeasure session"
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              isSessionRunning
                ? 'border-[#F87171]/70 bg-[#F87171] text-[#0B1020] hover:opacity-90'
                : 'border-[#253054] bg-[#0B1020] text-[#A9B4CC] opacity-60'
            }`}
          >
            <Square className="h-3 w-3 shrink-0 fill-current" aria-hidden="true" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Haptic Breathing Guide */}
      <div className="flex flex-col items-center rounded-xl border border-[#253054] bg-[#0B1020]/70 px-4 py-4">
        <div className="flex items-center gap-2 text-xs font-medium text-[#5EEAD4]">
          <Wind className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Haptic breathing guide</span>
        </div>

        <div className="relative mt-3 flex h-32 w-32 items-center justify-center">
          <svg
            viewBox="0 0 132 132"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="66"
              cy="66"
              r={ringRadius}
              fill="none"
              stroke="#222D4F"
              strokeWidth="4"
            />
            <circle
              cx="66"
              cy="66"
              r={ringRadius}
              fill="none"
              stroke="#5EEAD4"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringCirc * (1 - (isSessionRunning ? cycle.cycleProgress : 0))}
            />
          </svg>

          <div
            className="flex h-22 w-22 flex-col items-center justify-center rounded-full border border-[#5EEAD4]/60 bg-[#5EEAD4]/18 text-center"
            style={
              prefersReducedMotion
                ? undefined
                : {
                    transform: `scale(${isSessionRunning ? cycle.breathScale.toFixed(4) : 0.78})`,
                    willChange: 'transform',
                  }
            }
          >
            <span className="font-display text-sm font-bold text-[#E6EDF7]">
              {isSessionRunning ? cycle.phase : 'Standby'}
            </span>
            <span className="mt-0.5 font-mono text-xs tabular-nums text-[#5EEAD4]">
              {isSessionRunning ? `${cycle.phaseRemainingSec.toFixed(1)} s` : 'Ready'}
            </span>
          </div>
        </div>

        <div className="mt-2.5 w-full max-w-[220px]">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#222D4F]"
            role="progressbar"
            aria-label="Breathing phase progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isSessionRunning ? Math.round(cycle.phaseProgress * 100) : 0}
          >
            <div
              className="h-full bg-[#5EEAD4]"
              style={{
                width: isSessionRunning ? `${Math.round(cycle.phaseProgress * 100)}%` : '0%',
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[11px] tabular-nums text-[#A9B4CC]">
            <span>Inhale 4s</span>
            <span aria-hidden="true">·</span>
            <span>Hold 4s</span>
            <span aria-hidden="true">·</span>
            <span>Exhale 6s</span>
          </div>
        </div>
      </div>

      {/* Deep Pressure (concept) Visual Simulation — synced to breathing clock */}
      <div className="rounded-xl border border-[#253054] bg-[#0B1020]/70 p-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-[#E6EDF7]">
            Deep pressure (concept)
          </h3>
          <p className="text-[11px] text-[#A9B4CC]">
            Gentle pressure on exhale · Release on inhale
          </p>
        </div>

        {/* Vest Outline Animation + Pressure Gauge */}
        <div className="mt-3 grid grid-cols-12 items-center gap-3">
          {/* Simple Vest Outline */}
          <div className="col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#253054]/80 bg-[#141B33]/50 py-3">
            <svg
              viewBox="0 0 100 108"
              className="h-24 w-24"
              role="img"
              aria-label={`Deep pressure vest outline currently ${activePressureState.toLowerCase()} at ${Math.round(activePressurePct)} percent of set level`}
              style={
                prefersReducedMotion
                  ? undefined
                  : {
                      transform: `scale(${vestScale.toFixed(4)})`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                    }
              }
            >
              {/* Vest Outer Silhouette */}
              <path
                d="M 28 12 L 39 12 L 43 24 Q 50 30 57 24 L 61 12 L 72 12 L 78 28 Q 71 38 73 52 L 76 92 Q 50 97 24 92 L 27 52 Q 29 38 22 28 Z"
                fill="#5EEAD4"
                fillOpacity={0.07 + 0.24 * (activePressurePct / 100)}
                stroke="#5EEAD4"
                strokeWidth={1.8 + 1.2 * (activePressurePct / 100)}
                strokeLinejoin="round"
              />
              {/* Center Seam */}
              <line
                x1="50"
                y1="27"
                x2="50"
                y2="94"
                stroke="#5EEAD4"
                strokeOpacity="0.45"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              {/* Left & Right Pneumatic Chambers */}
              <rect
                x="30"
                y="42"
                width="15"
                height="36"
                rx="4"
                fill="#5EEAD4"
                fillOpacity={0.08 + 0.35 * (activePressurePct / 100)}
                stroke="#5EEAD4"
                strokeOpacity="0.6"
                strokeWidth="1"
              />
              <rect
                x="55"
                y="42"
                width="15"
                height="36"
                rx="4"
                fill="#5EEAD4"
                fillOpacity={0.08 + 0.35 * (activePressurePct / 100)}
                stroke="#5EEAD4"
                strokeOpacity="0.6"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* State, Percentage Gauge, Session Timer */}
          <div className="col-span-7 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#A9B4CC]">State</span>
              <span
                className={`font-mono font-semibold ${
                  !isSessionRunning
                    ? 'text-[#A9B4CC]'
                    : activePressureState === 'Inflating'
                      ? 'text-[#5EEAD4]'
                      : activePressureState === 'Holding'
                        ? 'text-[#A78BFA]'
                        : 'text-[#E6EDF7]'
                }`}
              >
                {isSessionRunning ? activePressureState : 'Releasing'}
              </span>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-[#A9B4CC]">Pressure</span>
                <span className="font-mono text-base font-bold tabular-nums text-[#E6EDF7]">
                  {Math.round(activePressurePct)}%{' '}
                  <span className="text-[11px] font-normal text-[#A9B4CC]">of set level</span>
                </span>
              </div>
              <div
                className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#222D4F]"
                role="progressbar"
                aria-label="Deep pressure percentage of set level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(activePressurePct)}
              >
                <div
                  className="h-full rounded-full bg-[#5EEAD4]"
                  style={{ width: `${Math.round(activePressurePct)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#253054] pt-2 text-xs">
              <span className="text-[#A9B4CC]">Session timer</span>
              <span className="font-mono font-semibold tabular-nums text-[#E6EDF7]">
                {formatTimer(sessionSec)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* taVNS stimulation (concept) - Always idle/concept, no intensity controls */}
      <div className="flex items-center justify-between rounded-lg border border-[#253054] bg-[#0B1020]/60 px-3.5 py-2.5">
        <div className="flex items-start gap-2.5">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#A78BFA]" aria-hidden="true" />
          <div>
            <div className="text-sm font-medium text-[#E6EDF7]">
              taVNS stimulation (concept)
            </div>
            <div className="text-[11px] text-[#A9B4CC]">
              Auricular vagus nerve modulation
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#A9B4CC]">
          <CircleDashed className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>idle</span>
        </span>
      </div>

      {/* Simulated Response & Refractory Toggle */}
      <div className="rounded-xl border border-[#253054] bg-[#0B1020]/60 p-3.5 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF7]">
            <Activity className="h-4 w-4 shrink-0 text-[#5EEAD4]" aria-hidden="true" />
            <span>Simulated response</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#A9B4CC]">
            {countermeasuresNotEffective
              ? 'Signals are locked against recovery to demonstrate the 72-hour refractory escalation.'
              : isSessionRunning
                ? 'Active: heart rate and respiration are drifting gradually toward baseline while HRV rises.'
                : 'Standby: heart rate, respiration, and HRV respond gradually when a session is active.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={countermeasuresNotEffective}
          onClick={() => onToggleNotEffective(!countermeasuresNotEffective)}
          className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            countermeasuresNotEffective
              ? 'border-[#FBBF24] bg-[#FBBF24] text-[#0B1020]'
              : 'border-[#253054] bg-[#141B33] text-[#E6EDF7] hover:border-[#FBBF24]/60'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 text-left">
            <ShieldOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Countermeasures not effective</span>
          </span>
          <span className="shrink-0 font-mono uppercase">
            {countermeasuresNotEffective ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </section>
  );
}
