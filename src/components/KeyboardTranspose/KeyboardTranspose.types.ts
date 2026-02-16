export interface UseKeyboardTransposeHotkeysOptions {
  isEditableEventTarget?: (target: EventTarget | null) => boolean;
  maxTransposeSteps?: number;
  transposeStepSemitones?: number;
}

export interface UseKeyboardTransposeHotkeysResult {
  heldTransposeSemitoneOffset: number;
  getCurrentTransposeSemitoneOffset: (eventShiftPressed?: boolean) => number;
}
