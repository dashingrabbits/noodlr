import type { Dispatch, SetStateAction } from "react";
import type {
  DrumPadConfig,
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadRowMuted,
  PadSampleSettings,
  PadSampleSettingsMap,
  PadStepLength,
  PadStepSequence,
  PadVolumes,
} from "./DrumpadController.types";

export const DEFAULT_PAD_VOLUME = 75;
export const PAD_TRIGGER_DURATION_MS = 150;
export const PAD_NAME_MAX_LENGTH = 12;
export const MIN_SAMPLE_POLYPHONY = 1;
export const MAX_SAMPLE_POLYPHONY = 8;
export const DEFAULT_SAMPLE_POLYPHONY = 1;
export const SAMPLE_SOUNDS_DIR_STORAGE_KEY = "noodlr.sampleSoundsDir";
export const MIN_PAD_ATTACK_MS = 0;
export const MAX_PAD_ATTACK_MS = 1500;
export const MIN_PAD_DECAY_MS = 0;
export const MAX_PAD_DECAY_MS = 1500;
export const MIN_PAD_SUSTAIN = 0;
export const MAX_PAD_SUSTAIN = 1;
export const MIN_PAD_RELEASE_MS = 0;
export const MAX_PAD_RELEASE_MS = 2000;
export const MIN_PAD_REVERB_MIX = 0;
export const MAX_PAD_REVERB_MIX = 1;
export const MIN_PAD_DELAY_MIX = 0;
export const MAX_PAD_DELAY_MIX = 1;
export const MIN_PAD_DELAY_TIME_MS = 1;
export const MAX_PAD_DELAY_TIME_MS = 1000;
export const MIN_PAD_DELAY_FEEDBACK = 0;
export const MAX_PAD_DELAY_FEEDBACK = 0.95;

export const DEFAULT_PAD_SAMPLE_SETTINGS: PadSampleSettings = {
  attackMs: 0,
  decayMs: 120,
  sustain: 0.95,
  releaseMs: 120,
  reverbMix: 0,
  delayMix: 0,
  delayTimeMs: 220,
  delayFeedback: 0.2,
};

export const DRUM_PADS: DrumPadConfig[] = [
  { id: 1, label: "KICK", color: "bg-orange-200", key: "Q" },
  { id: 2, label: "SNARE", color: "bg-sky-200", key: "W" },
  { id: 3, label: "HAT", color: "bg-lime-200", key: "E" },
  { id: 4, label: "CRASH", color: "bg-yellow-200", key: "R" },
  { id: 5, label: "TOM 1", color: "bg-violet-200", key: "A" },
  { id: 6, label: "TOM 2", color: "bg-pink-200", key: "S" },
  { id: 7, label: "RIDE", color: "bg-indigo-200", key: "D" },
  { id: 8, label: "CLAP", color: "bg-amber-200", key: "F" },
  { id: 9, label: "PERC 1", color: "bg-teal-200", key: "Z" },
  { id: 10, label: "PERC 2", color: "bg-cyan-200", key: "X" },
  { id: 11, label: "FX 1", color: "bg-emerald-200", key: "C" },
  { id: 12, label: "FX 2", color: "bg-rose-200", key: "V" },
];

export const createInitialPadVolumes = (pads: DrumPadConfig[]): PadVolumes => {
  return pads.reduce<PadVolumes>((volumes, pad) => {
    volumes[pad.id] = DEFAULT_PAD_VOLUME;
    return volumes;
  }, {});
};

export const createInitialPadNames = (pads: DrumPadConfig[]): PadNames => {
  return pads.reduce<PadNames>((names, pad) => {
    names[pad.id] = pad.label;
    return names;
  }, {});
};

export const createInitialPadPolyphony = (pads: DrumPadConfig[]): PadPolyphony => {
  return pads.reduce<PadPolyphony>((polyphonyMap, pad) => {
    polyphonyMap[pad.id] = DEFAULT_SAMPLE_POLYPHONY;
    return polyphonyMap;
  }, {});
};

export const createInitialPadLoopEnabled = (pads: DrumPadConfig[]): PadLoopEnabled => {
  return pads.reduce<PadLoopEnabled>((loopEnabledMap, pad) => {
    loopEnabledMap[pad.id] = false;
    return loopEnabledMap;
  }, {});
};

export const createInitialPadRowMuted = (pads: DrumPadConfig[]): PadRowMuted => {
  return pads.reduce<PadRowMuted>((rowMutedMap, pad) => {
    rowMutedMap[pad.id] = false;
    return rowMutedMap;
  }, {});
};

export const createInitialPadStepSequence = (
  pads: DrumPadConfig[],
  stepsPerPad: number
): PadStepSequence => {
  return pads.reduce<PadStepSequence>((stepSequenceMap, pad) => {
    stepSequenceMap[pad.id] = Array.from({ length: stepsPerPad }, () => false);
    return stepSequenceMap;
  }, {});
};

