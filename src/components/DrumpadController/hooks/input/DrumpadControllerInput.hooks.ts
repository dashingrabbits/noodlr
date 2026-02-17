import { useEffect } from "react";
import { isEditableEventTarget } from "../../helpers/dom";

import type {
UseKeyboardInputEffectInput,
} from "./DrumpadControllerInput.types";

export const useKeyboardInputEffect = ({
  getCurrentTransposeSemitoneOffset,
  handlePadPress,
  isRecording,
  keyboardPadMap,
  recordPadStepAtQuantizedTick,
  setIsRecording,
}: UseKeyboardInputEffectInput) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRecording(false);
        return;
      }

      if (isEditableEventTarget(event.target)) {
        return;
      }

      if (event.repeat) {
        return;
      }

      const key = event.key.toUpperCase();
      const padId = keyboardPadMap.get(key);
      if (padId) {
        const transposeSemitoneOffset = getCurrentTransposeSemitoneOffset(event.shiftKey);
        handlePadPress(padId, transposeSemitoneOffset);
        if (isRecording) {
          recordPadStepAtQuantizedTick(padId, transposeSemitoneOffset);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    getCurrentTransposeSemitoneOffset,
    handlePadPress,
    isRecording,
    keyboardPadMap,
    recordPadStepAtQuantizedTick,
    setIsRecording,
  ]);
};

