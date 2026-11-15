export type MissionType = 'Mars' | 'Moon';

export type SignalId =
  | 'hrv'
  | 'heartRate'
  | 'respirationRate'
  | 'gsr'
  | 'cortisol'
  | 'sleepHours'
  | 'cognitiveScore';

export type AdverseDirection = 'down' | 'up';

export type SelfReportMood = "I'm fine" | 'Unsure' | 'Not okay';

export type AlertLevel = 'GREEN' | 'YELLOW' | 'RED';

export type ScenarioId = 'normal' | 'yellow' | 'discrepancy' | 'worsening' | 'red';

export interface SignalDefinition {
  id: SignalId;
  label: string;
  unit: string;
  baseline: number;
  sd: number;
  adverseDirection: AdverseDirection;
  isContinuous: boolean;
  min: number;
  max: number;
  step: number;
  decimals: number;
  absoluteThreshold?: {
    operator: 'gt';
    value: number;
    label: string;
  };
}

export const SIGNAL_DEFINITIONS: readonly SignalDefinition[] = [
  {
    id: 'hrv',
    label: 'HRV (RMSSD)',
    unit: 'ms',
    baseline: 52,
    sd: 8,
    adverseDirection: 'down',
    isContinuous: true,
    min: 15,
    max: 90,
    step: 1,
    decimals: 0,
  },
  {
    id: 'heartRate',
    label: 'Resting Heart Rate',
    unit: 'bpm',
    baseline: 62,
    sd: 6,
    adverseDirection: 'up',
    isContinuous: true,
    min: 45,
    max: 130,
    step: 1,
    decimals: 0,
    absoluteThreshold: {
      operator: 'gt',
      value: 100,
      label: '> 100 bpm',
    },
  },
  {
    id: 'respirationRate',
    label: 'Respiration Rate',
    unit: 'breaths/min',
    baseline: 14,
    sd: 2,
    adverseDirection: 'up',
    isContinuous: true,
    min: 8,
    max: 30,
    step: 0.1,
    decimals: 1,
    absoluteThreshold: {
      operator: 'gt',
      value: 20,
      label: '> 20 breaths/min',
    },
  },
  {
    id: 'gsr',
    label: 'Skin Conductance (GSR)',
    unit: 'µS',
    baseline: 4.2,
    sd: 1.0,
    adverseDirection: 'up',
    isContinuous: true,
    min: 1.0,
    max: 12.0,
    step: 0.1,
    decimals: 1,
  },
  {
    id: 'cortisol',
    label: 'Sweat Cortisol',
    unit: 'ng/mL',
    baseline: 12.0,
    sd: 3.0,
    adverseDirection: 'up',
    isContinuous: false,
    min: 4.0,
    max: 30.0,
    step: 0.5,
    decimals: 1,
  },
  {
    id: 'sleepHours',
    label: 'Sleep Hours',
    unit: 'hrs',
    baseline: 7.4,
    sd: 0.8,
    adverseDirection: 'down',
    isContinuous: false,
    min: 2.0,
    max: 10.0,
    step: 0.1,
    decimals: 1,
  },
  {
    id: 'cognitiveScore',
    label: 'Cognitive Score',
    unit: 'pts',
    baseline: 92,
    sd: 5,
    adverseDirection: 'down',
    isContinuous: false,
    min: 60,
    max: 110,
    step: 1,
    decimals: 0,
  },
] as const;

export type SignalValues = Record<SignalId, number>;
export type ContinuousDurations = Record<'hrv' | 'heartRate' | 'respirationRate' | 'gsr', number>;

export interface DailyTrendPoint {
  day: number;
  index: number;
  level: AlertLevel;
}

export interface SimulationState {
  mission: MissionType;
  missionDay: number;
  elapsedMinutesToday: number;
  activeScenario: ScenarioId | null;
  signals: SignalValues;
  sustainedMinutes: ContinuousDurations;
  selfReport: SelfReportMood;
  voiceLogRecordedAt: string | null;
  functionalLossToggle: boolean;
  previousCognitiveAdverseSD: number;
  recentSleepNights: number[]; // last 4 prior nights + current night forms 5-night average
  hoursInYellowWithoutImprovement: number;
  lastYellowIndex: number | null;
  countermeasuresNotEffective: boolean;
  history: DailyTrendPoint[]; // prior days leading up to missionDay
}

