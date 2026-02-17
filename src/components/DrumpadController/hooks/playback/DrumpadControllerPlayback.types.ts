import { type MutableRefObject } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type {
PadAssignedSamples,
PadLoopEnabled,
PadPolyphony,
PadSampleIds,
PadSampleSettingsMap,
PadVolumes
} from "../../DrumpadController.types";

export type ActiveOneShotVoice = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
};

export type ActiveLoopVoice = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  releaseSeconds: number;
};

export type UsePlaybackEngineInput = {
  activeBufferSourcesByPadRef: MutableRefObject<Map<number, ActiveOneShotVoice[]>>;
  activeLoopBufferSourcesByPadRef: MutableRefObject<Map<number, ActiveLoopVoice>>;
  activeMetronomeSourcesRef: MutableRefObject<Set<OscillatorNode>>;
  audioContextRef: MutableRefObject<AudioContext | null>;
  audioContextResumePendingRef: MutableRefObject<Promise<void> | null>;
  masterVolume: number;
  outputCompressorContextRef: MutableRefObject<AudioContext | null>;
  outputCompressorRef: MutableRefObject<DynamicsCompressorNode | null>;
  padAssignedSamples: PadAssignedSamples;
  padLoopEnabled: PadLoopEnabled;
  padLoopEnabledRef: MutableRefObject<PadLoopEnabled>;
  padPolyphony: PadPolyphony;
  padSampleIdsRef: MutableRefObject<PadSampleIds>;
  padSampleSettings: PadSampleSettingsMap;
  padSampleSettingsRef: MutableRefObject<PadSampleSettingsMap>;
  padVolumes: PadVolumes;
  playAssignedSampleRef: MutableRefObject<
    (padId: number, scheduledTime?: number, transposeSemitoneOffset?: number) => void
  >;
  reverbImpulseBufferContextRef: MutableRefObject<AudioContext | null>;
  reverbImpulseBufferRef: MutableRefObject<AudioBuffer | null>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  sampleBufferPendingRef: MutableRefObject<Map<string, Promise<AudioBuffer | null>>>;
};
