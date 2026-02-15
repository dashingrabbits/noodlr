import type { SampleAsset } from "../../integrations/samples/sample.types";

export type DrumPadConfig = {
  id: number;
  label: string;
  color: string;
  key: string;
};

export type DrumPad = DrumPadConfig;
export type PadVolumes = Record<number, number>;
export type PadNames = Record<number, string>;
export type PadSampleIds = Record<number, string>;
export type PadAssignedSamples = Record<number, SampleAsset | null>;
export type PadPolyphony = Record<number, number>;
export type PadLoopEnabled = Record<number, boolean>;
export type PadRowMuted = Record<number, boolean>;
export interface PadSampleSettings {
  attackMs: number;
  decayMs: number;
  sustain: number;
  releaseMs: number;
  reverbMix: number;
  delayMix: number;
  delayTimeMs: number;
  delayFeedback: number;
}
export type PadSampleSettingsMap = Record<number, PadSampleSettings>;
export type PadStepSequence = Record<number, boolean[]>;
export type PadStepLength = Record<number, "1/32" | "1/16" | "1/8" | "1/4">;

export interface SequencerPattern {
  id: string;
  name: string;
  padStepSequence: PadStepSequence;
  padStepLength: PadStepLength;
}