export interface SignalEvaluation {
  definition: SignalDefinition;
  value: number;
  signedSD: number;
  adverseSD: number;
  isAdverseThreshold: boolean; // >= 1.5 SD adverse
  sustainedMinutes: number;
  meetsDurationRule: boolean; // >= 10 min for continuous, immediate for per-measurement
  exceedsAbsoluteThreshold: boolean;
}

export interface EscalationPayload {
  level: 'RED';
  index: number;
  triggeringCondition: string;
  trendSummary: string;
}

export interface EvaluationResult {
  level: AlertLevel;
  levelLabel: string;
  index: number; // 0 to 100
  worstAdverseSD: number;
  discrepancy: boolean;
  worseningPreWarning: boolean;
  countermeasuresActive: boolean;
  reasons: string[];
  monitoringAction: string;
  redTriggers: string[];
  yellowTriggers: string[];
  pendingContinuousSignals: string[];
  averageSleep5Nights: number;
  signals: Record<SignalId, SignalEvaluation>;
  trendSeries: DailyTrendPoint[];
  escalationPayload: EscalationPayload | null;
}

export function computeSignalEvaluation(
  def: SignalDefinition,
  value: number,
  sustainedMinutes: number,
): SignalEvaluation {
  const signedSD = (value - def.baseline) / def.sd;
  const rawAdverseSD =
    def.adverseDirection === 'down'
      ? (def.baseline - value) / def.sd
      : (value - def.baseline) / def.sd;
  const adverseSD = Math.max(0, rawAdverseSD);
  const isAdverseThreshold = adverseSD >= 1.5;
  const effectiveSustained = def.isContinuous ? sustainedMinutes : 0;
  const meetsDurationRule = def.isContinuous
    ? isAdverseThreshold && effectiveSustained >= 10
    : isAdverseThreshold;

  const exceedsAbsoluteThreshold =
    def.absoluteThreshold !== undefined &&
    def.absoluteThreshold.operator === 'gt' &&
    value > def.absoluteThreshold.value;

  return {
    definition: def,
    value,
    signedSD,
    adverseSD,
    isAdverseThreshold,
    sustainedMinutes: effectiveSustained,
    meetsDurationRule,
    exceedsAbsoluteThreshold,
  };
}

