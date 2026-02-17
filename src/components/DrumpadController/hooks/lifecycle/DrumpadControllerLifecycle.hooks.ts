import { useEffect } from "react";

import type {
UseLifecycleCleanupEffectInput,
} from "./DrumpadControllerLifecycle.types";

export const useLifecycleCleanupEffect = ({
  audioContextRef,
  clearCountInTimeouts,
  clearLocalSampleObjectUrls,
  clearScheduledTickVisualTimeouts,
  importedSampleObjectUrlsRef,
  isCountInActiveRef,
  padFlashTimeoutsRef,
  resetAudioGraphCaches,
  stopAllLoopBufferSources,
  stopAllMetronomeSources,
  stopAllOneShotBufferSources,
  stopPreviewBufferSource,
}: UseLifecycleCleanupEffectInput) => {
  useEffect(() => {
    return () => {
      isCountInActiveRef.current = false;
      clearCountInTimeouts();
      stopAllLoopBufferSources();
      stopAllOneShotBufferSources();
      stopAllMetronomeSources();
      stopPreviewBufferSource();
      clearScheduledTickVisualTimeouts();

      padFlashTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      padFlashTimeoutsRef.current.clear();

      const context = audioContextRef.current;
      if (context) {
        void context.close().catch(() => {
          // Ignore cleanup errors.
        });
      }
      resetAudioGraphCaches();
      clearLocalSampleObjectUrls();
      importedSampleObjectUrlsRef.current.forEach((objectUrl) => {
        window.URL.revokeObjectURL(objectUrl);
      });
      importedSampleObjectUrlsRef.current.clear();
    };
  }, [
    audioContextRef,
    clearCountInTimeouts,
    clearLocalSampleObjectUrls,
    clearScheduledTickVisualTimeouts,
    importedSampleObjectUrlsRef,
    isCountInActiveRef,
    padFlashTimeoutsRef,
    resetAudioGraphCaches,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  ]);
};

