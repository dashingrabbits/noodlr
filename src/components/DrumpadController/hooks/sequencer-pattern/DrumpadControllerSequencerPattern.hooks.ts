import { useCallback } from "react";
import { createSavedKitId } from "../../../KitManager/KitManager.utilities";
import { DEFAULT_ROW_STEP_LENGTH,STEPS_IN_SEQUENCE } from "../../../StepSequencer/StepSequencer.utilities";
import type {
SequencerPattern
} from "../../DrumpadController.types";
import { createInitialPadStepLength,createInitialPadStepOctaves,createInitialPadStepSequence,DRUM_PADS } from "../../DrumpadController.utilities";
import {
clonePadStepLength,
clonePadStepOctaves,
clonePadStepSequence,
createDuplicatePatternName,
} from "../../helpers/pattern";

import type {
UseSequencerPatternHandlersInput,
} from "./DrumpadControllerSequencerPattern.types";

export const useSequencerPatternHandlers = ({
  activePatternId,
  currentTickRef,
  padStepLength,
  padStepOctaves,
  padStepSequence,
  sequencerPatterns,
  setActivePatternId,
  setCurrentStep,
  setPadStepLength,
  setPadStepOctaves,
  setPadStepSequence,
  setSequencerPatterns,
}: UseSequencerPatternHandlersInput) => {
  const handleAddSequencerPattern = useCallback(() => {
    const nextPattern: SequencerPattern = {
      id: createSavedKitId(),
      name: `Pattern ${sequencerPatterns.length + 1}`,
      padStepSequence: createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE),
      padStepOctaves: createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE),
      padStepLength: createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH),
    };

    setSequencerPatterns((previous) => [...previous, nextPattern]);
    setActivePatternId(nextPattern.id);
    setPadStepSequence(clonePadStepSequence(nextPattern.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(nextPattern.padStepOctaves));
    setPadStepLength(clonePadStepLength(nextPattern.padStepLength));
    currentTickRef.current = 0;
    setCurrentStep(0);
  }, [
    currentTickRef,
    sequencerPatterns.length,
    setActivePatternId,
    setCurrentStep,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setSequencerPatterns,
  ]);

  const handleDuplicateSequencerPattern = useCallback(() => {
    const sourcePattern =
      sequencerPatterns.find((pattern) => pattern.id === activePatternId) ??
      ({
        id: createSavedKitId(),
        name: "Pattern",
        padStepSequence: clonePadStepSequence(padStepSequence),
        padStepOctaves: clonePadStepOctaves(padStepOctaves),
        padStepLength: clonePadStepLength(padStepLength),
      } satisfies SequencerPattern);
    const nextPattern: SequencerPattern = {
      id: createSavedKitId(),
      name: createDuplicatePatternName(sequencerPatterns.map((pattern) => pattern.name)),
      padStepSequence: clonePadStepSequence(sourcePattern.padStepSequence),
      padStepOctaves: clonePadStepOctaves(sourcePattern.padStepOctaves),
      padStepLength: clonePadStepLength(sourcePattern.padStepLength),
    };

    setSequencerPatterns((previous) => [...previous, nextPattern]);
    setActivePatternId(nextPattern.id);
    setPadStepSequence(clonePadStepSequence(nextPattern.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(nextPattern.padStepOctaves));
    setPadStepLength(clonePadStepLength(nextPattern.padStepLength));
    currentTickRef.current = 0;
    setCurrentStep(0);
  }, [
    activePatternId,
    currentTickRef,
    padStepLength,
    padStepOctaves,
    padStepSequence,
    sequencerPatterns,
    setActivePatternId,
    setCurrentStep,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setSequencerPatterns,
  ]);

  const handleDeleteSequencerPattern = useCallback(() => {
    if (sequencerPatterns.length <= 1) {
      return;
    }

    const activePatternIndex = sequencerPatterns.findIndex(
      (pattern) => pattern.id === activePatternId
    );
    const deletePatternIndex =
      activePatternIndex >= 0 ? activePatternIndex : sequencerPatterns.length - 1;
    const nextPatterns = sequencerPatterns.filter((_, index) => index !== deletePatternIndex);

    if (!nextPatterns.length) {
      return;
    }

    const fallbackPatternIndex = Math.max(
      0,
      Math.min(deletePatternIndex - 1, nextPatterns.length - 1)
    );
    const nextActivePattern = nextPatterns[fallbackPatternIndex] ?? nextPatterns[0];

    setSequencerPatterns(nextPatterns);
    setActivePatternId(nextActivePattern.id);
    setPadStepSequence(clonePadStepSequence(nextActivePattern.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(nextActivePattern.padStepOctaves));
    setPadStepLength(clonePadStepLength(nextActivePattern.padStepLength));
    currentTickRef.current = 0;
    setCurrentStep(0);
  }, [
    activePatternId,
    currentTickRef,
    sequencerPatterns,
    setActivePatternId,
    setCurrentStep,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setSequencerPatterns,
  ]);

  const handleSelectSequencerPattern = useCallback(
    (patternId: string) => {
      const selectedPattern = sequencerPatterns.find((pattern) => pattern.id === patternId);
      if (!selectedPattern) {
        return;
      }

      setActivePatternId(selectedPattern.id);
      setPadStepSequence(clonePadStepSequence(selectedPattern.padStepSequence));
      setPadStepOctaves(clonePadStepOctaves(selectedPattern.padStepOctaves));
      setPadStepLength(clonePadStepLength(selectedPattern.padStepLength));
      currentTickRef.current = 0;
      setCurrentStep(0);
    },
    [
      currentTickRef,
      sequencerPatterns,
      setActivePatternId,
      setCurrentStep,
      setPadStepLength,
      setPadStepOctaves,
      setPadStepSequence,
    ]
  );

  return {
    handleAddSequencerPattern,
    handleDeleteSequencerPattern,
    handleDuplicateSequencerPattern,
    handleSelectSequencerPattern,
  };
};

