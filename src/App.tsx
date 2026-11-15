import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  advanceOneDay,
  advanceTenMinutes,
  applyCountermeasureDrift,
  createScenarioState,
  evaluateNeuroState,
  updateSignalValue,
  type MissionType,
  type ScenarioId,
  type SelfReportMood,
  type SignalId,
  type SimulationState,
} from './engine';
import { getEarthLink, type EarthLinkData } from './nasa';
import { HeaderBar } from './components/HeaderBar';
import { EarthLinkPanel } from './components/EarthLinkPanel';
import { PrivateVoiceLogPanel } from './components/PrivateVoiceLogPanel';
import { StatusHeroCard } from './components/StatusHeroCard';
import { CountermeasuresPanel } from './components/CountermeasuresPanel';
import { EscalationPanel } from './components/EscalationPanel';
import { CrewSignalsPanel } from './components/CrewSignalsPanel';
import { DeviceRoadmapView } from './components/DeviceRoadmapView';

type ActiveTab = 'console' | 'roadmap';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('console');
  const [simState, setSimState] = useState<SimulationState>(() =>
    createScenarioState('normal', 'Mars'),
  );
  const [earthLink, setEarthLink] = useState<EarthLinkData | null>(null);
  const [earthLoading, setEarthLoading] = useState<boolean>(true);
  const [earthError, setEarthError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isCountermeasureRunning, setIsCountermeasureRunning] = useState(false);
  const lastManualInteractionRef = useRef<number>(0);

  const loadEarthLink = useCallback(async (day: number) => {
    setEarthLoading(true);
    setEarthError(null);
    try {
      const data = await getEarthLink(day);
      setEarthLink(data);
    } catch (err) {
      setEarthError(
        err instanceof Error ? err.message : 'Unable to fetch Earth link telemetry.',
      );
    } finally {
      setEarthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEarthLink(simState.missionDay);
  }, [simState.missionDay, reloadNonce, loadEarthLink]);

  const evaluation = useMemo(() => evaluateNeuroState(simState), [simState]);

  // Gradual simulated physiological response while a countermeasure is active
  useEffect(() => {
    if (!isCountermeasureRunning || simState.countermeasuresNotEffective) {
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() - lastManualInteractionRef.current < 2000) {
        return;
      }
      setSimState((prev) => applyCountermeasureDrift(prev, 'tick'));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isCountermeasureRunning, simState.countermeasuresNotEffective]);

  const handleSelectMission = (mission: MissionType) => {
    setSimState((prev) => ({ ...prev, mission }));
  };

  const handleAdvance10Min = () => {
    setSimState((prev) => advanceTenMinutes(prev, isCountermeasureRunning));
  };

  const handleAdvance1Day = () => {
    setSimState((prev) => advanceOneDay(prev, isCountermeasureRunning));
  };

  const handleReset = () => {
    lastManualInteractionRef.current = Date.now();
    setSimState((prev) => createScenarioState('normal', prev.mission));
  };

  const handleSelectScenario = (scenario: ScenarioId) => {
    lastManualInteractionRef.current = Date.now();
    setSimState((prev) => createScenarioState(scenario, prev.mission));
  };

  const handleChangeSignal = (id: SignalId, value: number) => {
    lastManualInteractionRef.current = Date.now();
    setSimState((prev) => updateSignalValue(prev, id, value));
  };

  const handleSelectMood = (mood: SelfReportMood) => {
    setSimState((prev) => ({
      ...prev,
      activeScenario: null,
      selfReport: mood,
    }));
  };

  const handleRecordVoiceLog = () => {
    setSimState((prev) => {
      const hours = Math.floor((prev.elapsedMinutesToday % 1440) / 60);
      const mins = prev.elapsedMinutesToday % 60;
      const stamp = `Day ${prev.missionDay} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      return {
        ...prev,
        voiceLogRecordedAt: stamp,
      };
    });
  };

  const handleToggleFunctionalLoss = (active: boolean) => {
    setSimState((prev) => ({
      ...prev,
      activeScenario: null,
      functionalLossToggle: active,
    }));
  };

  const handleToggleNotEffective = (notEffective: boolean) => {
    setSimState((prev) => ({
      ...prev,
      countermeasuresNotEffective: notEffective,
    }));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-[#0B1020] text-[#E6EDF7]">
        <a
          href="#main-console"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#5EEAD4] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B1020]"
        >
          Skip to main console
        </a>

        <HeaderBar
          mission={simState.mission}
          missionDay={simState.missionDay}
          elapsedMinutesToday={simState.elapsedMinutesToday}
          activeScenario={simState.activeScenario}
          onSelectMission={handleSelectMission}
          onAdvance10Min={handleAdvance10Min}
          onAdvance1Day={handleAdvance1Day}
          onReset={handleReset}
          onSelectScenario={handleSelectScenario}
        />

        <main
          id="main-console"
          className="mx-auto w-full max-w-[1440px] flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8"
        >
          {/* View Tabs: Operational Console | Device Roadmap */}
          <div
            role="tablist"
            aria-label="Application views"
            className="inline-flex items-center rounded-lg border border-[#253054] bg-[#0E1428] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'console'}
              onClick={() => setActiveTab('console')}
              className={`min-h-[38px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'console'
                  ? 'bg-[#5EEAD4] text-[#0B1020]'
                  : 'text-[#A9B4CC] hover:text-[#E6EDF7]'
              }`}
            >
              Operational console
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'roadmap'}
              onClick={() => setActiveTab('roadmap')}
              className={`min-h-[38px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'roadmap'
                  ? 'bg-[#5EEAD4] text-[#0B1020]'
                  : 'text-[#A9B4CC] hover:text-[#E6EDF7]'
              }`}
            >
              Device roadmap
            </button>
          </div>

          {activeTab === 'roadmap' ? (
            <DeviceRoadmapView />
          ) : (
            <>
              {/* Band 1: Asymmetric 3-Column Operational Console (Status Card Center, Largest) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Earth Link & Private Voice Log */}
            <div className="order-2 flex flex-col gap-5 lg:order-1 lg:col-span-3">
              <EarthLinkPanel
                mission={simState.mission}
                data={earthLink}
                loading={earthLoading}
                error={earthError}
                onRetry={() => setReloadNonce((n) => n + 1)}
              />
              <PrivateVoiceLogPanel
                selfReport={simState.selfReport}
                voiceLogRecordedAt={simState.voiceLogRecordedAt}
                discrepancy={evaluation.discrepancy}
                onSelectMood={handleSelectMood}
                onRecordVoiceLog={handleRecordVoiceLog}
              />
            </div>

            {/* Center Column: Primary Status Card */}
            <div className="order-1 lg:order-2 lg:col-span-6">
              <StatusHeroCard
                evaluation={evaluation}
                missionDay={simState.missionDay}
                hoursInYellow={simState.hoursInYellowWithoutImprovement}
              />
            </div>

            {/* Right Column: Countermeasures & Escalation */}
            <div className="order-3 flex flex-col gap-5 lg:order-3 lg:col-span-3">
              <CountermeasuresPanel
                countermeasuresActive={evaluation.countermeasuresActive}
                countermeasuresNotEffective={simState.countermeasuresNotEffective}
                onToggleNotEffective={handleToggleNotEffective}
                onActiveStateChange={setIsCountermeasureRunning}
              />
              <EscalationPanel
                evaluation={evaluation}
                mission={simState.mission}
                oneWayDelayMin={earthLink?.oneWayDelayMin ?? null}
              />
            </div>
          </div>

          {/* Band 2: Crew Member Telemetry (Simulated 7 Signals + Safety Override) */}
          <CrewSignalsPanel
            evaluation={evaluation}
            functionalLossToggle={simState.functionalLossToggle}
            previousCognitiveAdverseSD={simState.previousCognitiveAdverseSD}
            simulatedResponseActive={
              isCountermeasureRunning && !simState.countermeasuresNotEffective
            }
            onChangeSignal={handleChangeSignal}
            onToggleFunctionalLoss={handleToggleFunctionalLoss}
          />
            </>
          )}
        </main>

        <footer className="border-t border-[#253054] bg-[#0E1428] py-4">
          <div className="mx-auto max-w-[1440px] px-4 text-center text-xs text-[#A9B4CC] sm:px-6 lg:px-8">
            Prototype. Crew data is simulated. Not a medical device.
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
