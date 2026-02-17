import { useCallback } from "react";
import { padActiveClassName } from "../../../Drumpad/Drumpad.styles";
import { PAD_TRIGGER_DURATION_MS } from "../../DrumpadController.utilities";

import type {
UseInteractionHandlersInput,
} from "./DrumpadControllerInteraction.types";

export const useInteractionHandlers = ({
  ensureAudioContextReady,
  ensureSampleBuffer,
  getOutputNode,
  masterVolume,
  padButtonElementsRef,
  padFlashTimeoutsRef,
  playAssignedSample,
  previewBufferSourceRef,
  sampleAssetsById,
  sampleBufferCacheRef,
  scheduledTickVisualTimeoutsRef,
}: UseInteractionHandlersInput) => {
  const clearScheduledTickVisualTimeouts = useCallback(() => {
    scheduledTickVisualTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scheduledTickVisualTimeoutsRef.current = [];
  }, [scheduledTickVisualTimeoutsRef]);

  const stopPreviewBufferSource = useCallback(() => {
    const currentPreviewSource = previewBufferSourceRef.current;
    if (!currentPreviewSource) {
      return;
    }

    try {
      currentPreviewSource.stop();
    } catch {
      // Ignore stop errors if preview already ended.
    }

    previewBufferSourceRef.current = null;
  }, [previewBufferSourceRef]);

  const handlePreviewSample = useCallback(
    (sampleId: string) => {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        return;
      }

      void (async () => {
        const context = await ensureAudioContextReady();
        if (!context) {
          return;
        }

        const sampleBuffer =
          sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
        if (!sampleBuffer) {
          return;
        }

        stopPreviewBufferSource();

        const previewSource = context.createBufferSource();
        previewSource.buffer = sampleBuffer;

        const gainNode = context.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, masterVolume / 100));

        previewSource.connect(gainNode);
        gainNode.connect(getOutputNode(context));

        previewSource.onended = () => {
          if (previewBufferSourceRef.current === previewSource) {
            previewBufferSourceRef.current = null;
          }
        };

        previewBufferSourceRef.current = previewSource;
        previewSource.start(0);
      })().catch(() => {
        // Ignore preview failures so normal workflow remains unaffected.
      });
    },
    [
      ensureAudioContextReady,
      ensureSampleBuffer,
      getOutputNode,
      masterVolume,
      previewBufferSourceRef,
      sampleAssetsById,
      sampleBufferCacheRef,
      stopPreviewBufferSource,
    ]
  );

  const handlePadButtonMount = useCallback(
    (padId: number, buttonElement: HTMLButtonElement | null) => {
      if (buttonElement) {
        padButtonElementsRef.current.set(padId, buttonElement);
      } else {
        padButtonElementsRef.current.delete(padId);
      }
    },
    [padButtonElementsRef]
  );

  const flashPadVisual = useCallback(
    (padId: number) => {
      const buttonElement = padButtonElementsRef.current.get(padId);
      if (!buttonElement) {
        return;
      }

      const activeClassTokens = padActiveClassName.split(" ");
      activeClassTokens.forEach((classToken) => buttonElement.classList.add(classToken));

      const existingTimeout = padFlashTimeoutsRef.current.get(padId);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        const latestButtonElement = padButtonElementsRef.current.get(padId);
        if (latestButtonElement) {
          activeClassTokens.forEach((classToken) =>
            latestButtonElement.classList.remove(classToken)
          );
        }
        padFlashTimeoutsRef.current.delete(padId);
      }, PAD_TRIGGER_DURATION_MS);

      padFlashTimeoutsRef.current.set(padId, timeoutId);
    },
    [padButtonElementsRef, padFlashTimeoutsRef]
  );

  const handlePadPress = useCallback(
    (padId: number, transposeSemitoneOffset = 0) => {
      flashPadVisual(padId);
      playAssignedSample(padId, undefined, transposeSemitoneOffset);
    },
    [flashPadVisual, playAssignedSample]
  );

  return {
    clearScheduledTickVisualTimeouts,
    flashPadVisual,
    handlePadButtonMount,
    handlePadPress,
    handlePreviewSample,
    stopPreviewBufferSource,
  };
};

