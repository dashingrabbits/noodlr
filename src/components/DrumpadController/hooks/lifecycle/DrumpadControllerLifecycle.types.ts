import { type MutableRefObject } from "react";

export type UseLifecycleCleanupEffectInput = {
  audioContextRef: MutableRefObject<AudioContext | null>;
  clearCountInTimeouts: () => void;
  clearLocalSampleObjectUrls: () => void;
  clearScheduledTickVisualTimeouts: () => void;
  importedSampleObjectUrlsRef: MutableRefObject<Set<string>>;
  isCountInActiveRef: MutableRefObject<boolean>;
  padFlashTimeoutsRef: MutableRefObject<Map<number, number>>;
  resetAudioGraphCaches: () => void;
  stopAllLoopBufferSources: () => void;
  stopAllMetronomeSources: () => void;
  stopAllOneShotBufferSources: () => void;
  stopPreviewBufferSource: () => void;
};
