import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import { KnobHeadless, KnobHeadlessLabel, useKnobKeyboardControls } from "react-knob-headless";
import { ChevronDown, Infinity as InfinityIcon, RotateCcw, Trash2, X } from "lucide-react";
import type { KnobFieldProps, PadSampleEditorModalProps } from "./PadSampleEditorModal.types";
import {
  createVolumeSliderBackgroundStyle,
  clamp,
  denormalizeFromUnit,
  normalizeToUnit,
  roundToStep,
  toMilliseconds,
  toPercent,
  toVolumePercent,
} from "./PadSampleEditorModal.utilities";
import {
  contentClassName,
  envelopeFaderInputClassName,
  envelopeFaderLabelClassName,
  envelopeFaderListClassName,
  envelopeFaderRowClassName,
  envelopeFaderValueClassName,
  envelopeGraphClassName,
  envelopeGraphWrapClassName,
  envelopeHintClassName,
  footerClassName,
  footerLeftClassName,
  getPadLoopToggleButtonClassName,
  knobCardClassName,
  knobDialClassName,
  knobGridClassName,
  knobIndicatorClassName,
  knobLabelClassName,
  knobShellClassName,
  knobValueClassName,
  overlayClassName,
  padFieldLabelClassName,
  padSampleClearButtonClassName,
  padSampleNameClassName,
  padSampleRowClassName,
  padSelectClassName,
  padSettingsGridClassName,
  padTextInputClassName,
  padVolumeSliderClassName,
  padVolumeValueClassName,
  primaryButtonClassName,
  saveMetaButtonClassName,
  saveMetaMessageClassName,
  sectionAccordionContentClassName,
  sectionAccordionIconClassName,
  sectionAccordionTriggerClassName,
  sectionClassName,
  sectionTitleClassName,
  secondaryButtonClassName,
  subtitleClassName,
  titleClassName,
} from "./PadSampleEditorModal.styles";
import { PAD_NAME_MAX_LENGTH } from "../Drumpad/Drumpad.utilities";
import {
  MAX_SAMPLE_POLYPHONY,
  MIN_SAMPLE_POLYPHONY,
} from "../DrumpadController/DrumpadController.utilities";

const ENVELOPE_GRAPH_BOUNDS = {
  xStart: 24,
  xEnd: 336,
  yTop: 22,
  yBottom: 152,
};

const SEGMENT_RATIO_MIN = 0.08;
const SEGMENT_RATIO_MAX = 0.24;
const SUSTAIN_SEGMENT_RATIO_MIN = 0.14;

const toSegmentRatio = (value: number, maxValue: number): number => {
  return denormalizeFromUnit(
    normalizeToUnit(value, 0, maxValue),
    SEGMENT_RATIO_MIN,
    SEGMENT_RATIO_MAX
  );
};

const fromSegmentRatio = (ratio: number, maxValue: number): number => {
  return denormalizeFromUnit(
    normalizeToUnit(ratio, SEGMENT_RATIO_MIN, SEGMENT_RATIO_MAX),
    0,
    maxValue
  );
};

const getEnvelopeGeometry = (settings: {
  attackMs: number;
  decayMs: number;
  sustain: number;
  releaseMs: number;
}) => {
  let attackRatio = toSegmentRatio(settings.attackMs, 1500);
  let decayRatio = toSegmentRatio(settings.decayMs, 1500);
  let releaseRatio = toSegmentRatio(settings.releaseMs, 2000);
  const sustainLevel = clamp(settings.sustain, 0, 1);

  const maxCombinedRatio = 1 - SUSTAIN_SEGMENT_RATIO_MIN;
  const combinedRatio = attackRatio + decayRatio + releaseRatio;

  if (combinedRatio > maxCombinedRatio) {
    const scale = maxCombinedRatio / combinedRatio;
    attackRatio *= scale;
    decayRatio *= scale;
    releaseRatio *= scale;
  }

  const sustainSegmentRatio = 1 - attackRatio - decayRatio - releaseRatio;
  const graphWidth = ENVELOPE_GRAPH_BOUNDS.xEnd - ENVELOPE_GRAPH_BOUNDS.xStart;

  const attackX = ENVELOPE_GRAPH_BOUNDS.xStart + attackRatio * graphWidth;
  const decayX = ENVELOPE_GRAPH_BOUNDS.xStart + (attackRatio + decayRatio) * graphWidth;
  const releaseStartX = ENVELOPE_GRAPH_BOUNDS.xEnd - releaseRatio * graphWidth;
  const sustainY =
    ENVELOPE_GRAPH_BOUNDS.yBottom -
    sustainLevel * (ENVELOPE_GRAPH_BOUNDS.yBottom - ENVELOPE_GRAPH_BOUNDS.yTop);

  return {
    attackRatio,
    decayRatio,
    releaseRatio,
    sustainLevel,
    sustainSegmentRatio,
    attackX,
    decayX,
    releaseStartX,
    sustainY,
  };
};

