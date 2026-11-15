import { Clock, RotateCcw, FastForward, CalendarPlus, Orbit, Moon } from 'lucide-react';
import type { MissionType, ScenarioId } from '../engine';

interface HeaderBarProps {
  mission: MissionType;
  missionDay: number;
  elapsedMinutesToday: number;
  activeScenario: ScenarioId | null;
  onSelectMission: (mission: MissionType) => void;
  onAdvance10Min: () => void;
  onAdvance1Day: () => void;
  onReset: () => void;
  onSelectScenario: (scenario: ScenarioId) => void;
}

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'yellow', label: 'Yellow + countermeasure' },
  { id: 'discrepancy', label: 'Discrepancy' },
  { id: 'worsening', label: 'Worsening (private warning)' },
  { id: 'red', label: 'Red' },
];

function formatClockTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function HeaderBar({
  mission,
  missionDay,
  elapsedMinutesToday,
  activeScenario,
  onSelectMission,
  onAdvance10Min,
  onAdvance1Day,
  onReset,
  onSelectScenario,
}: HeaderBarProps) {
  return (
    <header className="border-b border-[#253054] bg-[#0E1428]">
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        {/* Top Row: Identity + Mission & Clock Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-[#E6EDF7] sm:text-2xl">
              Autonomous Neuro-Regulation System for Spaceflight
            </h1>
            <p className="mt-1 text-sm text-[#A9B4CC]">
              Mental stability light-minutes from home
            </p>
          </div>

          {/* Mission Selector & Clock Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mission Segmented Control */}
            <div
              role="group"
              aria-label="Mission destination"
              className="inline-flex items-center rounded-lg border border-[#253054] bg-[#0B1020] p-1"
            >
              <button
                type="button"
                onClick={() => onSelectMission('Mars')}
                aria-pressed={mission === 'Mars'}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  mission === 'Mars'
                    ? 'bg-[#5EEAD4] text-[#0B1020]'
                    : 'text-[#A9B4CC] hover:text-[#E6EDF7]'
                }`}
              >
                <Orbit className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Mars</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMission('Moon')}
                aria-pressed={mission === 'Moon'}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  mission === 'Moon'
                    ? 'bg-[#5EEAD4] text-[#0B1020]'
                    : 'text-[#A9B4CC] hover:text-[#E6EDF7]'
                }`}
              >
                <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Moon</span>
              </button>
            </div>

            {/* Mission Clock Readout */}
            <div
              aria-live="polite"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#253054] bg-[#141B33] px-3.5 py-2"
            >
              <Clock className="h-4 w-4 shrink-0 text-[#5EEAD4]" aria-hidden="true" />
              <span className="font-mono text-sm font-semibold tabular-nums text-[#E6EDF7] whitespace-nowrap">
                Day {missionDay}
              </span>
              <span aria-hidden="true" className="text-[#A9B4CC]">
                ·
              </span>
              <span className="font-mono text-sm tabular-nums text-[#A9B4CC] whitespace-nowrap">
                {formatClockTime(elapsedMinutesToday)}
              </span>
            </div>

            {/* Time Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAdvance10Min}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#253054] bg-[#141B33] px-3.5 py-2 text-sm font-medium text-[#E6EDF7] whitespace-nowrap transition-colors hover:border-[#5EEAD4]/60 hover:bg-[#1A2340]"
              >
                <FastForward className="h-4 w-4 shrink-0 text-[#5EEAD4]" aria-hidden="true" />
                <span>Advance 10 min</span>
              </button>

              <button
                type="button"
                onClick={onAdvance1Day}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#253054] bg-[#141B33] px-3.5 py-2 text-sm font-medium text-[#E6EDF7] whitespace-nowrap transition-colors hover:border-[#5EEAD4]/60 hover:bg-[#1A2340]"
              >
                <CalendarPlus className="h-4 w-4 shrink-0 text-[#5EEAD4]" aria-hidden="true" />
                <span>Advance 1 day</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#253054] bg-[#0B1020] px-3.5 py-2 text-sm font-medium text-[#A9B4CC] whitespace-nowrap transition-colors hover:border-[#A9B4CC]/60 hover:text-[#E6EDF7]"
              >
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scenario Demo Bar */}
        <div className="mt-4 flex flex-col gap-2 border-t border-[#253054]/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium tracking-wide text-[#A9B4CC]">
            Demo scenarios
          </span>
          <div
            role="group"
            aria-label="Demo scenario presets"
            className="flex flex-wrap items-center gap-2"
          >
            {SCENARIOS.map((scenario) => {
              const isActive = activeScenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelectScenario(scenario.id)}
                  aria-pressed={isActive}
                  className={`min-h-[38px] rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm ${
                    isActive
                      ? 'border-[#5EEAD4] bg-[#5EEAD4] text-[#0B1020]'
                      : 'border-[#253054] bg-[#141B33] text-[#E6EDF7] hover:border-[#5EEAD4]/50 hover:bg-[#1A2340]'
                  }`}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
