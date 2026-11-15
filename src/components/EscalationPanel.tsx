import { OctagonAlert, Lock, Radio, ShieldCheck } from 'lucide-react';
import type { EvaluationResult, MissionType } from '../engine';

interface EscalationPanelProps {
  evaluation: EvaluationResult;
  mission: MissionType;
  oneWayDelayMin: number | null;
}

export function EscalationPanel({
  evaluation,
  mission,
  oneWayDelayMin,
}: EscalationPanelProps) {
  const isRed = evaluation.level === 'RED' && evaluation.escalationPayload !== null;
  const delayLabel =
    mission === 'Moon'
      ? '< 0.1 min (Delay: seconds, not minutes)'
      : oneWayDelayMin !== null
        ? `${oneWayDelayMin.toFixed(1)} min`
        : '— min';

  return (
    <section
      aria-labelledby="escalation-heading"
      className={`rounded-xl border p-5 sm:p-6 ${
        isRed
          ? 'border-[#F87171]/60 bg-[#141B33]'
          : 'border-[#253054] bg-[#141B33]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2
            id="escalation-heading"
            className="font-display text-lg font-semibold text-[#E6EDF7]"
          >
            Escalation &amp; Telemetry Boundary
          </h2>
          <p className="mt-0.5 text-xs text-[#A9B4CC]">
            Outbound transmission policy
          </p>
        </div>
        {isRed ? (
          <OctagonAlert className="h-5 w-5 shrink-0 text-[#F87171]" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#34D399]" aria-hidden="true" />
        )}
      </div>

      {isRed && evaluation.escalationPayload ? (
        <div className="mt-4 space-y-3" role="alert" aria-live="assertive">
          <div className="rounded-lg border border-[#F87171]/60 bg-[#F87171]/12 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F87171]">
              <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Alert sent to crew and Houston</span>
            </div>
            <p className="mt-1 font-mono text-xs text-[#E6EDF7]">
              Houston will receive this in {delayLabel}
            </p>
          </div>

          {/* Exact Transmitted Payload */}
          <div className="rounded-lg border border-[#253054] bg-[#0B1020]/75 p-3.5">
            <div className="text-xs font-semibold text-[#A9B4CC]">
              Transmitted summary (only fields sent)
            </div>
            <dl className="mt-2.5 space-y-2 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[#A9B4CC]">Level</dt>
                <dd className="font-mono font-bold text-[#F87171]">
                  {evaluation.escalationPayload.level}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[#A9B4CC]">Index</dt>
                <dd className="font-mono font-semibold tabular-nums text-[#E6EDF7]">
                  {evaluation.escalationPayload.index} / 100
                </dd>
              </div>
              <div className="border-t border-[#253054] pt-2">
                <dt className="text-[#A9B4CC]">Triggering condition</dt>
                <dd className="mt-0.5 leading-relaxed text-[#E6EDF7]">
                  {evaluation.escalationPayload.triggeringCondition}
                </dd>
              </div>
              <div className="border-t border-[#253054] pt-2">
                <dt className="text-[#A9B4CC]">Trend</dt>
                <dd className="mt-0.5 font-mono text-[11px] leading-relaxed text-[#E6EDF7]">
                  {evaluation.escalationPayload.trendSummary}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[#253054] bg-[#0B1020]/60 p-3.5">
          <p className="text-sm font-medium text-[#E6EDF7]">
            No alert transmitted
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#A9B4CC]">
            In Green and Yellow states, all biometrics, countermeasures, and private warnings stay exclusively onboard.
          </p>
        </div>
      )}

      {/* Permanent Privacy & Decision Boundary */}
      <div className="mt-4 space-y-2 border-t border-[#253054] pt-3.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[#A78BFA]">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Voice logs are never sent</span>
        </div>
        <p className="leading-relaxed text-[#A9B4CC]">
          The system only alerts. It never orders evacuation or aborts the mission; people decide.
        </p>
      </div>
    </section>
  );
}
