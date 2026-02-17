import { useCallback } from "react";
import {
clampSequencerBpm,
createEmptyStepSequence,
DEFAULT_ROW_STEP_LENGTH,
getStepLengthTickMultiplier,
STEPS_IN_SEQUENCE,
type SequencerStepLength,
} from "../../../StepSequencer/StepSequencer.utilities";
import { EMPTY_STEP_OCTAVE_SEQUENCE } from "../../constants";
import { getNormalizedStepOctaveSemitoneOffset } from "../../helpers/pattern";

import type {
UseSequencerEditHandlersInput,
} from "./DrumpadControllerSequencerEdit.types";

export const useSequencerEditHandlers = ({
  cancelCountIn,
  currentTickRef,
  isCountInActiveRef,
  padSampleIdsRef,
  padStepLengthRef,
  padStepSequenceRef,
  sequencerEngineStepLength,
  setIsMetronomeEnabled,
  setIsRecording,
  setPadRowMuted,
  setPadStepLength,
  setPadStepOctaves,
  setPadStepSequence,
  setSequencerBpm,
  setSequencerClockStepLength,
  stopAllMetronomeSources,
  stopLoopBufferSourceForPad,
}: UseSequencerEditHandlersInput) => {
  const handleSequencerStepToggle = useCallback((padId: number, stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= STEPS_IN_SEQUENCE) {
      return;
    }

    setPadStepSequence((previous) => {
      const previousSteps = previous[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
      const nextSteps = [...previousSteps];
      nextSteps[stepIndex] = !nextSteps[stepIndex];

      return {
        ...previous,
        [padId]: nextSteps,
      };
    });

    setPadStepOctaves((previous) => {
      const previousStepOctaves = previous[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
      if (previousStepOctaves[stepIndex] === 0) {
        return previous;
      }

      const nextStepOctaves = [...previousStepOctaves];
      nextStepOctaves[stepIndex] = 0;
      return {
        ...previous,
        [padId]: nextStepOctaves,
      };
    });
  }, [setPadStepOctaves, setPadStepSequence]);

  const handleSequencerStepSet = useCallback(
    (
      padId: number,
      stepIndex: number,
      isEnabled: boolean,
      transposeSemitoneOffset?: number
    ) => {
      if (stepIndex < 0 || stepIndex >= STEPS_IN_SEQUENCE) {
        return;
      }

      setPadStepSequence((previous) => {
        const previousSteps = previous[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
        if (previousSteps[stepIndex] === isEnabled) {
          return previous;
        }

        const nextSteps = [...previousSteps];
        nextSteps[stepIndex] = isEnabled;

        return {
          ...previous,
          [padId]: nextSteps,
        };
      });

      const hasExplicitTranspose = typeof transposeSemitoneOffset === "number";
      const normalizedTransposeSemitoneOffset = hasExplicitTranspose
        ? getNormalizedStepOctaveSemitoneOffset(transposeSemitoneOffset)
        : 0;
      const previousSteps =
        padStepSequenceRef.current[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
      const wasEnabled = Boolean(previousSteps[stepIndex]);

      if (!isEnabled || hasExplicitTranspose || !wasEnabled) {
        setPadStepOctaves((previous) => {
          const previousStepOctaves = previous[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
          const nextStepOctave = isEnabled ? normalizedTransposeSemitoneOffset : 0;
          if (previousStepOctaves[stepIndex] === nextStepOctave) {
            return previous;
          }

          const nextStepOctaves = [...previousStepOctaves];
          nextStepOctaves[stepIndex] = nextStepOctave;
          return {
            ...previous,
            [padId]: nextStepOctaves,
          };
        });
      }
    },
    [padStepSequenceRef, setPadStepOctaves, setPadStepSequence]
  );

  const handleSequencerRowStepLengthChange = useCallback(
    (padId: number, stepLength: SequencerStepLength) => {
      setPadStepLength((previous) => ({
        ...previous,
        [padId]: stepLength,
      }));
    },
    [setPadStepLength]
  );

  const handleSequencerRowMuteToggle = useCallback(
    (padId: number) => {
      setPadRowMuted((previous) => {
        const nextMuted = !(previous[padId] ?? false);
        if (nextMuted) {
          stopLoopBufferSourceForPad(padId);
        }

        return {
          ...previous,
          [padId]: nextMuted,
        };
      });
    },
    [setPadRowMuted, stopLoopBufferSourceForPad]
  );

  const handleSequencerBpmChange = useCallback(
    (value: number) => {
      setSequencerBpm(clampSequencerBpm(value));
    },
    [setSequencerBpm]
  );

  const handleSequencerClockStepLengthChange = useCallback(
    (stepLength: SequencerStepLength) => {
      setSequencerClockStepLength(stepLength);
    },
    [setSequencerClockStepLength]
  );

  const handleToggleRecording = useCallback(() => {
    setIsRecording((previous) => {
      const nextRecording = !previous;
      if (!nextRecording && isCountInActiveRef.current) {
        cancelCountIn();
      }
      return nextRecording;
    });
  }, [cancelCountIn, isCountInActiveRef, setIsRecording]);

  const handleToggleMetronome = useCallback(() => {
    setIsMetronomeEnabled((previous) => {
      const nextEnabled = !previous;
      if (!nextEnabled) {
        if (isCountInActiveRef.current) {
          cancelCountIn();
        }
        stopAllMetronomeSources();
      }
      return nextEnabled;
    });
  }, [cancelCountIn, isCountInActiveRef, setIsMetronomeEnabled, stopAllMetronomeSources]);

  const recordPadStepAtQuantizedTick = useCallback(
    (padId: number, transposeSemitoneOffset = 0) => {
      const assignedSampleId = padSampleIdsRef.current[padId] ?? "";
      if (!assignedSampleId) {
        return;
      }

      const rowStepLength = padStepLengthRef.current[padId] ?? DEFAULT_ROW_STEP_LENGTH;
      const rowStepTickMultiplier = getStepLengthTickMultiplier(
        rowStepLength,
        sequencerEngineStepLength
      );
      const quantizedTick =
        Math.round(currentTickRef.current / rowStepTickMultiplier) * rowStepTickMultiplier;
      const stepIndex = Math.floor(quantizedTick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
      const normalizedTransposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
        transposeSemitoneOffset
      );

      setPadStepSequence((previous) => {
        const previousSteps = previous[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
        const nextSteps = [...previousSteps];
        nextSteps[stepIndex] = true;
        if (previousSteps[stepIndex] === nextSteps[stepIndex]) {
          return previous;
        }

        return { ...previous, [padId]: nextSteps };
      });
      setPadStepOctaves((previous) => {
        const previousStepOctaves = previous[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
        if (previousStepOctaves[stepIndex] === normalizedTransposeSemitoneOffset) {
          return previous;
        }

        const nextStepOctaves = [...previousStepOctaves];
        nextStepOctaves[stepIndex] = normalizedTransposeSemitoneOffset;
        return {
          ...previous,
          [padId]: nextStepOctaves,
        };
      });
    },
    [
      currentTickRef,
      padSampleIdsRef,
      padStepLengthRef,
      sequencerEngineStepLength,
      setPadStepOctaves,
      setPadStepSequence,
    ]
  );

  return {
    handleSequencerBpmChange,
    handleSequencerClockStepLengthChange,
    handleSequencerRowMuteToggle,
    handleSequencerRowStepLengthChange,
    handleSequencerStepSet,
    handleSequencerStepToggle,
    handleToggleMetronome,
    handleToggleRecording,
    recordPadStepAtQuantizedTick,
  };
};

