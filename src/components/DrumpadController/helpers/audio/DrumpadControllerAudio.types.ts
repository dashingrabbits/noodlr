import type { PadSampleSettings } from "../../DrumpadController.types";

export type SamplePlaybackBounds = {
  offsetSeconds: number;
  endOffsetSeconds: number;
  durationSeconds: number;
};

export type CreateOfflineRenderVoiceGainNode = (
  sampleSettings: PadSampleSettings
) => GainNode;