export const createInitialPadStepLength = (
  pads: DrumPadConfig[],
  defaultStepLength: PadStepLength[number]
): PadStepLength => {
  return pads.reduce<PadStepLength>((stepLengthMap, pad) => {
    stepLengthMap[pad.id] = defaultStepLength;
    return stepLengthMap;
  }, {});
};

export const createInitialPadSampleSettings = (pads: DrumPadConfig[]): PadSampleSettingsMap => {
  return pads.reduce<PadSampleSettingsMap>((settingsMap, pad) => {
    settingsMap[pad.id] = { ...DEFAULT_PAD_SAMPLE_SETTINGS };
    return settingsMap;
  }, {});
};

export const clampPadPolyphony = (value: number): number => {
  return Math.max(MIN_SAMPLE_POLYPHONY, Math.min(MAX_SAMPLE_POLYPHONY, Math.round(value)));
};

const clampValue = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

export const normalizePadSampleSettings = (
  candidate?: Partial<PadSampleSettings>
): PadSampleSettings => {
  return {
    attackMs: clampValue(
      Number(candidate?.attackMs ?? DEFAULT_PAD_SAMPLE_SETTINGS.attackMs),
      MIN_PAD_ATTACK_MS,
      MAX_PAD_ATTACK_MS
    ),
    decayMs: clampValue(
      Number(candidate?.decayMs ?? DEFAULT_PAD_SAMPLE_SETTINGS.decayMs),
      MIN_PAD_DECAY_MS,
      MAX_PAD_DECAY_MS
    ),
    sustain: clampValue(
      Number(candidate?.sustain ?? DEFAULT_PAD_SAMPLE_SETTINGS.sustain),
      MIN_PAD_SUSTAIN,
      MAX_PAD_SUSTAIN
    ),
    releaseMs: clampValue(
      Number(candidate?.releaseMs ?? DEFAULT_PAD_SAMPLE_SETTINGS.releaseMs),
      MIN_PAD_RELEASE_MS,
      MAX_PAD_RELEASE_MS
    ),
    reverbMix: clampValue(
      Number(candidate?.reverbMix ?? DEFAULT_PAD_SAMPLE_SETTINGS.reverbMix),
      MIN_PAD_REVERB_MIX,
      MAX_PAD_REVERB_MIX
    ),
    delayMix: clampValue(
      Number(candidate?.delayMix ?? DEFAULT_PAD_SAMPLE_SETTINGS.delayMix),
      MIN_PAD_DELAY_MIX,
      MAX_PAD_DELAY_MIX
    ),
    delayTimeMs: clampValue(
      Number(candidate?.delayTimeMs ?? DEFAULT_PAD_SAMPLE_SETTINGS.delayTimeMs),
      MIN_PAD_DELAY_TIME_MS,
      MAX_PAD_DELAY_TIME_MS
    ),
    delayFeedback: clampValue(
      Number(candidate?.delayFeedback ?? DEFAULT_PAD_SAMPLE_SETTINGS.delayFeedback),
      MIN_PAD_DELAY_FEEDBACK,
      MAX_PAD_DELAY_FEEDBACK
    ),
  };
};

export const createKeyboardPadMap = (pads: DrumPadConfig[]): Map<string, number> => {
  return pads.reduce<Map<string, number>>((map, pad) => {
    map.set(pad.key, pad.id);
    return map;
  }, new Map<string, number>());
};

const normalizeStoredSampleSoundsDir = (value: string | null): string => {
  return (value || "").trim();
};

export const readPersistedSampleSoundsDir = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const localValue = normalizeStoredSampleSoundsDir(
    window.localStorage.getItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY)
  );
  if (localValue) {
    return localValue;
  }

  return normalizeStoredSampleSoundsDir(
    window.sessionStorage.getItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY)
  );
};

export const writePersistedSampleSoundsDir = (value: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    window.localStorage.removeItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY);
    window.sessionStorage.removeItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY, normalizedValue);
  window.sessionStorage.setItem(SAMPLE_SOUNDS_DIR_STORAGE_KEY, normalizedValue);
};

export const setPadActiveTemporarily = (
  setActivePads: Dispatch<SetStateAction<Set<number>>>,
  padId: number,
  durationMs = PAD_TRIGGER_DURATION_MS
) => {
  setActivePads((previous) => new Set([...previous, padId]));

  window.setTimeout(() => {
    setActivePads((previous) => {
      const next = new Set(previous);
      next.delete(padId);
      return next;
    });
  }, durationMs);
};

export const getVisiblePadName = (pad: DrumPadConfig, names: PadNames): string => {
  const candidate = names[pad.id] ?? pad.label;
  return candidate.trim() ? candidate : pad.label;
};
