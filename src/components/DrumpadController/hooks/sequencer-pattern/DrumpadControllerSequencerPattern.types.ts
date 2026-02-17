import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type {
PadStepLength,
PadStepOctaves,
PadStepSequence,
SequencerPattern,
} from "../../DrumpadController.types";

export type UseSequencerPatternHandlersInput = {
  activePatternId: string;
  padStepLength: PadStepLength;
  padStepOctaves: PadStepOctaves;
  padStepSequence: PadStepSequence;
  sequencerPatterns: SequencerPattern[];
  currentTickRef: MutableRefObject<number>;
  setActivePatternId: Dispatch<SetStateAction<string>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setPadStepLength: Dispatch<SetStateAction<PadStepLength>>;
  setPadStepOctaves: Dispatch<SetStateAction<PadStepOctaves>>;
  setPadStepSequence: Dispatch<SetStateAction<PadStepSequence>>;
  setSequencerPatterns: Dispatch<SetStateAction<SequencerPattern[]>>;
};