export function evaluateNeuroState(state: SimulationState): EvaluationResult {
  const evaluations = {} as Record<SignalId, SignalEvaluation>;

  for (const def of SIGNAL_DEFINITIONS) {
    const sustained = def.isContinuous
      ? state.sustainedMinutes[def.id as keyof ContinuousDurations]
      : 0;
    evaluations[def.id] = computeSignalEvaluation(def, state.signals[def.id], sustained);
  }

  const evalList = Object.values(evaluations);
  const worstAdverseSD = Math.max(...evalList.map((e) => e.adverseSD));
  const index = Math.round(100 * Math.min(worstAdverseSD / 3, 1));

  // Discrepancy: self-report says "I'm fine" while at least one signal is >= 1.5 SD adverse
  const hasAnySignalAt15SD = evalList.some((e) => e.isAdverseThreshold);
  const discrepancy = state.selfReport === "I'm fine" && hasAnySignalAt15SD;

  // 5-night average sleep (last 4 prior nights + current night)
  const sleepWindow = [...state.recentSleepNights.slice(-4), state.signals.sleepHours];
  const averageSleep5Nights =
    sleepWindow.reduce((sum, h) => sum + h, 0) / Math.max(1, sleepWindow.length);

  // Evaluate RED criteria
  const redTriggers: string[] = [];
  const cogAdverse = evaluations.cognitiveScore.adverseSD;

  if (cogAdverse >= 3.0) {
    redTriggers.push(
      `Cognitive score down ${cogAdverse.toFixed(1)} SD in a single session (≥ 3.0 SD threshold).`,
    );
  } else if (cogAdverse >= 2.0 && state.previousCognitiveAdverseSD >= 2.0) {
    redTriggers.push(
      `Cognitive score down ≥ 2.0 SD in two consecutive sessions (previous ${state.previousCognitiveAdverseSD.toFixed(1)} SD, current ${cogAdverse.toFixed(1)} SD).`,
    );
  }

  if (sleepWindow.length >= 5 && averageSleep5Nights < 5.0 && evaluations.hrv.adverseSD >= 2.0) {
    redTriggers.push(
      `5-night average sleep is ${averageSleep5Nights.toFixed(1)} hrs (< 5.0 hrs) alongside HRV ${evaluations.hrv.adverseSD.toFixed(1)} SD below baseline (≥ 2.0 SD).`,
    );
  }

  if (state.hoursInYellowWithoutImprovement >= 72) {
    redTriggers.push(
      `${Math.round(state.hoursInYellowWithoutImprovement)} hours in yellow without improvement despite countermeasures (≥ 72 hrs threshold).`,
    );
  }

  if (state.functionalLossToggle) {
    redTriggers.push(
      'Manual functional loss indicator active: Critical procedure errors / risk to self or others.',
    );
  }

  // Evaluate YELLOW criteria
  const yellowTriggers: string[] = [];
  const pendingContinuousSignals: string[] = [];

  for (const ev of evalList) {
    if (ev.definition.isContinuous) {
      if (ev.meetsDurationRule) {
        yellowTriggers.push(
          `${ev.definition.label} at ${ev.adverseSD.toFixed(1)} SD adverse sustained for ${ev.sustainedMinutes} min (≥ 10 min rule).`,
        );
      } else if (ev.isAdverseThreshold) {
        pendingContinuousSignals.push(
          `${ev.definition.label} at ${ev.adverseSD.toFixed(1)} SD adverse (${ev.sustainedMinutes}/10 min sustained).`,
        );
      }
    } else if (ev.meetsDurationRule) {
      yellowTriggers.push(
        `${ev.definition.label} at ${ev.adverseSD.toFixed(1)} SD adverse (per-measurement evaluation).`,
      );
    }

    if (ev.exceedsAbsoluteThreshold && ev.definition.absoluteThreshold) {
      yellowTriggers.push(
        `${ev.definition.label} at ${ev.value.toFixed(ev.definition.decimals)} ${ev.definition.unit} (${ev.definition.absoluteThreshold.label} absolute threshold).`,
      );
    }
  }

  if (discrepancy) {
    yellowTriggers.push(
      'Self-report discrepancy: crew member reported "I\'m fine" while physiological/neuroendocrine data is ≥ 1.5 SD adverse.',
    );
  }

  // Determine overall level
  let level: AlertLevel = 'GREEN';
  if (redTriggers.length > 0) {
    level = 'RED';
  } else if (yellowTriggers.length > 0) {
    level = 'YELLOW';
  }

  const trendSeries: DailyTrendPoint[] = [
    ...state.history,
    { day: state.missionDay, index, level },
  ];

  // WORSENING (private pre-warning): index rises three days in a row while yellow
  let worseningPreWarning = false;
  if (level === 'YELLOW' && trendSeries.length >= 4) {
    const last4 = trendSeries.slice(-4);
    const strictlyRising3Days =
      last4[0].index < last4[1].index &&
      last4[1].index < last4[2].index &&
      last4[2].index < last4[3].index;
    const stayedElevatedWhileRising =
      last4[1].level !== 'GREEN' && last4[2].level !== 'GREEN' && last4[3].level === 'YELLOW';
    if (strictlyRising3Days && stayedElevatedWhileRising) {
      worseningPreWarning = true;
    }
  }

  const countermeasuresActive = level === 'YELLOW' || level === 'RED';

  let levelLabel = 'Nominal';
  let monitoringAction = 'Monitoring only. All signals within baseline range.';
  let reasons: string[] = ['All physiological and cognitive signals remain below 1.5 SD adverse deviation.'];

  if (level === 'GREEN' && pendingContinuousSignals.length > 0) {
    monitoringAction =
      'Monitoring closely. Transient continuous deviation (< 10 min) has not persisted long enough to trigger intervention.';
    reasons = pendingContinuousSignals;
  } else if (level === 'YELLOW') {
    levelLabel = 'Autonomous Countermeasures';
    monitoringAction = 'Automatic countermeasures active. All data remains private on this device.';
    reasons = yellowTriggers;
  } else if (level === 'RED') {
    levelLabel = 'Critical Escalation';
    monitoringAction =
      'Alert sent to crew and Houston with global evaluation only. Voice logs remain private.';
    reasons = redTriggers;
  }

  const trendSummary = trendSeries
    .slice(-5)
    .map((pt) => `Day ${pt.day}: ${pt.index}/100 (${pt.level})`)
    .join(' → ');

  const escalationPayload: EscalationPayload | null =
    level === 'RED'
      ? {
          level: 'RED',
          index,
          triggeringCondition: redTriggers.join(' '),
          trendSummary,
        }
      : null;

  return {
    level,
    levelLabel,
    index,
    worstAdverseSD,
    discrepancy,
    worseningPreWarning,
    countermeasuresActive,
    reasons,
    monitoringAction,
    redTriggers,
    yellowTriggers,
    pendingContinuousSignals,
    averageSleep5Nights,
    signals: evaluations,
    trendSeries,
    escalationPayload,
  };
}

