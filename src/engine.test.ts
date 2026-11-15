// AI-assisted code. See README: AI use disclosure.
import { describe, expect, it } from 'vitest';
import { createScenarioState, evaluateNeuroState, type SimulationState } from './engine';
import { getLinkStatus } from './nasa';

function baseState(overrides: Partial<SimulationState> = {}): SimulationState {
  const normal = createScenarioState('normal', 'Mars');
  return {
    ...normal,
    ...overrides,
    signals: {
      ...normal.signals,
      ...(overrides.signals ?? {}),
    },
    sustainedMinutes: {
      ...normal.sustainedMinutes,
      ...(overrides.sustainedMinutes ?? {}),
    },
  };
}

describe('Autonomous Neuro-Regulation Engine (traffic-light rules)', () => {
  it('1. All signals at baseline -> GREEN, index 0', () => {
    const res = evaluateNeuroState(baseState());
    expect(res.level).toBe('GREEN');
    expect(res.index).toBe(0);
    expect(res.escalationPayload).toBeNull();
  });

  it('2. HRV 1.6 SD below baseline sustained 10 min -> YELLOW, index 53', () => {
    // HRV baseline = 52, sd = 8 -> 52 - 1.6 * 8 = 39.2
    const res = evaluateNeuroState(
      baseState({
        signals: { hrv: 39.2 } as SimulationState['signals'],
        sustainedMinutes: { hrv: 10, heartRate: 0, respirationRate: 0, gsr: 0 },
      }),
    );
    expect(res.level).toBe('YELLOW');
    expect(res.index).toBe(53);
  });

  it('3. HRV 1.6 SD above baseline (improvement) -> GREEN', () => {
    // 52 + 1.6 * 8 = 64.8
    const res = evaluateNeuroState(
      baseState({
        signals: { hrv: 64.8 } as SimulationState['signals'],
        sustainedMinutes: { hrv: 20, heartRate: 0, respirationRate: 0, gsr: 0 },
      }),
    );
    expect(res.level).toBe('GREEN');
    expect(res.index).toBe(0);
  });

  it('4. One signal 2.5 SD adverse without RED condition -> YELLOW, index 83', () => {
    // Sweat cortisol baseline = 12.0, sd = 3.0 -> 12 + 2.5 * 3.0 = 19.5
    const res = evaluateNeuroState(
      baseState({
        signals: { cortisol: 19.5 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('YELLOW');
    expect(res.index).toBe(83);
  });

  it('5a. Resting heart rate 105 bpm -> YELLOW', () => {
    const res = evaluateNeuroState(
      baseState({
        signals: { heartRate: 105 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('YELLOW');
  });

  it('5b. Respiration rate 22 breaths/min -> YELLOW', () => {
    const res = evaluateNeuroState(
      baseState({
        signals: { respirationRate: 22 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('YELLOW');
  });

  it('6. Self-report "I\'m fine" with a signal at 1.5 SD adverse -> YELLOW by discrepancy', () => {
    // GSR baseline = 4.2, sd = 1.0 -> 4.2 + 1.5 * 1.0 = 5.7 (even before 10 min sustained)
    const res = evaluateNeuroState(
      baseState({
        selfReport: "I'm fine",
        signals: { gsr: 5.7 } as SimulationState['signals'],
        sustainedMinutes: { hrv: 0, heartRate: 0, respirationRate: 0, gsr: 0 },
      }),
    );
    expect(res.discrepancy).toBe(true);
    expect(res.level).toBe('YELLOW');
  });

  it('7a. Cognition -2 SD in two consecutive sessions -> RED', () => {
    // Cognitive baseline = 92, sd = 5 -> 92 - 2 * 5 = 82
    const res = evaluateNeuroState(
      baseState({
        previousCognitiveAdverseSD: 2.0,
        signals: { cognitiveScore: 82 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('RED');
  });

  it('7b. Cognition -3 SD in a single session -> RED', () => {
    // 92 - 3 * 5 = 77
    const res = evaluateNeuroState(
      baseState({
        previousCognitiveAdverseSD: 0,
        signals: { cognitiveScore: 77 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('RED');
  });

  it('8a. 5-night average sleep < 5 hrs AND HRV -2 SD -> RED', () => {
    // HRV: 52 - 2 * 8 = 36
    const res = evaluateNeuroState(
      baseState({
        recentSleepNights: [4.5, 4.5, 4.5, 4.5],
        signals: { sleepHours: 4.5, hrv: 36 } as SimulationState['signals'],
      }),
    );
    expect(res.averageSleep5Nights).toBeLessThan(5);
    expect(res.level).toBe('RED');
  });

  it('8b. Only sleep < 5 hrs OR only HRV -2 SD -> NOT RED', () => {
    const onlySleep = evaluateNeuroState(
      baseState({
        recentSleepNights: [4.5, 4.5, 4.5, 4.5],
        signals: { sleepHours: 4.5 } as SimulationState['signals'],
      }),
    );
    expect(onlySleep.level).not.toBe('RED');

    const onlyHrv = evaluateNeuroState(
      baseState({
        recentSleepNights: [7.4, 7.4, 7.4, 7.4],
        signals: { sleepHours: 7.4, hrv: 36 } as SimulationState['signals'],
        sustainedMinutes: { hrv: 10, heartRate: 0, respirationRate: 0, gsr: 0 },
      }),
    );
    expect(onlyHrv.level).not.toBe('RED');
  });

  it('9. 72 hours in YELLOW without improvement -> RED', () => {
    const res = evaluateNeuroState(
      baseState({
        hoursInYellowWithoutImprovement: 72,
      }),
    );
    expect(res.level).toBe('RED');
  });

  it('10. Functional loss toggle -> immediate RED', () => {
    const res = evaluateNeuroState(
      baseState({
        functionalLossToggle: true,
      }),
    );
    expect(res.level).toBe('RED');
  });

  it('11. Index rising 3 days in a row in YELLOW -> private worsening warning, no external alert', () => {
    const res = evaluateNeuroState(
      baseState({
        missionDay: 5,
        history: [
          { day: 2, index: 35, level: 'YELLOW' },
          { day: 3, index: 45, level: 'YELLOW' },
          { day: 4, index: 55, level: 'YELLOW' },
        ],
        // Cortisol 18.0 -> +2.0 SD -> index 67 (strictly rising: 35 < 45 < 55 < 67)
        signals: { cortisol: 18.0 } as SimulationState['signals'],
      }),
    );
    expect(res.level).toBe('YELLOW');
    expect(res.worseningPreWarning).toBe(true);
    expect(res.escalationPayload).toBeNull();
  });

  it('12. In RED, escalation payload contains level, index, condition, trend, and never voice/journal data', () => {
    const res = evaluateNeuroState(
      baseState({
        functionalLossToggle: true,
        voiceLogRecordedAt: 'Day 1 · 08:30',
        selfReport: 'Not okay',
      }),
    );
    expect(res.level).toBe('RED');
    expect(res.escalationPayload).not.toBeNull();
    const payload = res.escalationPayload!;
    expect(payload.level).toBe('RED');
    expect(typeof payload.index).toBe('number');
    expect(payload.triggeringCondition.length).toBeGreaterThan(0);
    expect(payload.trendSummary).toContain('Day 1');

    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toContain('voice');
    expect(serialized).not.toContain('audio');
    expect(serialized).not.toContain('not okay');
    expect(serialized).not.toContain('08:30');
  });
});

describe('Earth-Mars link status thresholds', () => {
  it('classifies <= 2 deg as solar conjunction, 2-4 deg as degraded, > 4 deg as nominal', () => {
    expect(getLinkStatus(0.8).label).toBe('No reliable link (solar conjunction)');
    expect(getLinkStatus(2.0).label).toBe('No reliable link (solar conjunction)');
    expect(getLinkStatus(3.1).label).toBe('Degraded link');
    expect(getLinkStatus(4.0).label).toBe('Degraded link');
    expect(getLinkStatus(4.1).label).toBe('Nominal link');
  });
});
