import { type MutableRefObject } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";

export type UseInteractionHandlersInput = {
  ensureAudioContextReady: () => Promise<AudioContext | null>;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  getOutputNode: (context: AudioContext) => AudioNode;
  masterVolume: number;
  padButtonElementsRef: MutableRefObject<Map<number, HTMLButtonElement>>;
  padFlashTimeoutsRef: MutableRefObject<Map<number, number>>;
  playAssignedSample: (padId: number, scheduledTime?: number, transposeSemitoneOffset?: number) => void;
  previewBufferSourceRef: MutableRefObject<AudioBufferSourceNode | null>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  scheduledTickVisualTimeoutsRef: MutableRefObject<number[]>;
};
