// AI-assisted code. See README: AI use disclosure.
import { Cpu, Layers, AlertCircle } from 'lucide-react';

const ROADMAP_STEPS = [
  {
    step: 1,
    title: 'Validate thresholds with clinical experts',
    detail:
      'Review multi-signal standard-deviation rules, false-positive boundaries, and escalation criteria with aerospace medicine specialists.',
  },
  {
    step: 2,
    title: 'Headband prototype',
    detail:
      'Build a non-invasive wearable enclosure integrating auricular taVNS electrodes and phototherapy elements for ergonomic ground testing.',
  },
  {
    step: 3,
    title: 'On-device Edge AI inference',
    detail:
      'Run all signal fusion and state classification locally on dedicated low-power hardware with zero cloud or ground-link dependency.',
  },
  {
    step: 4,
    title: 'Human-factors and safety review',
    detail:
      'Evaluate crew usability, privacy boundaries, fail-safe cutoffs, and hardware compliance under simulated isolation protocols.',
  },
] as const;

export function DeviceRoadmapView() {
  return (
    <section
      aria-labelledby="device-roadmap-heading"
      className="mx-auto max-w-4xl space-y-5"
    >
      <div className="rounded-xl border border-[#253054] bg-[#141B33] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="device-roadmap-heading"
              className="font-display text-xl font-bold text-[#E6EDF7] sm:text-2xl"
            >
              Next device development route (future work, not implemented)
            </h2>
            <p className="mt-1.5 text-sm text-[#A9B4CC]">
              Planned architecture and engineering milestones for transitioning this software prototype into dedicated flight hardware.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#FBBF24]/50 bg-[#FBBF24]/15 px-3 py-1.5 font-mono text-xs font-semibold text-[#FBBF24]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Concept only. Not built. No clinical efficacy is claimed.</span>
          </span>
        </div>

        {/* Hardware & Software pillars */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#253054] bg-[#0B1020]/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#5EEAD4]">
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Hardware: taVNS / phototherapy headband</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#A9B4CC]">
              Wearable form factor combining auricular vagus nerve modulation concepts and gentle phototherapy modules designed for crew comfort during long-duration missions.
            </p>
          </div>

          <div className="rounded-xl border border-[#253054] bg-[#0B1020]/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#A78BFA]">
              <Cpu className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Software: local Edge AI on the device</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#A9B4CC]">
              Autonomous on-device inference so detection and pacing operate independently of Earth communication delays or solar conjunction blackouts.
            </p>
          </div>
        </div>

        {/* 4 sequential steps without dates */}
        <div className="mt-6">
          <h3 className="font-display text-sm font-semibold tracking-wide text-[#E6EDF7]">
            Development steps
          </h3>
          <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROADMAP_STEPS.map((item) => (
              <li
                key={item.step}
                className="flex gap-3 rounded-xl border border-[#253054] bg-[#0B1020]/60 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#5EEAD4]/50 bg-[#5EEAD4]/15 font-mono text-xs font-bold text-[#5EEAD4]">
                  {item.step}
                </span>
                <div>
                  <div className="text-sm font-semibold text-[#E6EDF7]">{item.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#A9B4CC]">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
