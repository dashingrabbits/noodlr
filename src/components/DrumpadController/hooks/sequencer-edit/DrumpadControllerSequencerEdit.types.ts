import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadRowMuted,
PadSampleIds,
PadStepLength,
PadStepOctaves,
PadStepSequence,
} from "../../DrumpadController.types";

export type UseSequencerEditHandlersInput = {
  cancelCountIn: () => void;
  isCountInActiveRef: MutableRefObject<boolean>;
  padSampleIdsRef: MutableRefObject<PadSampleIds>;
  padStepLengthRef: MutableRefObject<PadStepLength>;
  padStepSequenceRef: MutableRefObject<PadStepSequence>;
  currentTickRef: MutableRefObject<number>;
  sequencerEngineStepLength: SequencerStepLength;
  setIsMetronomeEnabled: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setPadRowMuted: Dispatch<SetStateAction<PadRowMuted>>;
  setPadStepLength: Dispatch<SetStateAction<PadStepLength>>;
  setPadStepOctaves: Dispatch<SetStateAction<PadStepOctaves>>;
  setPadStepSequence: Dispatch<SetStateAction<PadStepSequence>>;
  setSequencerBpm: Dispatch<SetStateAction<number>>;
  setSequencerClockStepLength: Dispatch<SetStateAction<SequencerStepLength>>;
  stopAllMetronomeSources: () => void;
  stopLoopBufferSourceForPad: (padId: number) => void;
};
