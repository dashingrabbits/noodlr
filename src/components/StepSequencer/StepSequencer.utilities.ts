export const STEPS_IN_SEQUENCE = 32;
export const KEYBOARD_HINT_TEXT = "Press pads or use keyboard keys (Q,W,E,R,A,S,D,F,Z,X,C,V)";
export const MIN_SEQUENCER_BPM = 40;
export const MAX_SEQUENCER_BPM = 240;
export const DEFAULT_SEQUENCER_BPM = 120;

export type SequencerStepLength = "1/32" | "1/16" | "1/8" | "1/4";

export const BASE_SEQUENCER_STEP_LENGTH: SequencerStepLength = "1/32";
export const DEFAULT_ROW_STEP_LENGTH: SequencerStepLength = "1/16";

const STEP_LENGTH_DENOMINATORS: Record<SequencerStepLength, number> = {
  "1/4": 4,
  "1/8": 8,
  "1/16": 16,
  "1/32": 32,
};

const STEP_LENGTH_BEAT_MULTIPLIERS: Record<SequencerStepLength, number> = {
  "1/32": 0.125,
  "1/16": 0.25,
  "1/8": 0.5,
  "1/4": 1,
};

export const ROW_SEQUENCER_STEP_LENGTH_OPTIONS: Array<{
  label: string;
  value: SequencerStepLength;
}> = [
  { label: "1/32", value: "1/32" },
  { label: "1/16", value: "1/16" },
  { label: "1/8", value: "1/8" },
  { label: "1/4", value: "1/4" },
];

export const createStepIndexArray = (count = STEPS_IN_SEQUENCE): number[] => {
  return Array.from({ length: count }, (_, index) => index);
};

export const createEmptyStepSequence = (count = STEPS_IN_SEQUENCE): boolean[] => {
  return Array.from({ length: count }, () => false);
};

export const getShortestStepLength = (
  stepLengths: SequencerStepLength[]
): SequencerStepLength => {
  const sortedStepLengths = [...stepLengths].sort(
    (left, right) => STEP_LENGTH_DENOMINATORS[right] - STEP_LENGTH_DENOMINATORS[left]
  );

  return sortedStepLengths[0] ?? BASE_SEQUENCER_STEP_LENGTH;
};

export const clampSequencerBpm = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_SEQUENCER_BPM;
  }

  return Math.max(MIN_SEQUENCER_BPM, Math.min(MAX_SEQUENCER_BPM, Math.round(value)));
};

export const getSequencerStepDurationMs = (
  bpm: number,
  stepLength: SequencerStepLength
): number => {
  const msPerBeat = 60000 / clampSequencerBpm(bpm);
  return msPerBeat * STEP_LENGTH_BEAT_MULTIPLIERS[stepLength];
};

export const getStepLengthTickMultiplier = (
  stepLength: SequencerStepLength,
  tickStepLength: SequencerStepLength
): number => {
  const stepDenominator = STEP_LENGTH_DENOMINATORS[stepLength];
  const tickDenominator = STEP_LENGTH_DENOMINATORS[tickStepLength];

  return Math.max(1, Math.round(tickDenominator / stepDenominator));
};
