import { useCallback, useEffect, useRef, useState } from "react";
import type {
  UseKeyboardTransposeHotkeysOptions,
  UseKeyboardTransposeHotkeysResult,
} from "./KeyboardTranspose.types";
import {
  getDigitKeyTransposeSemitoneOffset,
  isDigitTransposeKey,
  MAX_TRANSPOSE_STEP_DIGIT,
  TRANSPOSE_STEP_SEMITONES,
} from "./KeyboardTranspose.utilities";

export const useKeyboardTransposeHotkeys = (
  options: UseKeyboardTransposeHotkeysOptions = {}
): UseKeyboardTransposeHotkeysResult => {
  const {
    isEditableEventTarget,
    maxTransposeSteps = MAX_TRANSPOSE_STEP_DIGIT,
    transposeStepSemitones = TRANSPOSE_STEP_SEMITONES,
  } = options;
  const [heldTransposeSemitoneOffset, setHeldTransposeSemitoneOffset] = useState(0);
  const pressedDigitKeysRef = useRef<string[]>([]);
  const isShiftPressedRef = useRef(false);

  const getCurrentTransposeSemitoneOffset = useCallback(
    (eventShiftPressed = false): number => {
      const activeDigitKey = pressedDigitKeysRef.current[pressedDigitKeysRef.current.length - 1] ?? null;
      return getDigitKeyTransposeSemitoneOffset(
        activeDigitKey,
        isShiftPressedRef.current || eventShiftPressed,
        transposeStepSemitones,
        maxTransposeSteps
      );
    },
    [maxTransposeSteps, transposeStepSemitones]
  );

  const syncHeldTransposeState = useCallback(() => {
    setHeldTransposeSemitoneOffset(getCurrentTransposeSemitoneOffset());
  }, [getCurrentTransposeSemitoneOffset]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        isShiftPressedRef.current = true;
        syncHeldTransposeState();
        return;
      }

      if (isEditableEventTarget?.(event.target)) {
        return;
      }

      if (!isDigitTransposeKey(event.key) || event.repeat) {
        return;
      }

      const nextPressedKeys = pressedDigitKeysRef.current.filter((key) => key !== event.key);
      nextPressedKeys.push(event.key);
      pressedDigitKeysRef.current = nextPressedKeys;
      syncHeldTransposeState();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        isShiftPressedRef.current = false;
        syncHeldTransposeState();
        return;
      }

      if (!isDigitTransposeKey(event.key)) {
        return;
      }

      const nextPressedKeys = pressedDigitKeysRef.current.filter((key) => key !== event.key);
      if (nextPressedKeys.length === pressedDigitKeysRef.current.length) {
        return;
      }

      pressedDigitKeysRef.current = nextPressedKeys;
      syncHeldTransposeState();
    };

    const handleWindowBlur = () => {
      pressedDigitKeysRef.current = [];
      isShiftPressedRef.current = false;
      setHeldTransposeSemitoneOffset(0);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isEditableEventTarget, syncHeldTransposeState]);

  return {
    heldTransposeSemitoneOffset,
    getCurrentTransposeSemitoneOffset,
  };
};
