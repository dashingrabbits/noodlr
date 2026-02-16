export const OCTAVE_TRANSPOSE_SEMITONES = 12;
export const TRANSPOSE_STEP_SEMITONES = OCTAVE_TRANSPOSE_SEMITONES / 4;
export const MAX_TRANSPOSE_STEP_DIGIT = 9;

export const isDigitTransposeKey = (value: string): boolean => {
  return /^[1-9]$/.test(value);
};

export const getDigitKeyTransposeSemitoneOffset = (
  candidateKey: string | null,
  isShiftPressed: boolean,
  transposeStepSemitones = TRANSPOSE_STEP_SEMITONES,
  maxTransposeSteps = MAX_TRANSPOSE_STEP_DIGIT
): number => {
  if (!candidateKey || !isDigitTransposeKey(candidateKey)) {
    return 0;
  }

  const transposeSteps = Number(candidateKey);
  if (!Number.isFinite(transposeSteps) || transposeSteps < 1) {
    return 0;
  }

  const clampedTransposeSteps = Math.min(maxTransposeSteps, Math.round(transposeSteps));
  const semitoneOffset = clampedTransposeSteps * transposeStepSemitones;
  return isShiftPressed ? -semitoneOffset : semitoneOffset;
};

export const normalizeTransposeSemitoneOffset = (
  candidateValue: unknown,
  transposeStepSemitones = TRANSPOSE_STEP_SEMITONES,
  maxTransposeSteps = MAX_TRANSPOSE_STEP_DIGIT
): number => {
  const normalizedValue = Number(candidateValue);
  if (!Number.isFinite(normalizedValue)) {
    return 0;
  }

  const maxSemitoneOffset = transposeStepSemitones * maxTransposeSteps;
  const clampedSemitoneOffset = Math.max(-maxSemitoneOffset, Math.min(maxSemitoneOffset, normalizedValue));
  const normalizedStepCount = Math.round(clampedSemitoneOffset / transposeStepSemitones);
  return normalizedStepCount * transposeStepSemitones;
};

export const formatSemitoneOffsetAsOctaves = (
  semitoneOffset: number,
  octaveSemitones = OCTAVE_TRANSPOSE_SEMITONES
): string => {
  if (!Number.isFinite(semitoneOffset) || semitoneOffset === 0) {
    return "";
  }

  const octaveOffset = semitoneOffset / octaveSemitones;
  const formattedOffset = octaveOffset.toFixed(2).replace(/\.?0+$/, "");
  return `${octaveOffset > 0 ? "+" : ""}${formattedOffset}`;
};