export function updateSignalValue(
  state: SimulationState,
  id: SignalId,
  value: number,
): SimulationState {
  const def = SIGNAL_DEFINITIONS.find((s) => s.id === id);
  if (!def) return state;

  const nextSignals = { ...state.signals, [id]: value };
  const nextSustained = { ...state.sustainedMinutes };

  if (def.isContinuous) {
    const evalNext = computeSignalEvaluation(
      def,
      value,
      state.sustainedMinutes[id as keyof ContinuousDurations],
    );
    if (!evalNext.isAdverseThreshold) {
      nextSustained[id as keyof ContinuousDurations] = 0;
    }
  }

  return {
    ...state,
    activeScenario: null,
    signals: nextSignals,
    sustainedMinutes: nextSustained,
  };
}

/**
 * Gradually drifts heart rate, respiration rate toward personal baseline and raises HRV
 * while a countermeasure is active, unless countermeasuresNotEffective is enabled.
 */
export function applyCountermeasureDrift(
  state: SimulationState,
  intensity: 'tick' | 'tenMin' | 'oneDay',
): SimulationState {
  if (state.countermeasuresNotEffective) {
    return state;
  }

  const hrvDef = SIGNAL_DEFINITIONS.find((s) => s.id === 'hrv')!;
  const hrDef = SIGNAL_DEFINITIONS.find((s) => s.id === 'heartRate')!;
  const rrDef = SIGNAL_DEFINITIONS.find((s) => s.id === 'respirationRate')!;

  const currentHrv = state.signals.hrv;
  const currentHr = state.signals.heartRate;
  const currentRr = state.signals.respirationRate;

  let nextHrv = currentHrv;
  let nextHr = currentHr;
  let nextRr = currentRr;

  if (intensity === 'tick') {
    const hrvTarget = hrvDef.baseline + 4;
    if (currentHrv < hrvTarget) {
      nextHrv = Math.min(hrvTarget, currentHrv + 1);
    }
    if (currentHr > hrDef.baseline) {
      nextHr = Math.max(hrDef.baseline, currentHr - 1);
    }
    if (currentRr > rrDef.baseline) {
      nextRr = Math.max(rrDef.baseline, Number((currentRr - 0.2).toFixed(1)));
    }
  } else if (intensity === 'tenMin') {
    if (currentHrv < hrvDef.baseline) {
      const delta = Math.max(1, Math.round((hrvDef.baseline - currentHrv) * 0.25));
      nextHrv = Math.min(hrvDef.baseline, currentHrv + delta);
    }
    if (currentHr > hrDef.baseline) {
      const delta = Math.max(1, Math.round((currentHr - hrDef.baseline) * 0.25));
      nextHr = Math.max(hrDef.baseline, currentHr - delta);
    } else if (currentHr < hrDef.baseline) {
      const delta = Math.max(1, Math.round((hrDef.baseline - currentHr) * 0.25));
      nextHr = Math.min(hrDef.baseline, currentHr + delta);
    }
    if (currentRr > rrDef.baseline) {
      const delta = Math.max(0.5, Number(((currentRr - rrDef.baseline) * 0.25).toFixed(1)));
      nextRr = Math.max(rrDef.baseline, Number((currentRr - delta).toFixed(1)));
    }
  } else {
    // oneDay recovery step when countermeasures are effective
    if (currentHrv < hrvDef.baseline) {
      const delta = Math.max(2, Math.round((hrvDef.baseline - currentHrv) * 0.75));
      nextHrv = Math.min(hrvDef.baseline, currentHrv + delta);
    }
    if (currentHr > hrDef.baseline) {
      const delta = Math.max(2, Math.round((currentHr - hrDef.baseline) * 0.75));
      nextHr = Math.max(hrDef.baseline, currentHr - delta);
    }
    if (currentRr > rrDef.baseline) {
      const delta = Math.max(0.5, Number(((currentRr - rrDef.baseline) * 0.75).toFixed(1)));
      nextRr = Math.max(rrDef.baseline, Number((currentRr - delta).toFixed(1)));
    }
  }

  const nextSignals: SignalValues = {
    ...state.signals,
    hrv: nextHrv,
    heartRate: nextHr,
    respirationRate: nextRr,
  };

  const nextSustained = { ...state.sustainedMinutes };
  for (const def of [hrvDef, hrDef, rrDef]) {
    const key = def.id as keyof ContinuousDurations;
    const ev = computeSignalEvaluation(def, nextSignals[def.id], nextSustained[key]);
    if (!ev.isAdverseThreshold) {
      nextSustained[key] = 0;
    }
  }

  return {
    ...state,
    signals: nextSignals,
    sustainedMinutes: nextSustained,
  };
}