const EnvelopeFaderRow = ({
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}) => {
  return (
    <label className={envelopeFaderRowClassName}>
      <span className={envelopeFaderLabelClassName}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={envelopeFaderInputClassName}
      />
      <span className={envelopeFaderValueClassName}>{displayValue}</span>
    </label>
  );
};

const EnvelopeGraph = ({
  attackMs,
  decayMs,
  sustain,
  releaseMs,
  onChange,
}: {
  attackMs: number;
  decayMs: number;
  sustain: number;
  releaseMs: number;
  onChange: (nextEnvelope: {
    attackMs?: number;
    decayMs?: number;
    sustain?: number;
    releaseMs?: number;
  }) => void;
}) => {
  const [dragTarget, setDragTarget] =
    useState<"attack" | "decay" | "release" | "sustain" | null>(null);

  const geometry = getEnvelopeGeometry({ attackMs, decayMs, sustain, releaseMs });

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, target: "attack" | "decay" | "release" | "sustain") => {
      const graphWidth = ENVELOPE_GRAPH_BOUNDS.xEnd - ENVELOPE_GRAPH_BOUNDS.xStart;
      const graphHeight = ENVELOPE_GRAPH_BOUNDS.yBottom - ENVELOPE_GRAPH_BOUNDS.yTop;

      const relativeX = clamp(clientX, ENVELOPE_GRAPH_BOUNDS.xStart, ENVELOPE_GRAPH_BOUNDS.xEnd);
      const normalizedX = (relativeX - ENVELOPE_GRAPH_BOUNDS.xStart) / graphWidth;

      if (target === "attack") {
        const maxAttackRatio = Math.max(
          SEGMENT_RATIO_MIN,
          1 - geometry.decayRatio - geometry.releaseRatio - SUSTAIN_SEGMENT_RATIO_MIN
        );
        const nextAttackRatio = clamp(normalizedX, SEGMENT_RATIO_MIN, maxAttackRatio);
        onChange({ attackMs: roundToStep(fromSegmentRatio(nextAttackRatio, 1500), 1) });
        return;
      }

      if (target === "decay") {
        const nextDecayRatio = clamp(
          normalizedX - geometry.attackRatio,
          SEGMENT_RATIO_MIN,
          Math.max(
            SEGMENT_RATIO_MIN,
            1 - geometry.attackRatio - geometry.releaseRatio - SUSTAIN_SEGMENT_RATIO_MIN
          )
        );
        onChange({ decayMs: roundToStep(fromSegmentRatio(nextDecayRatio, 1500), 1) });
        return;
      }

      if (target === "release") {
        const nextReleaseRatio = clamp(
          1 - normalizedX,
          SEGMENT_RATIO_MIN,
          Math.max(
            SEGMENT_RATIO_MIN,
            1 - geometry.attackRatio - geometry.decayRatio - SUSTAIN_SEGMENT_RATIO_MIN
          )
        );
        onChange({ releaseMs: roundToStep(fromSegmentRatio(nextReleaseRatio, 2000), 1) });
        return;
      }

      const relativeY = clamp(clientY, ENVELOPE_GRAPH_BOUNDS.yTop, ENVELOPE_GRAPH_BOUNDS.yBottom);
      const nextSustain = clamp(1 - (relativeY - ENVELOPE_GRAPH_BOUNDS.yTop) / graphHeight, 0, 1);
      onChange({ sustain: roundToStep(nextSustain, 0.01) });
    },
    [geometry.attackRatio, geometry.decayRatio, geometry.releaseRatio, onChange]
  );

  return (
    <div className={envelopeGraphWrapClassName}>
      <svg
        viewBox="0 0 360 180"
        className={envelopeGraphClassName}
        onPointerMove={(event) => {
          if (!dragTarget) {
            return;
          }

          const rect = event.currentTarget.getBoundingClientRect();
          updateFromPointer(
            event.clientX - rect.left,
            event.clientY - rect.top,
            dragTarget
          );
        }}
        onPointerUp={() => setDragTarget(null)}
        onPointerLeave={() => setDragTarget(null)}
      >
        <defs>
          <linearGradient id="envLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff8c2b" />
            <stop offset="50%" stopColor="#7f8899" />
            <stop offset="100%" stopColor="#4a505b" />
          </linearGradient>
        </defs>

        <line x1="24" y1="152" x2="336" y2="152" stroke="#8f938f" strokeWidth="1" />
        <line x1="24" y1="22" x2="24" y2="152" stroke="#8f938f" strokeWidth="1" />

        <path
          d={`M 24 152 L ${geometry.attackX} 22 L ${geometry.decayX} ${geometry.sustainY} L ${geometry.releaseStartX} ${geometry.sustainY} L 336 152`}
          fill="none"
          stroke="url(#envLineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={geometry.attackX}
          cy={22}
          r="6"
          fill="#f8f7f1"
          stroke="#ff8c2b"
          strokeWidth="2"
          className="cursor-ew-resize"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragTarget("attack");
          }}
        />
        <circle
          cx={geometry.decayX}
          cy={geometry.sustainY}
          r="6"
          fill="#f8f7f1"
          stroke="#7f8899"
          strokeWidth="2"
          className="cursor-move"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragTarget("decay");
          }}
        />
        <circle
          cx={geometry.releaseStartX}
          cy={geometry.sustainY}
          r="6"
          fill="#f8f7f1"
          stroke="#4a505b"
          strokeWidth="2"
          className="cursor-ew-resize"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragTarget("release");
          }}
        />
        <circle
          cx={geometry.decayX + (geometry.releaseStartX - geometry.decayX) / 2}
          cy={geometry.sustainY}
          r="5"
          fill="#f8f7f1"
          stroke="#ff8c2b"
          strokeWidth="2"
          className="cursor-ns-resize"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragTarget("sustain");
          }}
        />
      </svg>
      <div className={envelopeHintClassName}>
        Drag nodes in the graph or use ADSR faders below for precise values.
      </div>
    </div>
  );
};

