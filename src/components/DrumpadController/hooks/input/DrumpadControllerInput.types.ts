import { type Dispatch,type SetStateAction } from "react";

export type UseKeyboardInputEffectInput = {
  getCurrentTransposeSemitoneOffset: (isShiftKeyHeld: boolean) => number;
  handlePadPress: (padId: number, transposeSemitoneOffset?: number) => void;
  isRecording: boolean;
  keyboardPadMap: Map<string, number>;
  recordPadStepAtQuantizedTick: (padId: number, transposeSemitoneOffset?: number) => void;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
};