export function advanceTenMinutes(
  state: SimulationState,
  countermeasureActiveOverride?: boolean,
): SimulationState {
  const evalBefore = evaluateNeuroState(state);
  const cmActive = countermeasureActiveOverride ?? evalBefore.countermeasuresActive;

  const afterDrift = cmActive ? applyCountermeasureDrift(state, 'tenMin') : state;
  const nextSustained = { ...afterDrift.sustainedMinutes };

  for (const def of SIGNAL_DEFINITIONS) {
    if (!def.isContinuous) continue;
    const key = def.id as keyof ContinuousDurations;
    const ev = computeSignalEvaluation(def, afterDrift.signals[def.id], nextSustained[key]);
    if (ev.isAdverseThreshold) {
      nextSustained[key] = nextSustained[key] + 10;
    } else {
      nextSustained[key] = 0;
    }
  }

  const nextElapsed = afterDrift.elapsedMinutesToday + 10;
  const intermediate: SimulationState = {
    ...afterDrift,
    elapsedMinutesToday: nextElapsed,
    sustainedMinutes: nextSustained,
  };

  const evalAfter = evaluateNeuroState(intermediate);
  let nextHoursInYellow = intermediate.hoursInYellowWithoutImprovement;
  let nextLastYellowIndex = intermediate.lastYellowIndex;

  if (evalAfter.level === 'GREEN') {
    nextHoursInYellow = 0;
    nextLastYellowIndex = null;
  } else if (evalAfter.level === 'YELLOW') {
    if (nextLastYellowIndex === null || evalAfter.index >= nextLastYellowIndex) {
      nextHoursInYellow = Number((nextHoursInYellow + 10 / 60).toFixed(2));
    }
    nextLastYellowIndex = evalAfter.index;
  }

  return {
    ...intermediate,
    hoursInYellowWithoutImprovement: nextHoursInYellow,
    lastYellowIndex: nextLastYellowIndex,
  };
}

