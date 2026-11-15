import { useState } from 'react';
import { Lock, Mic, MicOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SelfReportMood } from '../engine';

interface PrivateVoiceLogPanelProps {
  selfReport: SelfReportMood;
  voiceLogRecordedAt: string | null;
  discrepancy: boolean;
  onSelectMood: (mood: SelfReportMood) => void;
  onRecordVoiceLog: () => void;
}

const MOOD_OPTIONS: SelfReportMood[] = ["I'm fine", 'Unsure', 'Not okay'];

export function PrivateVoiceLogPanel({
  selfReport,
  voiceLogRecordedAt,
  discrepancy,
  onSelectMood,
  onRecordVoiceLog,
}: PrivateVoiceLogPanelProps) {
  const [isRecording, setIsRecording] = useState(false);

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      onRecordVoiceLog();
    } else {
      setIsRecording(true);
      onRecordVoiceLog();
      window.setTimeout(() => {
        setIsRecording(false);
      }, 1400);
    }
  };

  return (
    <section
      aria-labelledby="voice-log-heading"
      className="rounded-xl border border-[#253054] bg-[#141B33] p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2
            id="voice-log-heading"
            className="font-display text-lg font-semibold text-[#E6EDF7]"
          >
            Private Voice Log
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#A78BFA]">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Stays on this device</span>
          </div>
        </div>
      </div>

      {/* Mood Self-Report */}
      <div className="mt-4">
        <span
          id="mood-group-label"
          className="block text-xs font-medium text-[#A9B4CC]"
        >
          Daily self-report
        </span>
        <div
          role="radiogroup"
          aria-labelledby="mood-group-label"
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {MOOD_OPTIONS.map((option) => {
            const isSelected = selfReport === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectMood(option)}
                className={`min-h-[42px] rounded-lg border px-2 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'border-[#A78BFA] bg-[#A78BFA] text-[#0B1020]'
                    : 'border-[#253054] bg-[#0B1020]/70 text-[#E6EDF7] hover:border-[#A78BFA]/60'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discrepancy Notice (Local Only) */}
      {discrepancy && (
        <div
          role="status"
          className="mt-3 flex items-start gap-2 rounded-lg border border-[#FBBF24]/50 bg-[#FBBF24]/10 px-3 py-2 text-xs text-[#FBBF24]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Discrepancy detected locally: self-report is &ldquo;I&apos;m fine&rdquo; while biometric signals are ≥ 1.5 SD adverse.
          </span>
        </div>
      )}

      {/* Mock Voice Log Capture */}
      <div className="mt-4 border-t border-[#253054] pt-4">
        <button
          type="button"
          onClick={handleToggleRecord}
          aria-pressed={isRecording}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#A78BFA] px-4 py-2.5 text-sm font-semibold text-[#0B1020] transition-opacity hover:opacity-90"
        >
          {isRecording ? (
            <>
              <MicOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Recording sample…</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Record voice log</span>
            </>
          )}
        </button>

        <div aria-live="polite" className="mt-3">
          {voiceLogRecordedAt ? (
            <div className="rounded-lg border border-[#A78BFA]/40 bg-[#0B1020]/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#A78BFA]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Voice analysis: simulated</span>
                </span>
                <span className="font-mono text-[#A9B4CC]">{voiceLogRecordedAt}</span>
              </div>
              <p className="mt-1 text-xs text-[#A9B4CC]">
                Audio buffer processed locally on onboard node. Never uploaded or shared with crew or Houston.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#A9B4CC]">
              Optional private reflection. Voice recordings and transcripts stay encrypted on this device.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
