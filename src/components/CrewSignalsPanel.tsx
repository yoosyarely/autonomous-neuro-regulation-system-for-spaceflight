import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import {
  SIGNAL_DEFINITIONS,
  type EvaluationResult,
  type SignalId,
} from '../engine';

interface CrewSignalsPanelProps {
  evaluation: EvaluationResult;
  functionalLossToggle: boolean;
  previousCognitiveAdverseSD: number;
  simulatedResponseActive: boolean;
  onChangeSignal: (id: SignalId, value: number) => void;
  onToggleFunctionalLoss: (active: boolean) => void;
}

export function CrewSignalsPanel({
  evaluation,
  functionalLossToggle,
  previousCognitiveAdverseSD,
  simulatedResponseActive,
  onChangeSignal,
  onToggleFunctionalLoss,
}: CrewSignalsPanelProps) {
  return (
    <section
      aria-labelledby="crew-panel-heading"
      className="rounded-xl border border-[#253054] bg-[#141B33] p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#253054] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="crew-panel-heading"
              className="font-display text-lg font-semibold text-[#E6EDF7]"
            >
              Crew Member Biometrics &amp; Cognition
            </h2>
            <span className="text-xs font-medium text-[#A9B4CC]">· Simulated</span>
          </div>
          <p className="mt-1 text-xs text-[#A9B4CC]">
            Deviations are measured against personal pre-flight baseline. Only adverse direction contributes to neuro-load index.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums text-[#A9B4CC]">
          <span>
            5-night sleep avg:{' '}
            <strong
              className={
                evaluation.averageSleep5Nights < 5.0 ? 'text-[#F87171]' : 'text-[#E6EDF7]'
              }
            >
              {evaluation.averageSleep5Nights.toFixed(1)} hrs
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Prior cognition:{' '}
            <strong
              className={
                previousCognitiveAdverseSD >= 2.0 ? 'text-[#F87171]' : 'text-[#E6EDF7]'
              }
            >
              {previousCognitiveAdverseSD.toFixed(1)} SD adverse
            </strong>
          </span>
        </div>
      </div>

      {/* 7 Signal Controls */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SIGNAL_DEFINITIONS.map((def) => {
          const ev = evaluation.signals[def.id];
          const isElevated = ev.isAdverseThreshold || ev.exceedsAbsoluteThreshold;
          const isSevere = ev.adverseSD >= 2.0 || ev.exceedsAbsoluteThreshold;

          const toneClass = isSevere
            ? 'text-[#F87171]'
            : isElevated
              ? 'text-[#FBBF24]'
              : 'text-[#34D399]';

          const borderClass = isSevere
            ? 'border-[#F87171]/45'
            : isElevated
              ? 'border-[#FBBF24]/45'
              : 'border-[#253054]';

          const formattedVal = ev.value.toFixed(def.decimals);
          const formattedBase = def.baseline.toFixed(def.decimals);
          const signedLabel = `${ev.signedSD >= 0 ? '+' : ''}${ev.signedSD.toFixed(2)} SD`;

          return (
            <div
              key={def.id}
              className={`flex flex-col justify-between rounded-xl border bg-[#0B1020]/70 p-4 ${borderClass}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <label
                    htmlFor={`slider-${def.id}`}
                    className="font-display text-sm font-semibold text-[#E6EDF7]"
                  >
                    {def.label}
                  </label>
                  <span className="font-mono text-[11px] text-[#A9B4CC] whitespace-nowrap">
                    {def.isContinuous ? 'Continuous (10m)' : 'Per measurement'}
                  </span>
                </div>

                {/* Current Value & Baseline */}
                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <div className="font-mono text-2xl font-bold tabular-nums text-[#E6EDF7]">
                    {formattedVal}{' '}
                    <span className="text-xs font-normal text-[#A9B4CC]">{def.unit}</span>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums text-[#A9B4CC]">
                    Base: {formattedBase} ± {def.sd}
                  </div>
                </div>

                {/* Deviation Readout (icon + text, never hue alone) */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${toneClass}`}>
                    {isElevated ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {ev.adverseSD > 0
                        ? `${ev.adverseSD.toFixed(2)} SD adverse`
                        : `${signedLabel} (nominal)`}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-[#A9B4CC]">
                    Adverse: {def.adverseDirection === 'down' ? '↓ low' : '↑ high'}
                  </span>
                </div>

                {/* 10-min rule readout for continuous signals */}
                {def.isContinuous && ev.isAdverseThreshold && (
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#FBBF24]">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>
                      Sustained ≥1.5 SD: {ev.sustainedMinutes} min{' '}
                      {ev.sustainedMinutes >= 10 ? '(≥10m active)' : '(need 10m)'}
                    </span>
                  </div>
                )}

                {def.absoluteThreshold && (
                  <div className="mt-1 font-mono text-[11px] text-[#A9B4CC]">
                    Immediate yellow threshold: {def.absoluteThreshold.label}
                  </div>
                )}

                {simulatedResponseActive &&
                  (def.id === 'hrv' ||
                    def.id === 'heartRate' ||
                    def.id === 'respirationRate') && (
                    <div className="mt-1.5 font-mono text-[11px] text-[#5EEAD4]">
                      Simulated response:{' '}
                      {def.id === 'hrv' ? '↑ rising' : '↓ toward baseline'}
                    </div>
                  )}
              </div>

              {/* Slider Control */}
              <div className="mt-4">
                <input
                  id={`slider-${def.id}`}
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={ev.value}
                  aria-valuetext={`${formattedVal} ${def.unit}, ${ev.adverseSD.toFixed(1)} SD adverse`}
                  onChange={(e) => onChangeSignal(def.id, Number(e.target.value))}
                  className="telemetry-slider"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-[#A9B4CC]">
                  <span>{def.min}</span>
                  <span>{def.max}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Red Rule #4: Manual Functional Loss Toggle */}
        <div
          className={`flex flex-col justify-between rounded-xl border p-4 ${
            functionalLossToggle
              ? 'border-[#F87171]/70 bg-[#F87171]/12'
              : 'border-[#253054] bg-[#0B1020]/70'
          }`}
        >
          <div>
            <div className="flex items-start gap-2">
              <ShieldAlert
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  functionalLossToggle ? 'text-[#F87171]' : 'text-[#A9B4CC]'
                }`}
                aria-hidden="true"
              />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#E6EDF7]">
                  Functional loss override
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#A9B4CC]">
                  Critical procedure errors / risk to self or others. Escalates immediately to Red.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              role="switch"
              aria-checked={functionalLossToggle}
              onClick={() => onToggleFunctionalLoss(!functionalLossToggle)}
              className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                functionalLossToggle
                  ? 'border-[#F87171] bg-[#F87171] text-[#0B1020]'
                  : 'border-[#253054] bg-[#141B33] text-[#E6EDF7] hover:border-[#F87171]/60'
              }`}
            >
              <span className="text-left">
                Critical procedure errors / risk to self or others
              </span>
              <span className="ml-2 shrink-0 font-mono uppercase">
                {functionalLossToggle ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