export function advanceOneDay(
  state: SimulationState,
  countermeasureActiveOverride?: boolean,
): SimulationState {
  const currentEval = evaluateNeuroState(state);
  const cmActive = countermeasureActiveOverride ?? currentEval.countermeasuresActive;

  const afterDrift = cmActive ? applyCountermeasureDrift(state, 'oneDay') : state;
  const evalAfterDrift = evaluateNeuroState(afterDrift);

  const nextSustained = { ...afterDrift.sustainedMinutes };
  for (const def of SIGNAL_DEFINITIONS) {
    if (!def.isContinuous) continue;
    const key = def.id as keyof ContinuousDurations;
    const ev = computeSignalEvaluation(def, afterDrift.signals[def.id], nextSustained[key]);
    if (ev.isAdverseThreshold) {
      nextSustained[key] = nextSustained[key] + 1440;
    } else {
      nextSustained[key] = 0;
    }
  }

  const nextHistory: DailyTrendPoint[] = [
    ...afterDrift.history.slice(-13),
    {
      day: afterDrift.missionDay,
      index: currentEval.index,
      level: currentEval.level,
    },
  ];

  let nextHoursInYellow = afterDrift.hoursInYellowWithoutImprovement;
  let nextLastYellowIndex = afterDrift.lastYellowIndex;

  if (evalAfterDrift.level === 'GREEN') {
    nextHoursInYellow = 0;
    nextLastYellowIndex = null;
  } else if (evalAfterDrift.level === 'YELLOW') {
    const improved =
      afterDrift.lastYellowIndex !== null &&
      evalAfterDrift.index <= afterDrift.lastYellowIndex - 5;
    if (!improved) {
      nextHoursInYellow = afterDrift.hoursInYellowWithoutImprovement + 24;
    }
    nextLastYellowIndex = evalAfterDrift.index;
  }

  return {
    ...afterDrift,
    missionDay: afterDrift.missionDay + 1,
    elapsedMinutesToday: 0,
    sustainedMinutes: nextSustained,
    previousCognitiveAdverseSD: evalAfterDrift.signals.cognitiveScore.adverseSD,
    recentSleepNights: [...afterDrift.recentSleepNights.slice(-4), afterDrift.signals.sleepHours],
    hoursInYellowWithoutImprovement: nextHoursInYellow,
    lastYellowIndex: nextLastYellowIndex,
    history: nextHistory,
  };
}