const KnobField = ({
  id,
  label,
  min,
  max,
  step,
  value,
  displayValue,
  onChange,
}: KnobFieldProps) => {
  const normalizedValue = normalizeToUnit(value, min, max);
  const knobRotation = -135 + normalizedValue * 270;
  const fillDegrees = normalizedValue * 360;

  const keyboardControls = useKnobKeyboardControls({
    valueRaw: value,
    valueMin: min,
    valueMax: max,
    step,
    stepLarger: step * 10,
    onValueRawChange: (nextValueRaw) => {
      const roundedValue = roundToStep(nextValueRaw, step);
      onChange(clamp(roundedValue, min, max));
    },
  });

  return (
    <div className={knobCardClassName}>
      <KnobHeadlessLabel id={`${id}-label`} className={knobLabelClassName}>
        {label}
      </KnobHeadlessLabel>
      <KnobHeadless
        aria-labelledby={`${id}-label`}
        valueRaw={value}
        valueMin={min}
        valueMax={max}
        dragSensitivity={0.006}
        valueRawRoundFn={(nextValueRaw) => roundToStep(nextValueRaw, step)}
        valueRawDisplayFn={(nextValueRaw) => String(nextValueRaw)}
        onValueRawChange={(nextValueRaw) => {
          const roundedValue = roundToStep(nextValueRaw, step);
          onChange(clamp(roundedValue, min, max));
        }}
        includeIntoTabOrder
        className={`${knobShellClassName} cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8c2b]`}
        style={{
          background: `conic-gradient(from 225deg, #ff8c2b 0deg, #ff8c2b ${fillDegrees}deg, #b9bdb8 ${fillDegrees}deg 360deg)`,
        }}
        {...keyboardControls}
      >
        <div className={knobDialClassName}>
          <span
            className={knobIndicatorClassName}
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -100%) rotate(${knobRotation}deg)`,
              transformOrigin: "50% 100%",
            }}
          />
        </div>
      </KnobHeadless>
      <div className={knobValueClassName}>{displayValue}</div>
    </div>
  );
};

const PadSampleEditorModal = ({
  isOpen,
  padName,
  sampleName,
  padVolume,
  padPolyphony,
  isLoopEnabled,
  settings,
  saveToKitsDisabled = false,
  saveToKitsMessage = "",
  onOpenChange,
  onPadNameChange,
  onPadVolumeChange,
  onPadPolyphonyChange,
  onPadLoopToggle,
  onPadSampleClear,
  onChange,
  onReset,
  onSaveToKits,
}: PadSampleEditorModalProps) => {
  const [activeSection, setActiveSection] = useState<"pad-settings" | "envelope" | "effects">(
    "pad-settings"
  );

  useEffect(() => {
    if (isOpen) {
      setActiveSection("pad-settings");
    }
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName} />
        <Dialog.Content className={contentClassName}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className={titleClassName}>Pad Sample Editor</Dialog.Title>
              <Dialog.Description className={subtitleClassName}>
                {padName} {sampleName ? `- ${sampleName}` : "- No sample assigned"}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-[#a8aba5] bg-[#f7f6f2] p-1.5 text-[#2a2a2a] hover:bg-[#e8e7e1]"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            <section className={sectionClassName}>
              <button
                type="button"
                className={sectionAccordionTriggerClassName}
                onClick={() => setActiveSection("pad-settings")}
                aria-expanded={activeSection === "pad-settings"}
              >
                <h4 className={sectionTitleClassName}>Pad Settings</h4>
                <ChevronDown
                  size={14}
                  className={`${sectionAccordionIconClassName} ${
                    activeSection === "pad-settings" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSection === "pad-settings" ? (
                <div className={sectionAccordionContentClassName}>
                  <div className={padSettingsGridClassName}>
                    <label className="sm:col-span-2">
                      <span className={padFieldLabelClassName}>Pad Name</span>
                      <input
                        type="text"
                        value={padName}
                        maxLength={PAD_NAME_MAX_LENGTH}
                        onChange={(event) => onPadNameChange(event.target.value)}
                        className={padTextInputClassName}
                      />
                    </label>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className={padFieldLabelClassName}>Volume</span>
                        <span className={padVolumeValueClassName}>{toVolumePercent(padVolume)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={padVolume}
                        onChange={(event) => onPadVolumeChange(Number(event.target.value))}
                        style={createVolumeSliderBackgroundStyle(padVolume)}
                        className={padVolumeSliderClassName}
                      />
                    </div>

                    <label>
                      <span className={padFieldLabelClassName}>Polyphony</span>
                      <select
                        value={padPolyphony}
                        onChange={(event) => onPadPolyphonyChange(Number(event.target.value))}
                        className={padSelectClassName}
                      >
                        {Array.from(
                          { length: MAX_SAMPLE_POLYPHONY - MIN_SAMPLE_POLYPHONY + 1 },
                          (_, index) => MIN_SAMPLE_POLYPHONY + index
                        ).map((voiceCount) => (
                          <option key={voiceCount} value={voiceCount}>
                            {voiceCount}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div>
                      <span className={padFieldLabelClassName}>Loop</span>
                      <button
                        type="button"
                        className={getPadLoopToggleButtonClassName(isLoopEnabled)}
                        onClick={onPadLoopToggle}
                      >
                        <InfinityIcon size={12} />
                        {isLoopEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>

                    <div className="sm:col-span-2">
                      <span className={padFieldLabelClassName}>Sample</span>
                      <div className={padSampleRowClassName}>
                        <div className={padSampleNameClassName}>{sampleName || "No sample assigned"}</div>
                        <button
                          type="button"
                          className={padSampleClearButtonClassName}
                          onClick={onPadSampleClear}
                          disabled={!sampleName}
                        >
                          <Trash2 size={11} className="inline mr-1" />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={sectionClassName}>
              <button
                type="button"
                className={sectionAccordionTriggerClassName}
                onClick={() => setActiveSection("envelope")}
                aria-expanded={activeSection === "envelope"}
              >
                <h4 className={sectionTitleClassName}>Envelope (ADSR)</h4>
                <ChevronDown
                  size={14}
                  className={`${sectionAccordionIconClassName} ${
                    activeSection === "envelope" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSection === "envelope" ? (
                <div className={sectionAccordionContentClassName}>
                  <EnvelopeGraph
                    attackMs={settings.attackMs}
                    decayMs={settings.decayMs}
                    sustain={settings.sustain}
                    releaseMs={settings.releaseMs}
                    onChange={onChange}
                  />
                  <div className={envelopeFaderListClassName}>
                    <EnvelopeFaderRow
                      label="Attack"
                      min={0}
                      max={1500}
                      step={1}
                      value={settings.attackMs}
                      displayValue={toMilliseconds(settings.attackMs)}
                      onChange={(value) => onChange({ attackMs: value })}
                    />
                    <EnvelopeFaderRow
                      label="Decay"
                      min={0}
                      max={1500}
                      step={1}
                      value={settings.decayMs}
                      displayValue={toMilliseconds(settings.decayMs)}
                      onChange={(value) => onChange({ decayMs: value })}
                    />
                    <EnvelopeFaderRow
                      label="Sustain"
                      min={0}
                      max={1}
                      step={0.01}
                      value={settings.sustain}
                      displayValue={toPercent(settings.sustain)}
                      onChange={(value) => onChange({ sustain: value })}
                    />
                    <EnvelopeFaderRow
                      label="Release"
                      min={0}
                      max={2000}
                      step={1}
                      value={settings.releaseMs}
                      displayValue={toMilliseconds(settings.releaseMs)}
                      onChange={(value) => onChange({ releaseMs: value })}
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section className={sectionClassName}>
              <button
                type="button"
                className={sectionAccordionTriggerClassName}
                onClick={() => setActiveSection("effects")}
                aria-expanded={activeSection === "effects"}
              >
                <h4 className={sectionTitleClassName}>Effects</h4>
                <ChevronDown
                  size={14}
                  className={`${sectionAccordionIconClassName} ${
                    activeSection === "effects" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeSection === "effects" ? (
                <div className={sectionAccordionContentClassName}>
                  <div className={knobGridClassName}>
                    <KnobField
                      id="pad-reverb"
                      label="Reverb"
                      min={0}
                      max={1}
                      step={0.01}
                      value={settings.reverbMix}
                      displayValue={toPercent(settings.reverbMix)}
                      onChange={(value) => onChange({ reverbMix: value })}
                    />
                    <KnobField
                      id="pad-delay-mix"
                      label="Delay Mix"
                      min={0}
                      max={1}
                      step={0.01}
                      value={settings.delayMix}
                      displayValue={toPercent(settings.delayMix)}
                      onChange={(value) => onChange({ delayMix: value })}
                    />
                    <KnobField
                      id="pad-delay-time"
                      label="Delay Time"
                      min={1}
                      max={1000}
                      step={1}
                      value={settings.delayTimeMs}
                      displayValue={toMilliseconds(settings.delayTimeMs)}
                      onChange={(value) => onChange({ delayTimeMs: value })}
                    />
                    <KnobField
                      id="pad-delay-feedback"
                      label="Feedback"
                      min={0}
                      max={0.95}
                      step={0.01}
                      value={settings.delayFeedback}
                      displayValue={toPercent(settings.delayFeedback)}
                      onChange={(value) => onChange({ delayFeedback: value })}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <div className={footerClassName}>
            <div className={footerLeftClassName}>
              {saveToKitsMessage ? (
                <span className={saveMetaMessageClassName}>{saveToKitsMessage}</span>
              ) : null}
            </div>
            <button
              type="button"
              className={saveMetaButtonClassName}
              onClick={onSaveToKits}
              disabled={saveToKitsDisabled}
            >
              Save To Kits
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={onReset}>
              <RotateCcw size={12} className="inline mr-1" />
              Reset
            </button>
            <Dialog.Close asChild>
              <button type="button" className={primaryButtonClassName}>
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PadSampleEditorModal;
