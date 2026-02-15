import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Circle, Copy, Download, Play, Plus, Square, Trash2, Volume2, VolumeX } from "lucide-react";
import type { StepSequencerProps } from "./StepSequencer.types";
import {
  createStepIndexArray,
  getStepLengthTickMultiplier,
  KEYBOARD_HINT_TEXT,
  MAX_SEQUENCER_BPM,
  MIN_SEQUENCER_BPM,
  ROW_SEQUENCER_STEP_LENGTH_OPTIONS,
  STEPS_IN_SEQUENCE,
  type SequencerStepLength,
} from "./StepSequencer.utilities";
import {
  containerClassName,
  addPatternButtonClassName,
  deletePatternButtonClassName,
  duplicatePatternButtonClassName,
  exportButtonClassName,
  getStepCellClassName,
  getTransportButtonClassName,
  getRecordButtonClassName,
  patternSelectClassName,
  sequencerToggleButtonClassName,
  rowActionButtonClassName,
  rowContainerClassName,
  rowMuteButtonActiveClassName,
  rowGridClassName,
  rowStepsScrollerClassName,
} from "./StepSequencer.styles";

const StepSequencer = ({
  patterns,
  activePatternId,
  rows,
  currentTick,
  isPlaying,
  isRecording,
  bpm,
  clockStepLength,
  engineStepLength,
  onTogglePlayback,
  onToggleRecording,
  onAddPattern,
  onDuplicatePattern,
  onDeletePattern,
  onSelectPattern,
  onExportPattern,
  onExportRow,
  onToggleRowMute,
  onStepToggle,
  onStepSet,
  onRowStepLengthChange,
  onBpmChange,
  onClockStepLengthChange,
}: StepSequencerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPadId, setDragPadId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [bpmInputValue, setBpmInputValue] = useState(() => String(bpm));
  const canDeletePattern = patterns.length > 1;

  const endDragSelection = useCallback(() => {
    setIsDragging(false);
    setDragPadId(null);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    window.addEventListener("mouseup", endDragSelection);
    window.addEventListener("blur", endDragSelection);

    return () => {
      window.removeEventListener("mouseup", endDragSelection);
      window.removeEventListener("blur", endDragSelection);
    };
  }, [endDragSelection, isDragging]);

  useEffect(() => {
    setBpmInputValue(String(bpm));
  }, [bpm]);

  const commitBpmInputValue = useCallback(() => {
    const normalizedInput = bpmInputValue.trim();
    if (!normalizedInput) {
      return;
    }

    const nextBpm = Number(normalizedInput);
    if (!Number.isFinite(nextBpm)) {
      setBpmInputValue(String(bpm));
      return;
    }

    onBpmChange(nextBpm);
  }, [bpm, bpmInputValue, onBpmChange]);

  const runExportTask = useCallback(
    async (task: () => Promise<void> | void, successMessage: string) => {
      if (isExporting) {
        return;
      }

      setIsExporting(true);
      setExportMessage("");
      try {
        await task();
        setExportMessage(successMessage);
      } catch (error) {
        setExportMessage(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Export failed."
        );
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  return (
    <div className={containerClassName}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[#515a6a] text-lg font-extrabold tracking-wide">STEP SEQUENCER</h3>
        <button
          type="button"
          onClick={() => setIsExpanded((previous) => !previous)}
          className={sequencerToggleButtonClassName}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse step sequencer" : "Expand step sequencer"}
        >
          <span>{isExpanded ? "Collapse" : "Expand"}</span>
          <ChevronDown size={14} className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>

      {isExpanded ? (
        <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={onAddPattern} className={addPatternButtonClassName}>
            <Plus size={14} />
            <span className="ml-1">ADD PATTERN</span>
          </button>
          <button
            type="button"
            onClick={onDuplicatePattern}
            className={duplicatePatternButtonClassName}
          >
            <Copy size={14} />
            <span className="ml-1">DUPLICATE</span>
          </button>
          <button
            type="button"
            onClick={onDeletePattern}
            className={deletePatternButtonClassName}
            disabled={!canDeletePattern}
          >
            <Trash2 size={14} />
            <span className="ml-1">DELETE</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void runExportTask(onExportPattern, "Pattern exported.");
            }}
            className={exportButtonClassName}
            disabled={isExporting}
          >
            <Download size={14} />
            <span className="ml-1">EXPORT PATTERN</span>
          </button>
          <label className="text-[10px] text-[#575757] uppercase tracking-wide font-bold">
            Pattern
            <select
              value={activePatternId}
              onChange={(event) => onSelectPattern(event.target.value)}
              className={`ml-2 ${patternSelectClassName}`}
            >
              {patterns.map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onTogglePlayback} className={getTransportButtonClassName(isPlaying)}>
            {isPlaying ? <Square size={14} /> : <Play size={14} />}
            <span className="ml-1">{isPlaying ? "Stop" : "Play"}</span>
          </button>
          <button type="button" onClick={onToggleRecording} className={getRecordButtonClassName(isRecording)}>
            <Circle size={12} fill={isRecording ? "currentColor" : "none"} />
            <span className="ml-1">{isRecording ? "Rec On" : "Rec"}</span>
          </button>

          <label className="text-[10px] text-[#575757] uppercase tracking-wide font-bold">
            BPM
            <input
              type="text"
              inputMode="numeric"
              min={MIN_SEQUENCER_BPM}
              max={MAX_SEQUENCER_BPM}
              value={bpmInputValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (/^\d*$/.test(nextValue)) {
                  setBpmInputValue(nextValue);
                }
              }}
              onBlur={commitBpmInputValue}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitBpmInputValue();
                  (event.currentTarget as HTMLInputElement).blur();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setBpmInputValue(String(bpm));
                  (event.currentTarget as HTMLInputElement).blur();
                }
              }}
              className="ml-2 w-20 rounded-md bg-[#fbfaf6] text-[#515a6a] text-xs px-2 py-1 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]"
            />
          </label>

          <label className="text-[10px] text-[#575757] uppercase tracking-wide font-bold">
            Clock
            <select
              value={clockStepLength}
              onChange={(event) => onClockStepLengthChange(event.target.value as SequencerStepLength)}
              className={`ml-2 ${patternSelectClassName}`}
            >
              {ROW_SEQUENCER_STEP_LENGTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-xs text-[#525252] border border-dashed border-[#b8b5aa] rounded-md p-3 bg-[#f7f6f2]">
            Assign samples to pads to create sequencer rows.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.padId}
              className={`${rowContainerClassName} ${row.isMuted ? "opacity-80" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="truncate">
                  <span className="text-[11px] font-bold text-[#515a6a]">{row.padLabel}</span>
                  <span className="ml-2 text-[10px] text-[#666]">{row.padKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleRowMute(row.padId)}
                    className={`${rowActionButtonClassName} ${
                      row.isMuted ? rowMuteButtonActiveClassName : ""
                    }`}
                    aria-label={row.isMuted ? `Unmute ${row.padLabel}` : `Mute ${row.padLabel}`}
                  >
                    {row.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    <span className="ml-1">{row.isMuted ? "Muted" : "Mute"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void runExportTask(
                        () => onExportRow(row.padId),
                        `${row.padLabel} exported.`
                      );
                    }}
                    className={rowActionButtonClassName}
                    disabled={isExporting}
                  >
                    <Download size={12} />
                    <span className="ml-1">EXPORT</span>
                  </button>
                  <label className="text-[10px] text-[#666]">
                    <select
                      value={row.stepLength}
                      onChange={(event) =>
                        onRowStepLengthChange(row.padId, event.target.value as SequencerStepLength)
                      }
                      className="ml-1 rounded-md bg-[#fbfaf6] text-[#515a6a] text-[11px] px-1.5 py-1 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]"
                    >
                      {ROW_SEQUENCER_STEP_LENGTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="text-[10px] text-[#666] truncate max-w-[160px]">{row.sampleName}</div>
                </div>
              </div>
              <div className={rowStepsScrollerClassName}>
                <div className={rowGridClassName} style={{ gridTemplateColumns: `repeat(${STEPS_IN_SEQUENCE}, minmax(0, 1fr))` }}>
                  {createStepIndexArray(STEPS_IN_SEQUENCE).map((stepIndex) => {
                    const isEnabled = row.steps[stepIndex] ?? false;
                    const isCurrentStep =
                      stepIndex ===
                      (Math.floor(
                        currentTick / getStepLengthTickMultiplier(row.stepLength, engineStepLength)
                      ) %
                        STEPS_IN_SEQUENCE);

                    return (
                      <button
                        key={`${row.padId}-${stepIndex}`}
                        type="button"
                        onMouseDown={(event) => {
                          if (event.button !== 0) {
                            return;
                          }

                          event.preventDefault();
                          setIsDragging(true);
                          setDragPadId(row.padId);
                          onStepToggle(row.padId, stepIndex);
                        }}
                        onMouseEnter={() => {
                          if (!isDragging || dragPadId !== row.padId) {
                            return;
                          }

                          onStepSet(row.padId, stepIndex, true);
                        }}
                        onMouseUp={endDragSelection}
                        className={getStepCellClassName(isEnabled, isCurrentStep, isPlaying)}
                        aria-label={`Pad ${row.padLabel} step ${stepIndex + 1}`}
                      >
                        <span
                          className={`hidden sm:inline text-[8px] font-semibold ${
                            isEnabled || (isCurrentStep && isPlaying)
                              ? "text-[#515a6a]/85"
                              : "text-[#515a6a]/70"
                          }`}
                        >
                          {(stepIndex % 4) + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-center mt-3">
        {exportMessage ? (
          <div className="text-[11px] text-[#545454] mb-1">{exportMessage}</div>
        ) : null}
        <div className="text-[#5c6270] text-xs font-medium">{KEYBOARD_HINT_TEXT}</div>
      </div>
        </>
      ) : (
        <div className="text-xs text-[#525252] border border-dashed border-[#b8b5aa] rounded-md px-3 py-2 bg-[#f7f6f2]">
          Sequencer collapsed. Expand to edit patterns and steps.
        </div>
      )}
    </div>
  );
};

export default StepSequencer;