export function createScenarioState(
  scenario: ScenarioId,
  mission: MissionType = 'Mars',
): SimulationState {
  switch (scenario) {
    case 'normal':
      return {
        mission,
        missionDay: 142,
        elapsedMinutesToday: 0,
        activeScenario: 'normal',
        signals: {
          hrv: 53,
          heartRate: 61,
          respirationRate: 14.0,
          gsr: 4.1,
          cortisol: 12.0,
          sleepHours: 7.5,
          cognitiveScore: 93,
        },
        sustainedMinutes: { hrv: 0, heartRate: 0, respirationRate: 0, gsr: 0 },
        selfReport: "I'm fine",
        voiceLogRecordedAt: null,
        functionalLossToggle: false,
        previousCognitiveAdverseSD: 0,
        recentSleepNights: [7.4, 7.6, 7.3, 7.5],
        hoursInYellowWithoutImprovement: 0,
        lastYellowIndex: null,
        countermeasuresNotEffective: false,
        history: [
          { day: 136, index: 7, level: 'GREEN' },
          { day: 137, index: 11, level: 'GREEN' },
          { day: 138, index: 4, level: 'GREEN' },
          { day: 139, index: 9, level: 'GREEN' },
          { day: 140, index: 12, level: 'GREEN' },
          { day: 141, index: 6, level: 'GREEN' },
        ],
      };

    case 'yellow':
      return {
        mission,
        missionDay: 142,
        elapsedMinutesToday: 20,
        activeScenario: 'yellow',
        signals: {
          hrv: 39, // 1.625 SD down
          heartRate: 74, // 2.0 SD up -> index 67
          respirationRate: 16.5, // 1.25 SD up
          gsr: 5.4, // 1.2 SD up
          cortisol: 15.5, // 1.17 SD up
          sleepHours: 6.4, // 1.25 SD down
          cognitiveScore: 88, // 0.8 SD down
        },
        sustainedMinutes: { hrv: 20, heartRate: 20, respirationRate: 0, gsr: 0 },
        selfReport: 'Unsure',
        voiceLogRecordedAt: null,
        functionalLossToggle: false,
        previousCognitiveAdverseSD: 0.6,
        recentSleepNights: [7.2, 6.9, 6.8, 6.5],
        hoursInYellowWithoutImprovement: 1,
        lastYellowIndex: 67,
        countermeasuresNotEffective: false,
        history: [
          { day: 136, index: 14, level: 'GREEN' },
          { day: 137, index: 18, level: 'GREEN' },
          { day: 138, index: 22, level: 'GREEN' },
          { day: 139, index: 31, level: 'GREEN' },
          { day: 140, index: 40, level: 'GREEN' },
          { day: 141, index: 47, level: 'GREEN' },
        ],
      };

    case 'discrepancy':
      return {
        mission,
        missionDay: 142,
        elapsedMinutesToday: 10,
        activeScenario: 'discrepancy',
        signals: {
          hrv: 40, // 1.5 SD down
          heartRate: 71, // 1.5 SD up
          respirationRate: 16.0,
          gsr: 5.9, // 1.7 SD up
          cortisol: 18.0, // 2.0 SD up -> index 67
          sleepHours: 6.6,
          cognitiveScore: 89,
        },
        sustainedMinutes: { hrv: 10, heartRate: 10, respirationRate: 0, gsr: 10 },
        selfReport: "I'm fine",
        voiceLogRecordedAt: 'Day 142 · 08:10 (local)',
        functionalLossToggle: false,
        previousCognitiveAdverseSD: 0.4,
        recentSleepNights: [7.1, 7.0, 6.8, 6.7],
        hoursInYellowWithoutImprovement: 0,
        lastYellowIndex: 67,
        countermeasuresNotEffective: false,
        history: [
          { day: 136, index: 12, level: 'GREEN' },
          { day: 137, index: 16, level: 'GREEN' },
          { day: 138, index: 19, level: 'GREEN' },
          { day: 139, index: 28, level: 'GREEN' },
          { day: 140, index: 35, level: 'GREEN' },
          { day: 141, index: 44, level: 'GREEN' },
        ],
      };

    case 'worsening':
      return {
        mission,
        missionDay: 142,
        elapsedMinutesToday: 40,
        activeScenario: 'worsening',
        signals: {
          hrv: 36, // 2.0 SD down -> index 67
          heartRate: 75, // 2.17 SD up -> index 72
          respirationRate: 17.5, // 1.75 SD up
          gsr: 6.3, // 2.1 SD up
          cortisol: 18.5, // 2.17 SD up
          sleepHours: 5.7, // 2.125 SD down
          cognitiveScore: 84, // 1.6 SD down
        },
        sustainedMinutes: { hrv: 40, heartRate: 40, respirationRate: 40, gsr: 40 },
        selfReport: 'Not okay',
        voiceLogRecordedAt: 'Day 142 · 08:30 (local)',
        functionalLossToggle: false,
        previousCognitiveAdverseSD: 1.2,
        recentSleepNights: [6.4, 6.1, 5.9, 5.8],
        hoursInYellowWithoutImprovement: 48,
        lastYellowIndex: 64,
        countermeasuresNotEffective: false,
        history: [
          { day: 136, index: 24, level: 'GREEN' },
          { day: 137, index: 33, level: 'GREEN' },
          { day: 138, index: 42, level: 'GREEN' },
          { day: 139, index: 51, level: 'YELLOW' },
          { day: 140, index: 58, level: 'YELLOW' },
          { day: 141, index: 64, level: 'YELLOW' },
        ],
      };

    case 'red':
      return {
        mission,
        missionDay: 142,
        elapsedMinutesToday: 50,
        activeScenario: 'red',
        signals: {
          hrv: 33, // 2.38 SD down (>= 2 SD)
          heartRate: 80, // 3.0 SD up
          respirationRate: 19.0, // 2.5 SD up
          gsr: 6.8, // 2.6 SD up
          cortisol: 19.5, // 2.5 SD up
          sleepHours: 4.3, // 3.88 SD down
          cognitiveScore: 80, // 2.4 SD down (2nd consecutive session >= 2 SD)
        },
        sustainedMinutes: { hrv: 1440, heartRate: 1440, respirationRate: 1440, gsr: 1440 },
        selfReport: 'Not okay',
        voiceLogRecordedAt: 'Day 142 · 08:40 (local)',
        functionalLossToggle: false,
        previousCognitiveAdverseSD: 2.2,
        recentSleepNights: [4.6, 4.4, 4.2, 4.5],
        hoursInYellowWithoutImprovement: 72,
        lastYellowIndex: 82,
        countermeasuresNotEffective: false,
        history: [
          { day: 136, index: 38, level: 'GREEN' },
          { day: 137, index: 54, level: 'YELLOW' },
          { day: 138, index: 63, level: 'YELLOW' },
          { day: 139, index: 71, level: 'YELLOW' },
          { day: 140, index: 78, level: 'YELLOW' },
          { day: 141, index: 84, level: 'YELLOW' },
        ],
      };
  }
}
