import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import JSZip from "jszip";
import DrumpadHeader from "../DrumpadHeader/DrumpadHeader";
import DrumpadGrid from "../DrumpadGrid/DrumpadGrid";
import KitManager from "../KitManager/KitManager";
import MasterControls from "../MasterControls/MasterControls";
import type { ProjectOption } from "../MasterControls/MasterControls.types";
import PadSampleEditorModal from "../PadSampleEditorModal/PadSampleEditorModal";
import PadSampleAssignModal from "../PadSampleAssignModal/PadSampleAssignModal";
import SampleLibrarySidebar from "../SampleLibrarySidebar/SampleLibrarySidebar";
import StepSequencer from "../StepSequencer/StepSequencer";
import {
  BASE_SEQUENCER_STEP_LENGTH,
  clampSequencerBpm,
  createEmptyStepSequence,
  DEFAULT_SEQUENCER_BPM,
  DEFAULT_ROW_STEP_LENGTH,
  KEYBOARD_HINT_TEXT,
  getStepLengthTickMultiplier,
  getShortestStepLength,
  getSequencerStepDurationMs,
  STEPS_IN_SEQUENCE,
  type SequencerStepLength,
} from "../StepSequencer/StepSequencer.utilities";
import { padActiveClassName } from "../Drumpad/Drumpad.styles";
import { sanitizePadName } from "../Drumpad/Drumpad.utilities";
import { contentClassName, layoutClassName, pageClassName } from "./DrumpadController.styles";
import type {
  PadAssignedSamples,
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadRowMuted,
  PadSampleSettings,
  PadSampleSettingsMap,
  PadStepOctaves,
  PadStepLength,
  PadStepSequence,
  PadSampleIds,
  PadVolumes,
  SequencerPattern,
} from "./DrumpadController.types";
import {
  clampPadPolyphony,
  createInitialPadLoopEnabled,
  createInitialPadPolyphony,
  createInitialPadRowMuted,
  createInitialPadNames,
  createInitialPadSampleSettings,
  createInitialPadStepOctaves,
  createInitialPadStepLength,
  createInitialPadStepSequence,
  createInitialPadVolumes,
  DEFAULT_SAMPLE_POLYPHONY,
  DEFAULT_PAD_SAMPLE_SETTINGS,
  createKeyboardPadMap,
  DEFAULT_PAD_VOLUME,
  DRUM_PADS,
  normalizePadSampleSettings,
  PAD_TRIGGER_DURATION_MS,
  readPersistedSampleSoundsDir,
  writePersistedSampleSoundsDir,
} from "./DrumpadController.utilities";
import { useKeyboardTransposeHotkeys } from "../KeyboardTranspose/KeyboardTranspose.hooks";
import {
  formatSemitoneOffsetAsOctaves,
  normalizeTransposeSemitoneOffset,
  OCTAVE_TRANSPOSE_SEMITONES,
  MAX_TRANSPOSE_STEP_DIGIT,
  TRANSPOSE_STEP_SEMITONES,
} from "../KeyboardTranspose/KeyboardTranspose.utilities";
import { fetchSampleAssets } from "../../integrations/samples/sample.client";
import {
  clearPersistedDirectoryHandle,
  isDirectoryPickerSupported,
  openDirectoryPicker,
  queryDirectoryReadPermission,
  readPersistedDirectoryHandle,
  requestDirectoryReadPermission,
  scanDirectoryHandleForSamples,
  writePersistedDirectoryHandle,
} from "../../integrations/samples/sample.file-system";
import type {
  SampleAsset,
  SampleMetadataOverride,
  SampleMetadataOverrides,
} from "../../integrations/samples/sample.types";
import {
  applySampleMetadataOverride,
  buildSearchTextForSampleAsset,
  readSampleMetadataOverrides,
  writeSampleMetadataOverrides,
} from "../../integrations/samples/sample.utilities";
import type {
  DrumKitState,
  KitArchiveManifest,
  SavedDrumKit,
} from "../KitManager/KitManager.types";
import {
  KIT_ARCHIVE_MANIFEST_FILE_NAME,
  createKitArchiveFileName,
  createKitArchiveSampleFileName,
  createSavedKitId,
  encodeAudioBufferToWav,
  isKitArchiveManifest,
  readSavedKitsFromSession,
  writeSavedKitsToSession,
} from "../KitManager/KitManager.utilities";
import type {
  ProjectArchiveManifest,
  ProjectState,
  SavedProject,
} from "../ProjectManager/ProjectManager.types";
import {
  PROJECT_ARCHIVE_MANIFEST_FILE_NAME,
  createProjectArchiveFileName,
  createSavedProjectId,
  isProjectArchiveManifest,
  PROJECT_NAME_MAX_LENGTH,
  readSavedProjectsFromSession,
  sanitizeProjectName,
  writeSavedProjectsToSession,
} from "../ProjectManager/ProjectManager.utilities";

const SEQUENCER_STEP_LENGTH_OPTIONS: SequencerStepLength[] = ["1/4", "1/8", "1/16", "1/32"];
const TRANSPORT_SCHEDULER_INTERVAL_MS = 20;
const TRANSPORT_SCHEDULE_AHEAD_TIME_SECONDS = 0.1;
const VOICE_STOP_FADE_SECONDS = 0.005;
const IMPORTED_SAMPLE_ID_PREFIX = "imported";
const IMPORTED_PROJECT_SAMPLE_ID_PREFIX = "imported-project";
const PROJECT_ARCHIVE_ACCEPT = ".zip,.noodlr-project.zip,application/zip";
const KIT_ARCHIVE_ACCEPT = ".zip,.noodlr-kit.zip,application/zip";
const DEMO_KIT_ARCHIVE_URL = "/demo/Kit-2026-02-15T23-21-50.noodlr-kit.zip";
const DEMO_KIT_ARCHIVE_FILE_NAME = "Kit-2026-02-15T23-21-50.noodlr-kit.zip";
const DEMO_KIT_AUTOLOAD_STORAGE_KEY = "noodlr.demoKitAutoLoaded.v1";
const EMPTY_STEP_OCTAVE_SEQUENCE = Array.from({ length: STEPS_IN_SEQUENCE }, () => 0);
const RECORD_COUNT_IN_BEATS = 4;

type ActiveOneShotVoice = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
};

type ActiveLoopVoice = {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  releaseSeconds: number;
};

const isSequencerStepLength = (value: unknown): value is SequencerStepLength => {
  return (
    typeof value === "string" &&
    SEQUENCER_STEP_LENGTH_OPTIONS.includes(value as SequencerStepLength)
  );
};

const clonePadStepSequence = (padStepSequence: PadStepSequence): PadStepSequence => {
  return Object.fromEntries(
    Object.entries(padStepSequence).map(([padId, steps]) => [padId, [...steps]])
  ) as PadStepSequence;
};

const clonePadStepOctaves = (padStepOctaves: PadStepOctaves): PadStepOctaves => {
  return Object.fromEntries(
    Object.entries(padStepOctaves).map(([padId, stepOctaves]) => [padId, [...stepOctaves]])
  ) as PadStepOctaves;
};

const clonePadStepLength = (padStepLength: PadStepLength): PadStepLength => {
  return { ...padStepLength };
};

const getNormalizedStepOctaveSemitoneOffset = (candidateValue: unknown): number => {
  return normalizeTransposeSemitoneOffset(
    candidateValue,
    TRANSPOSE_STEP_SEMITONES,
    MAX_TRANSPOSE_STEP_DIGIT
  );
};

const createDefaultSequencerPattern = (): SequencerPattern => {
  return {
    id: createSavedKitId(),
    name: "Pattern 1",
    padStepSequence: createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE),
    padStepOctaves: createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE),
    padStepLength: createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH),
  };
};

const createDuplicatePatternName = (sourcePatternName: string, existingNames: string[]): string => {
  const normalizedExistingNames = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const baseDuplicateName = `${sourcePatternName.trim() || "Pattern"} Copy`;

  if (!normalizedExistingNames.has(baseDuplicateName.toLowerCase())) {
    return baseDuplicateName;
  }

  let duplicateSuffix = 2;
  while (normalizedExistingNames.has(`${baseDuplicateName} ${duplicateSuffix}`.toLowerCase())) {
    duplicateSuffix += 1;
  }

  return `${baseDuplicateName} ${duplicateSuffix}`;
};

const isEditableEventTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
  );
};

const hasDemoKitAutoLoaded = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(DEMO_KIT_AUTOLOAD_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const markDemoKitAutoLoaded = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_KIT_AUTOLOAD_STORAGE_KEY, "1");
  } catch {
    // Ignore localStorage errors; demo kit still imports.
  }
};

const DrumpadController = () => {
  const getInitialSampleRootDir = () => readPersistedSampleSoundsDir();
  const initialPattern = useMemo(() => createDefaultSequencerPattern(), []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_PAD_VOLUME);
  const [padVolumes, setPadVolumes] = useState<PadVolumes>({});
  const [padNames, setPadNames] = useState<PadNames>({});
  const [padPolyphony, setPadPolyphony] = useState<PadPolyphony>({});
  const [padLoopEnabled, setPadLoopEnabled] = useState<PadLoopEnabled>({});
  const [padRowMuted, setPadRowMuted] = useState<PadRowMuted>({});
  const [padSampleSettings, setPadSampleSettings] = useState<PadSampleSettingsMap>({});
  const [padStepSequence, setPadStepSequence] = useState<PadStepSequence>(() =>
    clonePadStepSequence(initialPattern.padStepSequence)
  );
  const [padStepOctaves, setPadStepOctaves] = useState<PadStepOctaves>(() =>
    clonePadStepOctaves(initialPattern.padStepOctaves)
  );
  const [padStepLength, setPadStepLength] = useState<PadStepLength>(() =>
    clonePadStepLength(initialPattern.padStepLength)
  );
  const [sequencerPatterns, setSequencerPatterns] = useState<SequencerPattern[]>(() => [
    initialPattern,
  ]);
  const [activePatternId, setActivePatternId] = useState<string>(() => initialPattern.id);
  const [padSampleIds, setPadSampleIds] = useState<PadSampleIds>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isMetronomeEnabled, setIsMetronomeEnabled] = useState(false);
  const [countInBeatsRemaining, setCountInBeatsRemaining] = useState<number | null>(null);
  const [sequencerBpm, setSequencerBpm] = useState(DEFAULT_SEQUENCER_BPM);
  const [sequencerClockStepLength, setSequencerClockStepLength] = useState<SequencerStepLength>(
    BASE_SEQUENCER_STEP_LENGTH
  );
  const [savedKits, setSavedKits] = useState<SavedDrumKit[]>(() => readSavedKitsFromSession());
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() =>
    readSavedProjectsFromSession()
  );
  const [editingPadId, setEditingPadId] = useState<number | null>(null);
  const [sampleAssignPadId, setSampleAssignPadId] = useState<number | null>(null);
  const [padEditorSaveMessage, setPadEditorSaveMessage] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isSaveProjectModalOpen, setIsSaveProjectModalOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [sampleRootDir, setSampleRootDir] = useState(getInitialSampleRootDir);
  const [sampleRootDirDraft, setSampleRootDirDraft] = useState(getInitialSampleRootDir);
  const [sampleDirectoryHandle, setSampleDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [isSelectingSampleDirectory, setIsSelectingSampleDirectory] = useState(false);
  const [supportsDirectoryPicker] = useState(() => isDirectoryPickerSupported());
  const [isSampleRootDirPromptOpen, setIsSampleRootDirPromptOpen] = useState(
    () => !Boolean(getInitialSampleRootDir().trim())
  );
  const [isImportingDemoKit, setIsImportingDemoKit] = useState(false);
  const [sampleSearch, setSampleSearch] = useState("");
  const [sampleAssets, setSampleAssets] = useState<SampleAsset[]>([]);
  const [importedSampleAssets, setImportedSampleAssets] = useState<SampleAsset[]>([]);
  const [sampleMetadataOverrides, setSampleMetadataOverrides] =
    useState<SampleMetadataOverrides>(() => readSampleMetadataOverrides());
  const [isLoadingSampleAssets, setIsLoadingSampleAssets] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioContextResumePendingRef = useRef<Promise<void> | null>(null);
  const sampleBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sampleBufferPendingRef = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map());
  const importedSampleObjectUrlsRef = useRef<Set<string>>(new Set());
  const localSampleObjectUrlsRef = useRef<Set<string>>(new Set());
  const activeBufferSourcesByPadRef = useRef<Map<number, ActiveOneShotVoice[]>>(new Map());
  const activeLoopBufferSourcesByPadRef = useRef<Map<number, ActiveLoopVoice>>(new Map());
  const activeMetronomeSourcesRef = useRef<Set<OscillatorNode>>(new Set());
  const previewBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const outputCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const outputCompressorContextRef = useRef<AudioContext | null>(null);
  const reverbImpulseBufferRef = useRef<AudioBuffer | null>(null);
  const reverbImpulseBufferContextRef = useRef<AudioContext | null>(null);
  const playAssignedSampleRef = useRef<
    (padId: number, scheduledTime?: number, transposeSemitoneOffset?: number) => void
  >(() => {});
  const isPlayingRef = useRef(false);
  const padLoopEnabledRef = useRef<PadLoopEnabled>({});
  const padRowMutedRef = useRef<PadRowMuted>({});
  const padSampleSettingsRef = useRef<PadSampleSettingsMap>({});
  const padSampleIdsRef = useRef<PadSampleIds>({});
  const padStepSequenceRef = useRef<PadStepSequence>({});
  const padStepOctavesRef = useRef<PadStepOctaves>({});
  const padStepLengthRef = useRef<PadStepLength>({});
  const currentTickRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isMetronomeEnabledRef = useRef(false);
  const countInTimeoutsRef = useRef<number[]>([]);
  const isCountInActiveRef = useRef(false);
  const scheduledTickVisualTimeoutsRef = useRef<number[]>([]);
  const padButtonElementsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const padFlashTimeoutsRef = useRef<Map<number, number>>(new Map());
  const sampleRootPromptProjectInputRef = useRef<HTMLInputElement | null>(null);
  const sampleRootPromptKitInputRef = useRef<HTMLInputElement | null>(null);
  const { heldTransposeSemitoneOffset, getCurrentTransposeSemitoneOffset } =
    useKeyboardTransposeHotkeys({
      isEditableEventTarget,
      maxTransposeSteps: MAX_TRANSPOSE_STEP_DIGIT,
      transposeStepSemitones: TRANSPOSE_STEP_SEMITONES,
    });

  const keyboardPadMap = useMemo(() => createKeyboardPadMap(DRUM_PADS), []);
  const combinedSampleAssets = useMemo(
    () => [...sampleAssets, ...importedSampleAssets],
    [importedSampleAssets, sampleAssets]
  );
  const effectiveSampleAssets = useMemo(() => {
    return combinedSampleAssets.map((sample) =>
      applySampleMetadataOverride(sample, sampleMetadataOverrides[sample.id])
    );
  }, [combinedSampleAssets, sampleMetadataOverrides]);

  const sampleAssetsById = useMemo(() => {
    const map = new Map<string, SampleAsset>();
    effectiveSampleAssets.forEach((sample) => map.set(sample.id, sample));
    return map;
  }, [effectiveSampleAssets]);

  const filteredSampleAssets = useMemo(() => {
    const normalizedQuery = sampleSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return effectiveSampleAssets;
    }

    return effectiveSampleAssets.filter((sample) =>
      buildSearchTextForSampleAsset(sample).includes(normalizedQuery)
    );
  }, [effectiveSampleAssets, sampleSearch]);

  const heldTransposeOctaveOffsetLabel = useMemo(() => {
    const formattedOffset = formatSemitoneOffsetAsOctaves(
      heldTransposeSemitoneOffset,
      OCTAVE_TRANSPOSE_SEMITONES
    );
    return formattedOffset ? `${formattedOffset} oct` : "Off";
  }, [heldTransposeSemitoneOffset]);

  const padAssignedSamples = useMemo<PadAssignedSamples>(() => {
    const assignments: PadAssignedSamples = {};
    Object.entries(padSampleIds).forEach(([padIdRaw, sampleId]) => {
      const padId = Number(padIdRaw);
      assignments[padId] = sampleId ? sampleAssetsById.get(sampleId) ?? null : null;
    });
    return assignments;
  }, [padSampleIds, sampleAssetsById]);

  const sequencerRows = useMemo(() => {
    return DRUM_PADS.filter((pad) => Boolean(padAssignedSamples[pad.id])).map((pad) => ({
      padId: pad.id,
      padLabel: padNames[pad.id] ?? pad.label,
      padKey: pad.key,
      sampleName: padAssignedSamples[pad.id]?.name ?? "",
      isMuted: padRowMuted[pad.id] ?? false,
      stepLength: (padStepLength[pad.id] ?? DEFAULT_ROW_STEP_LENGTH) as SequencerStepLength,
      steps: padStepSequence[pad.id] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE),
      stepOctaves: padStepOctaves[pad.id] ?? EMPTY_STEP_OCTAVE_SEQUENCE,
    }));
  }, [padAssignedSamples, padNames, padRowMuted, padStepLength, padStepOctaves, padStepSequence]);

  const sequencerEngineStepLength = useMemo(() => {
    const rowStepLengths = sequencerRows.map((row) => row.stepLength);
    return getShortestStepLength([sequencerClockStepLength, ...rowStepLengths]);
  }, [sequencerClockStepLength, sequencerRows]);

  const currentMainStep = useMemo(() => {
    const ticksPerMainStep = getStepLengthTickMultiplier(
      sequencerClockStepLength,
      sequencerEngineStepLength
    );
    return Math.floor(currentStep / ticksPerMainStep);
  }, [currentStep, sequencerClockStepLength, sequencerEngineStepLength]);

  const patternOptions = useMemo(() => {
    return sequencerPatterns.map((pattern) => ({
      id: pattern.id,
      name: pattern.name,
    }));
  }, [sequencerPatterns]);

  const projectOptions = useMemo<ProjectOption[]>(() => {
    return savedProjects.map((savedProject) => ({
      id: savedProject.id,
      name: savedProject.name,
    }));
  }, [savedProjects]);

  const selectedProject = useMemo(() => {
    return savedProjects.find((savedProject) => savedProject.id === selectedProjectId) ?? null;
  }, [savedProjects, selectedProjectId]);

  const editingPad = useMemo(() => {
    if (editingPadId === null) {
      return null;
    }

    return DRUM_PADS.find((pad) => pad.id === editingPadId) ?? null;
  }, [editingPadId]);

  const sampleAssignPad = useMemo(() => {
    if (sampleAssignPadId === null) {
      return null;
    }

    return DRUM_PADS.find((pad) => pad.id === sampleAssignPadId) ?? null;
  }, [sampleAssignPadId]);

  const editingPadSampleId = useMemo(() => {
    if (!editingPad) {
      return "";
    }

    return padSampleIds[editingPad.id] ?? "";
  }, [editingPad, padSampleIds]);

  padLoopEnabledRef.current = padLoopEnabled;
  padRowMutedRef.current = padRowMuted;
  padSampleSettingsRef.current = padSampleSettings;
  padSampleIdsRef.current = padSampleIds;
  padStepSequenceRef.current = padStepSequence;
  padStepOctavesRef.current = padStepOctaves;
  padStepLengthRef.current = padStepLength;
  currentTickRef.current = currentStep;
  isPlayingRef.current = isPlaying;
  isRecordingRef.current = isRecording;
  isMetronomeEnabledRef.current = isMetronomeEnabled;

  useEffect(() => {
    setPadVolumes(createInitialPadVolumes(DRUM_PADS));
    setPadNames(createInitialPadNames(DRUM_PADS));
    setPadPolyphony(createInitialPadPolyphony(DRUM_PADS));
    setPadLoopEnabled(createInitialPadLoopEnabled(DRUM_PADS));
    setPadRowMuted(createInitialPadRowMuted(DRUM_PADS));
    setPadSampleSettings(createInitialPadSampleSettings(DRUM_PADS));
    setPadStepSequence(createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE));
    setPadStepOctaves(createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE));
    setPadStepLength(createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH));
  }, []);

  useEffect(() => {
    if (!activePatternId) {
      return;
    }

    setSequencerPatterns((previous) =>
      previous.map((pattern) =>
        pattern.id === activePatternId
          ? {
              ...pattern,
              padStepSequence: clonePadStepSequence(padStepSequence),
              padStepOctaves: clonePadStepOctaves(padStepOctaves),
              padStepLength: clonePadStepLength(padStepLength),
            }
          : pattern
      )
    );
  }, [activePatternId, padStepLength, padStepOctaves, padStepSequence]);

  useEffect(() => {
    if (!sequencerPatterns.length) {
      return;
    }

    const activePattern = sequencerPatterns.find((pattern) => pattern.id === activePatternId);
    if (activePattern) {
      return;
    }

    const fallbackPattern = sequencerPatterns[0];
    setActivePatternId(fallbackPattern.id);
    setPadStepSequence(clonePadStepSequence(fallbackPattern.padStepSequence));
    setPadStepOctaves(clonePadStepOctaves(fallbackPattern.padStepOctaves));
    setPadStepLength(clonePadStepLength(fallbackPattern.padStepLength));
  }, [activePatternId, sequencerPatterns]);

  const buildDrumKitStateSnapshot = useCallback((): DrumKitState => {
    return {
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPolyphony: { ...padPolyphony },
      padLoopEnabled: { ...padLoopEnabled },
      padSampleIds: { ...padSampleIds },
      padSampleSettings: Object.fromEntries(
        DRUM_PADS.map((pad) => [
          pad.id,
          normalizePadSampleSettings(padSampleSettings[pad.id]),
        ])
      ) as PadSampleSettingsMap,
    };
  }, [
    padLoopEnabled,
    padNames,
    padPolyphony,
    padSampleSettings,
    padSampleIds,
    padVolumes,
    normalizePadSampleSettings,
  ]);

  const buildProjectStateSnapshot = useCallback((): ProjectState => {
    return {
      masterVolume,
      padVolumes: { ...padVolumes },
      padNames: { ...padNames },
      padPolyphony: { ...padPolyphony },
      padLoopEnabled: { ...padLoopEnabled },
      padRowMuted: { ...padRowMuted },
      padSampleIds: { ...padSampleIds },
      padSampleSettings: Object.fromEntries(
        DRUM_PADS.map((pad) => [
          pad.id,
          normalizePadSampleSettings(padSampleSettings[pad.id]),
        ])
      ) as PadSampleSettingsMap,
      padStepSequence: clonePadStepSequence(padStepSequence),
      padStepOctaves: clonePadStepOctaves(padStepOctaves),
      padStepLength: clonePadStepLength(padStepLength),
      sequencerPatterns: sequencerPatterns.map((pattern) => ({
        ...pattern,
        padStepSequence: clonePadStepSequence(pattern.padStepSequence),
        padStepOctaves: clonePadStepOctaves(pattern.padStepOctaves),
        padStepLength: clonePadStepLength(pattern.padStepLength),
      })),
      activePatternId,
      sequencerBpm,
      sequencerClockStepLength,
      isMetronomeEnabled,
    };
  }, [
    activePatternId,
    isMetronomeEnabled,
    masterVolume,
    padLoopEnabled,
    padNames,
    padPolyphony,
    padRowMuted,
    padSampleSettings,
    padSampleIds,
    padStepLength,
    padStepOctaves,
    padStepSequence,
    padVolumes,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerPatterns,
    normalizePadSampleSettings,
  ]);

  const normalizePadStepSequence = useCallback((candidate: PadStepSequence): PadStepSequence => {
    const defaults = createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE);

    DRUM_PADS.forEach((pad) => {
      const candidateSteps = candidate[pad.id];
      if (!Array.isArray(candidateSteps)) {
        return;
      }

      defaults[pad.id] = Array.from({ length: STEPS_IN_SEQUENCE }, (_, index) =>
        Boolean(candidateSteps[index])
      );
    });

    return defaults;
  }, []);

  const normalizePadStepOctaves = useCallback((candidate: PadStepOctaves): PadStepOctaves => {
    const defaults = createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE);

    DRUM_PADS.forEach((pad) => {
      const candidateStepOctaves = candidate[pad.id];
      if (!Array.isArray(candidateStepOctaves)) {
        return;
      }

      defaults[pad.id] = Array.from({ length: STEPS_IN_SEQUENCE }, (_, index) =>
        getNormalizedStepOctaveSemitoneOffset(candidateStepOctaves[index])
      );
    });

    return defaults;
  }, []);

  const normalizePadStepLength = useCallback((candidate: PadStepLength): PadStepLength => {
    const defaults = createInitialPadStepLength(DRUM_PADS, DEFAULT_ROW_STEP_LENGTH);

    DRUM_PADS.forEach((pad) => {
      const candidateStepLength = candidate[pad.id];
      if (isSequencerStepLength(candidateStepLength)) {
        defaults[pad.id] = candidateStepLength;
      }
    });

    return defaults;
  }, []);

  const normalizePadSampleSettingsMap = useCallback(
    (candidate?: Partial<PadSampleSettingsMap>): PadSampleSettingsMap => {
      const defaults = createInitialPadSampleSettings(DRUM_PADS);

      DRUM_PADS.forEach((pad) => {
        defaults[pad.id] = normalizePadSampleSettings(candidate?.[pad.id]);
      });

      return defaults;
    },
    []
  );

  const normalizeSequencerPatterns = useCallback(
    (candidatePatterns: unknown): SequencerPattern[] => {
      if (!Array.isArray(candidatePatterns)) {
        return [];
      }

      const normalizedPatterns = candidatePatterns
        .map((candidatePattern, index) => {
          if (!candidatePattern || typeof candidatePattern !== "object") {
            return null;
          }

          const patternRecord = candidatePattern as Record<string, unknown>;
          const patternName =
            typeof patternRecord.name === "string" && patternRecord.name.trim()
              ? patternRecord.name.trim()
              : `Pattern ${index + 1}`;
          const patternId =
            typeof patternRecord.id === "string" && patternRecord.id.trim()
              ? patternRecord.id
              : createSavedKitId();

          return {
            id: patternId,
            name: patternName,
            padStepSequence: normalizePadStepSequence(
              (patternRecord.padStepSequence as PadStepSequence) ?? ({} as PadStepSequence)
            ),
            padStepOctaves: normalizePadStepOctaves(
              (patternRecord.padStepOctaves as PadStepOctaves) ?? ({} as PadStepOctaves)
            ),
            padStepLength: normalizePadStepLength(
              (patternRecord.padStepLength as PadStepLength) ?? ({} as PadStepLength)
            ),
          } as SequencerPattern;
        })
        .filter((pattern): pattern is SequencerPattern => Boolean(pattern));

      return normalizedPatterns;
    },
    [normalizePadStepLength, normalizePadStepOctaves, normalizePadStepSequence]
  );

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      const maybeWindow = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextConstructor = globalThis.AudioContext || maybeWindow.webkitAudioContext;
      if (!AudioContextConstructor) {
        return null;
      }
      audioContextRef.current = new AudioContextConstructor();
    }

    return audioContextRef.current;
  }, []);

  const ensureAudioContextReady = useCallback(async (): Promise<AudioContext | null> => {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  }, [getAudioContext]);

  const resumeAudioContextIfNeeded = useCallback((context: AudioContext) => {
    if (context.state === "running") {
      return;
    }

    if (audioContextResumePendingRef.current) {
      return;
    }

    audioContextResumePendingRef.current = context
      .resume()
      .catch(() => {
        // Ignore resume failures; next interaction can retry.
      })
      .then(() => undefined)
      .finally(() => {
        audioContextResumePendingRef.current = null;
      });
  }, []);

  const getOutputNode = useCallback((context: AudioContext): AudioNode => {
    if (
      outputCompressorRef.current &&
      outputCompressorContextRef.current === context
    ) {
      return outputCompressorRef.current;
    }

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 10;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.08;
    compressor.connect(context.destination);

    outputCompressorRef.current = compressor;
    outputCompressorContextRef.current = context;

    return compressor;
  }, []);

  const getReverbImpulseBuffer = useCallback((context: AudioContext): AudioBuffer => {
    if (
      reverbImpulseBufferRef.current &&
      reverbImpulseBufferContextRef.current === context
    ) {
      return reverbImpulseBufferRef.current;
    }

    const durationSeconds = 1.8;
    const length = Math.floor(context.sampleRate * durationSeconds);
    const impulseBuffer = context.createBuffer(2, length, context.sampleRate);

    for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
      const channelData = impulseBuffer.getChannelData(channel);
      for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
        const decay = Math.pow(1 - sampleIndex / length, 3);
        channelData[sampleIndex] = (Math.random() * 2 - 1) * decay;
      }
    }

    reverbImpulseBufferRef.current = impulseBuffer;
    reverbImpulseBufferContextRef.current = context;
    return impulseBuffer;
  }, []);

  const createVoiceGainNode = useCallback(
    (context: AudioContext, sampleSettings: PadSampleSettings): GainNode => {
      const outputNode = getOutputNode(context);
      const voiceGainNode = context.createGain();
      const reverbMix = Math.max(0, Math.min(1, sampleSettings.reverbMix));
      const delayMix = Math.max(0, Math.min(1, sampleSettings.delayMix));
      const dryMix = Math.max(0, 1 - Math.min(1, reverbMix + delayMix));

      const dryGainNode = context.createGain();
      dryGainNode.gain.value = dryMix;
      voiceGainNode.connect(dryGainNode);
      dryGainNode.connect(outputNode);

      if (reverbMix > 0.001) {
        const reverbSendGainNode = context.createGain();
        reverbSendGainNode.gain.value = reverbMix;
        const convolverNode = context.createConvolver();
        convolverNode.buffer = getReverbImpulseBuffer(context);

        voiceGainNode.connect(reverbSendGainNode);
        reverbSendGainNode.connect(convolverNode);
        convolverNode.connect(outputNode);
      }

      if (delayMix > 0.001) {
        const delaySendGainNode = context.createGain();
        delaySendGainNode.gain.value = delayMix;

        const delayNode = context.createDelay(1.0);
        delayNode.delayTime.value = Math.max(
          0.001,
          Math.min(1, sampleSettings.delayTimeMs / 1000)
        );

        const feedbackGainNode = context.createGain();
        feedbackGainNode.gain.value = Math.max(
          0,
          Math.min(0.95, sampleSettings.delayFeedback)
        );

        voiceGainNode.connect(delaySendGainNode);
        delaySendGainNode.connect(delayNode);
        delayNode.connect(feedbackGainNode);
        feedbackGainNode.connect(delayNode);
        delayNode.connect(outputNode);
      }

      return voiceGainNode;
    },
    [getOutputNode, getReverbImpulseBuffer]
  );

  const ensureSampleBuffer = useCallback(
    async (sample: SampleAsset): Promise<AudioBuffer | null> => {
      const cachedBuffer = sampleBufferCacheRef.current.get(sample.id);
      if (cachedBuffer) {
        return cachedBuffer;
      }

      const pendingBuffer = sampleBufferPendingRef.current.get(sample.id);
      if (pendingBuffer) {
        return pendingBuffer;
      }

      const pendingPromise = (async () => {
        const context = await ensureAudioContextReady();
        if (!context) {
          return null;
        }

        const response = await fetch(sample.previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to load sample audio: ${sample.name}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
        sampleBufferCacheRef.current.set(sample.id, decodedBuffer);
        return decodedBuffer;
      })();

      sampleBufferPendingRef.current.set(sample.id, pendingPromise);

      try {
        return await pendingPromise;
      } finally {
        sampleBufferPendingRef.current.delete(sample.id);
      }
    },
    [ensureAudioContextReady]
  );

  const playBufferSource = useCallback(
    (
      context: AudioContext,
      sampleBuffer: AudioBuffer,
      padId: number,
      maxVoices: number,
      sampleSettings: PadSampleSettings,
      outputGain: number,
      startTime?: number,
      transposeSemitoneOffset = 0
    ) => {
      const activeVoices = activeBufferSourcesByPadRef.current.get(padId) ?? [];
      while (activeVoices.length >= maxVoices) {
        const oldestVoice = activeVoices.shift();
        if (!oldestVoice) {
          continue;
        }

        try {
          const fadeStartTime = context.currentTime;
          oldestVoice.gainNode.gain.cancelScheduledValues(fadeStartTime);
          oldestVoice.gainNode.gain.setValueAtTime(
            oldestVoice.gainNode.gain.value,
            fadeStartTime
          );
          oldestVoice.gainNode.gain.linearRampToValueAtTime(
            0,
            fadeStartTime + VOICE_STOP_FADE_SECONDS
          );
          oldestVoice.source.stop(fadeStartTime + VOICE_STOP_FADE_SECONDS + 0.001);
        } catch {
          oldestVoice.source.stop();
        }
      }

      const source = context.createBufferSource();
      source.buffer = sampleBuffer;
      const playbackRate = Math.pow(
        2,
        getNormalizedStepOctaveSemitoneOffset(transposeSemitoneOffset) / OCTAVE_TRANSPOSE_SEMITONES
      );
      source.playbackRate.value = playbackRate;

      const gainNode = createVoiceGainNode(context, sampleSettings);
      const scheduledStartTime = startTime ?? context.currentTime;
      const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
      const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
      const releaseSeconds = Math.max(0, sampleSettings.releaseMs / 1000);
      const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
      const sustainGain = outputGain * sustainLevel;
      const attackEndTime = scheduledStartTime + attackSeconds;
      const decayEndTime = attackEndTime + decaySeconds;
      const naturalEndTime = scheduledStartTime + sampleBuffer.duration / playbackRate;

      gainNode.gain.cancelScheduledValues(scheduledStartTime);
      if (attackSeconds > 0) {
        gainNode.gain.setValueAtTime(0, scheduledStartTime);
        gainNode.gain.linearRampToValueAtTime(outputGain, attackEndTime);
      } else {
        gainNode.gain.setValueAtTime(outputGain, scheduledStartTime);
      }

      if (decaySeconds > 0) {
        gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
      } else {
        gainNode.gain.setValueAtTime(sustainGain, attackEndTime);
      }

      if (releaseSeconds > 0) {
        const releaseStartTime = Math.max(decayEndTime, naturalEndTime - releaseSeconds);
        gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
        gainNode.gain.linearRampToValueAtTime(0, naturalEndTime);
      }

      source.connect(gainNode);

      activeVoices.push({ source, gainNode });
      activeBufferSourcesByPadRef.current.set(padId, activeVoices);

      source.onended = () => {
        const currentVoices = activeBufferSourcesByPadRef.current.get(padId) ?? [];
        activeBufferSourcesByPadRef.current.set(
          padId,
          currentVoices.filter((currentVoice) => currentVoice.source !== source)
        );
      };

      source.start(scheduledStartTime);
    },
    [createVoiceGainNode]
  );

  const stopLoopBufferSourceForPad = useCallback((padId: number) => {
    const activeLoopVoice = activeLoopBufferSourcesByPadRef.current.get(padId);
    if (!activeLoopVoice) {
      return;
    }

    try {
      const context = audioContextRef.current;
      const stopStartTime = context?.currentTime;
      const stopFadeSeconds = Math.max(
        VOICE_STOP_FADE_SECONDS,
        activeLoopVoice.releaseSeconds
      );
      if (typeof stopStartTime === "number") {
        activeLoopVoice.gainNode.gain.cancelScheduledValues(stopStartTime);
        activeLoopVoice.gainNode.gain.setValueAtTime(
          activeLoopVoice.gainNode.gain.value,
          stopStartTime
        );
        activeLoopVoice.gainNode.gain.linearRampToValueAtTime(
          0,
          stopStartTime + stopFadeSeconds
        );
        activeLoopVoice.source.stop(stopStartTime + stopFadeSeconds + 0.001);
      } else {
        activeLoopVoice.source.stop();
      }
    } catch {
      // Ignore stop errors if loop already ended.
    }

    activeLoopBufferSourcesByPadRef.current.delete(padId);
  }, []);

  const stopAllLoopBufferSources = useCallback(() => {
    const context = audioContextRef.current;
    const stopStartTime = context?.currentTime;
    activeLoopBufferSourcesByPadRef.current.forEach((loopVoice, padId) => {
      try {
        const stopFadeSeconds = Math.max(
          VOICE_STOP_FADE_SECONDS,
          loopVoice.releaseSeconds
        );
        if (typeof stopStartTime === "number") {
          loopVoice.gainNode.gain.cancelScheduledValues(stopStartTime);
          loopVoice.gainNode.gain.setValueAtTime(
            loopVoice.gainNode.gain.value,
            stopStartTime
          );
          loopVoice.gainNode.gain.linearRampToValueAtTime(
            0,
            stopStartTime + stopFadeSeconds
          );
          loopVoice.source.stop(stopStartTime + stopFadeSeconds + 0.001);
        } else {
          loopVoice.source.stop();
        }
      } catch {
        // Ignore source stop errors during teardown.
      }
      activeLoopBufferSourcesByPadRef.current.delete(padId);
    });
  }, []);

  const stopAllOneShotBufferSources = useCallback(() => {
    const context = audioContextRef.current;
    const fadeStartTime = context?.currentTime;

    activeBufferSourcesByPadRef.current.forEach((voices) => {
      voices.forEach((voice) => {
        try {
          if (typeof fadeStartTime === "number") {
            voice.gainNode.gain.cancelScheduledValues(fadeStartTime);
            voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, fadeStartTime);
            voice.gainNode.gain.linearRampToValueAtTime(
              0,
              fadeStartTime + VOICE_STOP_FADE_SECONDS
            );
            voice.source.stop(fadeStartTime + VOICE_STOP_FADE_SECONDS + 0.001);
          } else {
            voice.source.stop();
          }
        } catch {
          // Ignore source stop errors during transport stop.
        }
      });
    });

    activeBufferSourcesByPadRef.current.clear();
  }, []);

  const stopAllMetronomeSources = useCallback(() => {
    const context = audioContextRef.current;
    const stopTime = context?.currentTime;

    activeMetronomeSourcesRef.current.forEach((source) => {
      try {
        source.stop(typeof stopTime === "number" ? stopTime : undefined);
      } catch {
        // Ignore stop errors if source already ended.
      }
    });
    activeMetronomeSourcesRef.current.clear();
  }, []);

  const scheduleMetronomeTone = useCallback(
    (
      context: AudioContext,
      scheduledTime: number,
      isAccent: boolean,
      metronomeGainLevel: number
    ) => {
      const source = context.createOscillator();
      const gainNode = context.createGain();
      const outputNode = getOutputNode(context);
      const toneDurationSeconds = isAccent ? 0.07 : 0.05;

      source.type = "triangle";
      source.frequency.setValueAtTime(isAccent ? 1680 : 1220, scheduledTime);

      gainNode.gain.setValueAtTime(0.0001, scheduledTime);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, metronomeGainLevel),
        scheduledTime + 0.002
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        scheduledTime + toneDurationSeconds
      );

      source.connect(gainNode);
      gainNode.connect(outputNode);

      activeMetronomeSourcesRef.current.add(source);
      source.onended = () => {
        activeMetronomeSourcesRef.current.delete(source);
      };

      source.start(scheduledTime);
      source.stop(scheduledTime + toneDurationSeconds + 0.001);
    },
    [getOutputNode]
  );

  const clearCountInTimeouts = useCallback(() => {
    countInTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    countInTimeoutsRef.current = [];
  }, []);

  const cancelCountIn = useCallback(() => {
    isCountInActiveRef.current = false;
    clearCountInTimeouts();
    stopAllMetronomeSources();
    setCountInBeatsRemaining(null);
  }, [clearCountInTimeouts, stopAllMetronomeSources]);

  const startRecordCountIn = useCallback(() => {
    if (isCountInActiveRef.current || isPlayingRef.current) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const startCountInScheduler = () => {
      if (isCountInActiveRef.current || isPlayingRef.current || !isRecordingRef.current) {
        return;
      }

      clearCountInTimeouts();
      stopAllMetronomeSources();
      currentTickRef.current = 0;
      setCurrentStep(0);
      isCountInActiveRef.current = true;
      setCountInBeatsRemaining(RECORD_COUNT_IN_BEATS);

      const beatDurationSeconds = 60 / clampSequencerBpm(sequencerBpm);
      const startTimeSeconds = context.currentTime + 0.04;
      const metronomeGainLevel = Math.max(0.02, (masterVolume / 100) * 0.24);

      for (let beatIndex = 0; beatIndex < RECORD_COUNT_IN_BEATS; beatIndex += 1) {
        const beatTimeSeconds = startTimeSeconds + beatIndex * beatDurationSeconds;
        scheduleMetronomeTone(
          context,
          beatTimeSeconds,
          beatIndex === 0,
          beatIndex === 0 ? metronomeGainLevel : metronomeGainLevel * 0.8
        );

        const displayCountdownValue = RECORD_COUNT_IN_BEATS - beatIndex;
        const updateTimeoutId = window.setTimeout(
          () => {
            if (!isCountInActiveRef.current) {
              return;
            }
            setCountInBeatsRemaining(displayCountdownValue);
          },
          Math.max(0, (beatTimeSeconds - context.currentTime) * 1000)
        );
        countInTimeoutsRef.current.push(updateTimeoutId);
      }

      const startPlaybackTimeoutId = window.setTimeout(
        () => {
          if (!isCountInActiveRef.current || !isRecordingRef.current) {
            return;
          }

          isCountInActiveRef.current = false;
          clearCountInTimeouts();
          stopAllMetronomeSources();
          setCountInBeatsRemaining(null);
          currentTickRef.current = 0;
          setCurrentStep(0);
          setIsPlaying(true);
        },
        Math.max(0, (startTimeSeconds + RECORD_COUNT_IN_BEATS * beatDurationSeconds - context.currentTime) * 1000)
      );
      countInTimeoutsRef.current.push(startPlaybackTimeoutId);
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(() => {
          startCountInScheduler();
        })
        .catch(() => {
          // Ignore resume failures; next interaction can retry.
        });
      return;
    }

    startCountInScheduler();
  }, [
    clearCountInTimeouts,
    getAudioContext,
    masterVolume,
    scheduleMetronomeTone,
    sequencerBpm,
    stopAllMetronomeSources,
  ]);

  const playLoopBufferSource = useCallback(
    (
      context: AudioContext,
      sampleBuffer: AudioBuffer,
      padId: number,
      sampleSettings: PadSampleSettings,
      outputGain: number,
      startTime?: number,
      transposeSemitoneOffset = 0
    ) => {
      stopLoopBufferSourceForPad(padId);

      const source = context.createBufferSource();
      source.buffer = sampleBuffer;
      source.loop = true;
      source.playbackRate.value = Math.pow(
        2,
        getNormalizedStepOctaveSemitoneOffset(transposeSemitoneOffset) / OCTAVE_TRANSPOSE_SEMITONES
      );

      const gainNode = createVoiceGainNode(context, sampleSettings);
      const scheduledStartTime = startTime ?? context.currentTime;
      const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
      const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
      const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
      const sustainGain = outputGain * sustainLevel;

      gainNode.gain.cancelScheduledValues(scheduledStartTime);
      if (attackSeconds > 0) {
        gainNode.gain.setValueAtTime(0, scheduledStartTime);
        gainNode.gain.linearRampToValueAtTime(outputGain, scheduledStartTime + attackSeconds);
      } else {
        gainNode.gain.setValueAtTime(outputGain, scheduledStartTime);
      }
      if (decaySeconds > 0) {
        gainNode.gain.linearRampToValueAtTime(
          sustainGain,
          scheduledStartTime + attackSeconds + decaySeconds
        );
      } else {
        gainNode.gain.setValueAtTime(sustainGain, scheduledStartTime + attackSeconds);
      }

      source.connect(gainNode);

      source.onended = () => {
        const activeLoopVoice = activeLoopBufferSourcesByPadRef.current.get(padId);
        if (activeLoopVoice?.source === source) {
          activeLoopBufferSourcesByPadRef.current.delete(padId);
        }
      };

      activeLoopBufferSourcesByPadRef.current.set(padId, {
        source,
        gainNode,
        releaseSeconds: Math.max(0, sampleSettings.releaseMs / 1000),
      });
      source.start(scheduledStartTime);
    },
    [createVoiceGainNode, stopLoopBufferSourceForPad]
  );

  const playAssignedSample = useCallback(
    (padId: number, scheduledTime?: number, transposeSemitoneOffset = 0) => {
      const assignedSample = padAssignedSamples[padId];
      if (!assignedSample) {
        stopLoopBufferSourceForPad(padId);
        return;
      }

      const padVolume = padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
      const outputGain = Math.max(0, Math.min(1, (masterVolume / 100) * (padVolume / 100)));
      const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
      const context = getAudioContext();
      if (!context) {
        return;
      }

      const cachedBuffer = sampleBufferCacheRef.current.get(assignedSample.id);
      const isLoopEnabled = padLoopEnabled[padId] ?? false;

      if (isLoopEnabled) {
        if (context.state === "running" && cachedBuffer) {
          playLoopBufferSource(
            context,
            cachedBuffer,
            padId,
            sampleSettings,
            outputGain,
            scheduledTime,
            transposeSemitoneOffset
          );
          return;
        }

        if (context.state !== "running") {
          resumeAudioContextIfNeeded(context);
        }

        void ensureSampleBuffer(assignedSample)
          .then((sampleBuffer) => {
            if (!sampleBuffer) {
              return;
            }

            if (!padLoopEnabledRef.current[padId]) {
              return;
            }

            if (padSampleIdsRef.current[padId] !== assignedSample.id) {
              return;
            }

            const activeContext = getAudioContext();
            if (!activeContext || activeContext.state !== "running") {
              return;
            }

            const activeSampleSettings =
              padSampleSettingsRef.current[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
            playLoopBufferSource(
              activeContext,
              sampleBuffer,
              padId,
              activeSampleSettings,
              outputGain,
              scheduledTime,
              transposeSemitoneOffset
            );
          })
          .catch(() => {
            // Ignore warmup errors.
          });
        return;
      }

      stopLoopBufferSourceForPad(padId);

      const maxVoices = padPolyphony[padId] ?? DEFAULT_SAMPLE_POLYPHONY;

      // Hot path: if context + decoded buffer are ready, playback starts immediately.
      if (context && context.state === "running" && cachedBuffer) {
        playBufferSource(
          context,
          cachedBuffer,
          padId,
          maxVoices,
          sampleSettings,
          outputGain,
          scheduledTime,
          transposeSemitoneOffset
        );
        return;
      }

      // Never queue delayed hits: resume/warm in background and wait for the next press.
      if (context.state !== "running") {
        resumeAudioContextIfNeeded(context);
      }

      void ensureSampleBuffer(assignedSample).catch(() => {
        // Ignore warmup errors.
      });
    },
    [
      ensureSampleBuffer,
      getAudioContext,
      masterVolume,
      padAssignedSamples,
      padLoopEnabled,
      padSampleSettings,
      padPolyphony,
      padSampleIds,
      padVolumes,
      playBufferSource,
      playLoopBufferSource,
      resumeAudioContextIfNeeded,
      stopLoopBufferSourceForPad,
    ]
  );

  playAssignedSampleRef.current = playAssignedSample;

  const clearScheduledTickVisualTimeouts = useCallback(() => {
    scheduledTickVisualTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scheduledTickVisualTimeoutsRef.current = [];
  }, []);

  const stopPreviewBufferSource = useCallback(() => {
    const currentPreviewSource = previewBufferSourceRef.current;
    if (!currentPreviewSource) {
      return;
    }

    try {
      currentPreviewSource.stop();
    } catch {
      // Ignore stop errors if preview already ended.
    }

    previewBufferSourceRef.current = null;
  }, []);

  const handlePreviewSample = useCallback(
    (sampleId: string) => {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        return;
      }

      void (async () => {
        const context = await ensureAudioContextReady();
        if (!context) {
          return;
        }

        const sampleBuffer =
          sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
        if (!sampleBuffer) {
          return;
        }

        stopPreviewBufferSource();

        const previewSource = context.createBufferSource();
        previewSource.buffer = sampleBuffer;

        const gainNode = context.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, masterVolume / 100));

        previewSource.connect(gainNode);
        gainNode.connect(getOutputNode(context));

        previewSource.onended = () => {
          if (previewBufferSourceRef.current === previewSource) {
            previewBufferSourceRef.current = null;
          }
        };

        previewBufferSourceRef.current = previewSource;
        previewSource.start(0);
      })().catch(() => {
        // Ignore preview failures so normal workflow remains unaffected.
      });
    },
    [
      ensureAudioContextReady,
      ensureSampleBuffer,
      getOutputNode,
      masterVolume,
      sampleAssetsById,
      stopPreviewBufferSource,
    ]
  );

  const handlePadButtonMount = useCallback((padId: number, buttonElement: HTMLButtonElement | null) => {
    if (buttonElement) {
      padButtonElementsRef.current.set(padId, buttonElement);
    } else {
      padButtonElementsRef.current.delete(padId);
    }
  }, []);

  const flashPadVisual = useCallback((padId: number) => {
    const buttonElement = padButtonElementsRef.current.get(padId);
    if (!buttonElement) {
      return;
    }

    const activeClassTokens = padActiveClassName.split(" ");
    activeClassTokens.forEach((classToken) => buttonElement.classList.add(classToken));

    const existingTimeout = padFlashTimeoutsRef.current.get(padId);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      const latestButtonElement = padButtonElementsRef.current.get(padId);
      if (latestButtonElement) {
        activeClassTokens.forEach((classToken) => latestButtonElement.classList.remove(classToken));
      }
      padFlashTimeoutsRef.current.delete(padId);
    }, PAD_TRIGGER_DURATION_MS);

    padFlashTimeoutsRef.current.set(padId, timeoutId);
  }, []);

  const handlePadPress = useCallback(
    (padId: number, transposeSemitoneOffset = 0) => {
      flashPadVisual(padId);
      playAssignedSample(padId, undefined, transposeSemitoneOffset);
    },
    [flashPadVisual, playAssignedSample]
  );

  const handleTogglePlayback = useCallback(() => {
    if (isCountInActiveRef.current) {
      cancelCountIn();
      return;
    }

    if (isPlayingRef.current) {
      setIsPlaying(false);
      stopAllLoopBufferSources();
      stopAllOneShotBufferSources();
      stopAllMetronomeSources();
      stopPreviewBufferSource();
      clearScheduledTickVisualTimeouts();
      return;
    }

    if (isMetronomeEnabledRef.current && isRecordingRef.current) {
      startRecordCountIn();
      return;
    }

    currentTickRef.current = 0;
    setCurrentStep(0);
    setIsPlaying(true);
  }, [
    cancelCountIn,
    clearScheduledTickVisualTimeouts,
    startRecordCountIn,
    stopAllMetronomeSources,
    stopAllLoopBufferSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  ]);

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
  }, [sequencerPatterns.length]);

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
      name: createDuplicatePatternName(
        sourcePattern.name,
        sequencerPatterns.map((pattern) => pattern.name)
      ),
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
  }, [activePatternId, padStepLength, padStepOctaves, padStepSequence, sequencerPatterns]);

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
  }, [activePatternId, sequencerPatterns]);

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
    [sequencerPatterns]
  );

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
    {
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
    }
  }, []);

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
      const previousSteps = padStepSequenceRef.current[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
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
    []
  );

  const handleSequencerRowStepLengthChange = useCallback(
    (padId: number, stepLength: SequencerStepLength) => {
      setPadStepLength((previous) => ({
        ...previous,
        [padId]: stepLength,
      }));
    },
    []
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
    [stopLoopBufferSourceForPad]
  );

  const handleSequencerBpmChange = useCallback((value: number) => {
    setSequencerBpm(clampSequencerBpm(value));
  }, []);

  const handleSequencerClockStepLengthChange = useCallback((stepLength: SequencerStepLength) => {
    setSequencerClockStepLength(stepLength);
  }, []);

  const handleToggleRecording = useCallback(() => {
    setIsRecording((previous) => {
      const nextRecording = !previous;
      if (!nextRecording && isCountInActiveRef.current) {
        cancelCountIn();
      }
      return nextRecording;
    });
  }, [cancelCountIn]);

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
  }, [cancelCountIn, stopAllMetronomeSources]);

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
      const stepIndex =
        Math.floor(quantizedTick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
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
    [sequencerEngineStepLength]
  );

  useEffect(() => {
    if (!isPlaying) {
      clearScheduledTickVisualTimeouts();
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    let cancelled = false;
    let schedulerIntervalId: number | null = null;
    let nextTick = 0;
    let nextTickTimeSeconds = 0;
    const clockRateMultiplier = getStepLengthTickMultiplier(
      sequencerClockStepLength,
      BASE_SEQUENCER_STEP_LENGTH
    );
    const metronomeTicksPerBeat = getStepLengthTickMultiplier("1/4", sequencerClockStepLength);
    const metronomeTicksPerBar = metronomeTicksPerBeat * 4;
    const metronomeGainLevel = Math.max(0.02, (masterVolume / 100) * 0.24);
    const secondsPerTick =
      (getSequencerStepDurationMs(sequencerBpm, sequencerEngineStepLength) / 1000) *
      clockRateMultiplier;

    const scheduleTickPlayback = (tick: number, tickTimeSeconds: number) => {
      if (isMetronomeEnabled && tick % metronomeTicksPerBeat === 0) {
        const isAccentTick = tick % metronomeTicksPerBar === 0;
        scheduleMetronomeTone(
          context,
          tickTimeSeconds,
          isAccentTick,
          isAccentTick ? metronomeGainLevel : metronomeGainLevel * 0.8
        );
      }

      const triggeredPadIds: number[] = [];
      Object.entries(padStepSequenceRef.current).forEach(([padIdRaw, steps]) => {
        const padId = Number(padIdRaw);
        if (padRowMutedRef.current[padId]) {
          return;
        }
        const rowStepLength = padStepLengthRef.current[padId] ?? DEFAULT_ROW_STEP_LENGTH;
        const rowStepTickMultiplier = getStepLengthTickMultiplier(
          rowStepLength,
          sequencerEngineStepLength
        );
        if (tick % rowStepTickMultiplier !== 0) {
          return;
        }

        const rowStepIndex = Math.floor(tick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
        if (!steps[rowStepIndex]) {
          return;
        }
        const rowStepOctaves = padStepOctavesRef.current[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
        const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
          rowStepOctaves[rowStepIndex]
        );

        const assignedSampleId = padSampleIdsRef.current[padId] ?? "";
        if (!assignedSampleId) {
          return;
        }

        playAssignedSampleRef.current(padId, tickTimeSeconds, transposeSemitoneOffset);
        triggeredPadIds.push(padId);
      });

      const visualDelayMs = Math.max(0, (tickTimeSeconds - context.currentTime) * 1000);
      const timeoutId = window.setTimeout(() => {
        if (cancelled || !isPlayingRef.current) {
          return;
        }

        triggeredPadIds.forEach((padId) => {
          flashPadVisual(padId);
        });
        currentTickRef.current = tick;
        setCurrentStep(tick);
      }, visualDelayMs);

      scheduledTickVisualTimeoutsRef.current.push(timeoutId);
    };

    const runScheduler = () => {
      if (cancelled) {
        return;
      }

      while (
        nextTickTimeSeconds <
        context.currentTime + TRANSPORT_SCHEDULE_AHEAD_TIME_SECONDS
      ) {
        scheduleTickPlayback(nextTick, nextTickTimeSeconds);
        nextTick += 1;
        nextTickTimeSeconds += secondsPerTick;
      }
    };

    const startScheduler = () => {
      if (cancelled) {
        return;
      }

      clearScheduledTickVisualTimeouts();
      currentTickRef.current = 0;
      setCurrentStep(0);
      nextTick = 0;
      nextTickTimeSeconds = context.currentTime + 0.02;
      runScheduler();
      schedulerIntervalId = window.setInterval(runScheduler, TRANSPORT_SCHEDULER_INTERVAL_MS);
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(() => {
          startScheduler();
        })
        .catch(() => {
          // Ignore resume failures; next interaction can retry.
        });
    } else {
      startScheduler();
    }

    return () => {
      cancelled = true;
      if (schedulerIntervalId) {
        window.clearInterval(schedulerIntervalId);
      }
      stopAllMetronomeSources();
      clearScheduledTickVisualTimeouts();
    };
  }, [
    clearScheduledTickVisualTimeouts,
    flashPadVisual,
    getAudioContext,
    isPlaying,
    isMetronomeEnabled,
    masterVolume,
    scheduleMetronomeTone,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerEngineStepLength,
    stopAllMetronomeSources,
  ]);

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
  ]);

  useEffect(() => {
    if (!isRecording && isCountInActiveRef.current) {
      cancelCountIn();
    }
  }, [cancelCountIn, isRecording]);

  const handleClearSequence = () => {
    const defaultPattern = createDefaultSequencerPattern();
    const defaultPadVolumes = createInitialPadVolumes(DRUM_PADS);
    const defaultPadNames = createInitialPadNames(DRUM_PADS);
    const defaultPadPolyphony = createInitialPadPolyphony(DRUM_PADS);
    const defaultPadLoopEnabled = createInitialPadLoopEnabled(DRUM_PADS);
    const defaultPadRowMuted = createInitialPadRowMuted(DRUM_PADS);
    const defaultPadSampleSettings = createInitialPadSampleSettings(DRUM_PADS);
    const defaultPadStepSequence = clonePadStepSequence(defaultPattern.padStepSequence);
    const defaultPadStepOctaves = clonePadStepOctaves(defaultPattern.padStepOctaves);
    const defaultPadStepLength = clonePadStepLength(defaultPattern.padStepLength);

    cancelCountIn();
    stopAllLoopBufferSources();
    stopAllOneShotBufferSources();
    stopPreviewBufferSource();
    clearScheduledTickVisualTimeouts();
    currentTickRef.current = 0;
    setCurrentStep(0);
    setIsPlaying(false);
    setIsRecording(false);
    setIsMetronomeEnabled(false);
    setMasterVolume(DEFAULT_PAD_VOLUME);
    setPadVolumes(defaultPadVolumes);
    setPadNames(defaultPadNames);
    setPadPolyphony(defaultPadPolyphony);
    setPadLoopEnabled(defaultPadLoopEnabled);
    setPadRowMuted(defaultPadRowMuted);
    setPadSampleIds({});
    setPadSampleSettings(defaultPadSampleSettings);
    setSequencerPatterns([defaultPattern]);
    setActivePatternId(defaultPattern.id);
    setPadStepSequence(defaultPadStepSequence);
    setPadStepOctaves(defaultPadStepOctaves);
    setPadStepLength(defaultPadStepLength);
    setSequencerBpm(DEFAULT_SEQUENCER_BPM);
    setSequencerClockStepLength(BASE_SEQUENCER_STEP_LENGTH);
    setSelectedProjectId("");
    setPadEditorSaveMessage("");
    setEditingPadId(null);
    setSampleAssignPadId(null);
    setProjectNameDraft("");
    setIsSaveProjectModalOpen(false);
  };

  const warmAssignedSamples = useCallback(
    (sampleIds: PadSampleIds) => {
      const uniqueSampleIds = new Set(
        Object.values(sampleIds)
          .map((sampleId) => sampleId.trim())
          .filter((sampleId) => Boolean(sampleId))
      );

      uniqueSampleIds.forEach((sampleId) => {
        const sample = sampleAssetsById.get(sampleId);
        if (!sample) {
          return;
        }

        void ensureSampleBuffer(sample).catch(() => {
          // Ignore warmup failures; manual trigger can retry.
        });
      });
    },
    [ensureSampleBuffer, sampleAssetsById]
  );

  const applyDrumKitState = useCallback(
    (candidateKitState: Partial<DrumKitState>) => {
      const defaultsPadVolumes = createInitialPadVolumes(DRUM_PADS);
      const defaultsPadNames = createInitialPadNames(DRUM_PADS);
      const defaultsPadPolyphony = createInitialPadPolyphony(DRUM_PADS);
      const defaultsPadLoopEnabled = createInitialPadLoopEnabled(DRUM_PADS);
      const defaultsPadSampleSettings = createInitialPadSampleSettings(DRUM_PADS);
      const nextPadSampleIds = {
        ...(candidateKitState.padSampleIds ?? {}),
      } as PadSampleIds;

      stopAllLoopBufferSources();
      setPadVolumes({
        ...defaultsPadVolumes,
        ...(candidateKitState.padVolumes ?? {}),
      });
      setPadNames({
        ...defaultsPadNames,
        ...(candidateKitState.padNames ?? {}),
      });
      setPadPolyphony({
        ...defaultsPadPolyphony,
        ...(candidateKitState.padPolyphony ?? {}),
      });
      setPadLoopEnabled({
        ...defaultsPadLoopEnabled,
        ...(candidateKitState.padLoopEnabled ?? {}),
      });
      setPadSampleIds(nextPadSampleIds);
      setPadSampleSettings(
        normalizePadSampleSettingsMap({
          ...defaultsPadSampleSettings,
          ...(candidateKitState.padSampleSettings ?? {}),
        })
      );
      warmAssignedSamples(nextPadSampleIds);
    },
    [normalizePadSampleSettingsMap, stopAllLoopBufferSources, warmAssignedSamples]
  );

  const handleSaveKit = useCallback(
    (kitName: string) => {
      const normalizedKitName = kitName.trim();
      if (!normalizedKitName) {
        return;
      }

      const nowIso = new Date().toISOString();
      const nextKit: SavedDrumKit = {
        id: createSavedKitId(),
        name: normalizedKitName,
        createdAt: nowIso,
        updatedAt: nowIso,
        state: buildDrumKitStateSnapshot(),
      };

      setSavedKits((previous) => {
        const nextKits = [nextKit, ...previous];
        writeSavedKitsToSession(nextKits);
        return nextKits;
      });
    },
    [buildDrumKitStateSnapshot]
  );

  const handleLoadKit = useCallback(
    (kitId: string) => {
      const kit = savedKits.find((candidate) => candidate.id === kitId);
      if (!kit) {
        return;
      }

      applyDrumKitState(kit.state as Partial<DrumKitState>);
    },
    [applyDrumKitState, savedKits]
  );

  const handleExportKit = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const kitState = buildDrumKitStateSnapshot();
    const zip = new JSZip();
    const usedFileNames = new Set<string>();
    const sampleIdsInKit = Array.from(
      new Set(
        Object.values(kitState.padSampleIds)
          .map((sampleId) => sampleId.trim())
          .filter((sampleId) => Boolean(sampleId))
      )
    );

    const exportedSamples: KitArchiveManifest["samples"] = [];

    for (const sampleId of sampleIdsInKit) {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        continue;
      }

      const sampleBuffer =
        sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
      if (!sampleBuffer) {
        continue;
      }

      const fileName = createKitArchiveSampleFileName(sample.name, usedFileNames);
      const filePath = `samples/${fileName}`;
      const wavBuffer = encodeAudioBufferToWav(sampleBuffer);
      zip.file(filePath, wavBuffer);
      exportedSamples.push({
        sampleId: sample.id,
        name: sample.name,
        relativePath: sample.relativePath,
        filePath,
      });
    }

    const metadataOverridesForKit = Object.fromEntries(
      exportedSamples.flatMap((sampleEntry) => {
        const override = sampleMetadataOverrides[sampleEntry.sampleId];
        return override ? ([[sampleEntry.sampleId, override]] as const) : [];
      })
    ) as SampleMetadataOverrides;

    const manifest: KitArchiveManifest = {
      format: "noodlr-kit",
      version: 1,
      name: `Kit ${nowIso.slice(0, 19).replace(/:/g, "-")}`,
      exportedAt: nowIso,
      state: kitState,
      sampleMetadataOverrides: metadataOverridesForKit,
      samples: exportedSamples,
    };

    zip.file(KIT_ARCHIVE_MANIFEST_FILE_NAME, JSON.stringify(manifest, null, 2));
    const archiveBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = window.URL.createObjectURL(archiveBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = createKitArchiveFileName(manifest.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }, [
    buildDrumKitStateSnapshot,
    ensureSampleBuffer,
    sampleAssetsById,
    sampleMetadataOverrides,
  ]);

  const handleImportKit = useCallback(
    async (archiveFile: File) => {
      const zip = await JSZip.loadAsync(archiveFile);
      const manifestZipEntry = zip.file(KIT_ARCHIVE_MANIFEST_FILE_NAME);
      if (!manifestZipEntry) {
        throw new Error("Invalid kit archive: missing kit.json.");
      }

      const manifestPayload = JSON.parse(await manifestZipEntry.async("string")) as unknown;
      if (!isKitArchiveManifest(manifestPayload)) {
        throw new Error("Invalid kit archive: bad manifest schema.");
      }

      const manifest = manifestPayload as KitArchiveManifest;
      const importedKitId = createSavedKitId();
      const importedSampleIdMap = new Map<string, string>();
      const nextImportedAssets: SampleAsset[] = [];

      for (const sampleEntry of manifest.samples) {
        if (importedSampleIdMap.has(sampleEntry.sampleId)) {
          continue;
        }

        const sampleZipEntry = zip.file(sampleEntry.filePath);
        if (!sampleZipEntry) {
          throw new Error(`Invalid kit archive: missing sample file ${sampleEntry.filePath}.`);
        }

        const sampleBlob = await sampleZipEntry.async("blob");
        const sampleObjectUrl = window.URL.createObjectURL(sampleBlob);
        importedSampleObjectUrlsRef.current.add(sampleObjectUrl);

        const importedSampleId = `${IMPORTED_SAMPLE_ID_PREFIX}:${importedKitId}:${sampleEntry.sampleId}`;
        importedSampleIdMap.set(sampleEntry.sampleId, importedSampleId);
        nextImportedAssets.push({
          id: importedSampleId,
          name: sampleEntry.name,
          previewUrl: sampleObjectUrl,
          category: "uncategorized",
          tags: [],
          relativePath: sampleEntry.relativePath || `Imported/${sampleEntry.filePath}`,
        });
      }

      setImportedSampleAssets((previous) => {
        const existingById = new Map(previous.map((sample) => [sample.id, sample]));
        nextImportedAssets.forEach((sample) => {
          existingById.set(sample.id, sample);
        });
        return Array.from(existingById.values());
      });

      const remappedPadSampleIds = Object.fromEntries(
        Object.entries(manifest.state.padSampleIds ?? {}).map(([padIdRaw, oldSampleId]) => {
          const importedSampleId = importedSampleIdMap.get(String(oldSampleId));
          return [Number(padIdRaw), importedSampleId || ""];
        })
      ) as PadSampleIds;

      const remappedMetadataOverrides = Object.fromEntries(
        Object.entries(manifest.sampleMetadataOverrides).flatMap(([oldSampleId, override]) => {
          const importedSampleId = importedSampleIdMap.get(oldSampleId);
          return importedSampleId ? ([[importedSampleId, override]] as const) : [];
        })
      ) as SampleMetadataOverrides;

      setSampleMetadataOverrides((previous) => {
        const nextOverrides = {
          ...previous,
          ...remappedMetadataOverrides,
        };
        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });

      applyDrumKitState({
        ...manifest.state,
        padSampleIds: remappedPadSampleIds,
      });
    },
    [applyDrumKitState]
  );

  const importDemoKitArchive = useCallback(async (): Promise<boolean> => {
    setSampleError(null);
    setIsImportingDemoKit(true);

    try {
      const response = await fetch(DEMO_KIT_ARCHIVE_URL);
      if (!response.ok) {
        throw new Error("Demo kit is unavailable.");
      }

      const archiveBlob = await response.blob();
      const archiveFile = new File([archiveBlob], DEMO_KIT_ARCHIVE_FILE_NAME, {
        type: archiveBlob.type || "application/zip",
      });

      await handleImportKit(archiveFile);
      markDemoKitAutoLoaded();
      return true;
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "Unable to load demo kit.");
      return false;
    } finally {
      setIsImportingDemoKit(false);
    }
  }, [handleImportKit]);

  const handleSaveProjectAsNew = useCallback(
    (projectName: string) => {
      const normalizedProjectName = sanitizeProjectName(projectName);
      if (!normalizedProjectName) {
        return;
      }

      const nowIso = new Date().toISOString();
      const nextProject: SavedProject = {
        id: createSavedProjectId(),
        name: normalizedProjectName,
        createdAt: nowIso,
        updatedAt: nowIso,
        state: buildProjectStateSnapshot(),
      };

      setSavedProjects((previous) => {
        const nextProjects = [nextProject, ...previous];
        writeSavedProjectsToSession(nextProjects);
        return nextProjects;
      });
      setSelectedProjectId(nextProject.id);
    },
    [buildProjectStateSnapshot]
  );

  const handleOverwriteProject = useCallback(
    (projectId: string, projectName: string) => {
      const normalizedProjectName = sanitizeProjectName(projectName);
      if (!projectId || !normalizedProjectName) {
        return;
      }

      const nowIso = new Date().toISOString();
      setSavedProjects((previous) => {
        const existingProject = previous.find((candidate) => candidate.id === projectId);
        if (!existingProject) {
          return previous;
        }

        const overwrittenProject: SavedProject = {
          ...existingProject,
          name: normalizedProjectName,
          updatedAt: nowIso,
          state: buildProjectStateSnapshot(),
        };
        const nextProjects = [
          overwrittenProject,
          ...previous.filter((candidate) => candidate.id !== projectId),
        ];

        writeSavedProjectsToSession(nextProjects);
        return nextProjects;
      });
      setSelectedProjectId(projectId);
    },
    [buildProjectStateSnapshot]
  );

  const applyProjectState = useCallback(
    (
      candidateProjectState: Partial<ProjectState>,
      options?: { selectedProjectId?: string }
    ) => {
      const defaultsPadVolumes = createInitialPadVolumes(DRUM_PADS);
      const defaultsPadNames = createInitialPadNames(DRUM_PADS);
      const defaultsPadPolyphony = createInitialPadPolyphony(DRUM_PADS);
      const defaultsPadLoopEnabled = createInitialPadLoopEnabled(DRUM_PADS);
      const defaultsPadRowMuted = createInitialPadRowMuted(DRUM_PADS);
      const defaultsPadSampleSettings = createInitialPadSampleSettings(DRUM_PADS);
      const defaultsPadStepSequence = createInitialPadStepSequence(DRUM_PADS, STEPS_IN_SEQUENCE);
      const defaultsPadStepOctaves = createInitialPadStepOctaves(DRUM_PADS, STEPS_IN_SEQUENCE);
      const defaultsPadStepLength = createInitialPadStepLength(
        DRUM_PADS,
        DEFAULT_ROW_STEP_LENGTH
      );
      const nextPadSampleIds = {
        ...(candidateProjectState.padSampleIds ?? {}),
      } as PadSampleIds;
      const normalizedPatterns = normalizeSequencerPatterns(
        candidateProjectState.sequencerPatterns
      );
      const fallbackPattern: SequencerPattern = {
        id: createSavedKitId(),
        name: "Pattern 1",
        padStepSequence: normalizePadStepSequence({
          ...defaultsPadStepSequence,
          ...(candidateProjectState.padStepSequence ?? {}),
        }),
        padStepOctaves: normalizePadStepOctaves({
          ...defaultsPadStepOctaves,
          ...(candidateProjectState.padStepOctaves ?? {}),
        }),
        padStepLength: normalizePadStepLength({
          ...defaultsPadStepLength,
          ...(candidateProjectState.padStepLength ?? {}),
        }),
      };
      const nextPatterns = normalizedPatterns.length > 0 ? normalizedPatterns : [fallbackPattern];
      const nextActivePattern =
        nextPatterns.find((pattern) => pattern.id === candidateProjectState.activePatternId) ??
        nextPatterns[0];

      cancelCountIn();
      stopAllLoopBufferSources();
      stopAllMetronomeSources();
      currentTickRef.current = 0;
      setCurrentStep(0);
      setIsPlaying(false);
      setIsRecording(false);

      if (options?.selectedProjectId !== undefined) {
        setSelectedProjectId(options.selectedProjectId);
      }

      setMasterVolume(
        Math.max(0, Math.min(100, Number(candidateProjectState.masterVolume ?? DEFAULT_PAD_VOLUME)))
      );
      setPadVolumes({
        ...defaultsPadVolumes,
        ...(candidateProjectState.padVolumes ?? {}),
      });
      setPadNames({
        ...defaultsPadNames,
        ...(candidateProjectState.padNames ?? {}),
      });
      setPadPolyphony({
        ...defaultsPadPolyphony,
        ...(candidateProjectState.padPolyphony ?? {}),
      });
      setPadLoopEnabled({
        ...defaultsPadLoopEnabled,
        ...(candidateProjectState.padLoopEnabled ?? {}),
      });
      setPadRowMuted({
        ...defaultsPadRowMuted,
        ...(candidateProjectState.padRowMuted ?? {}),
      });
      setPadSampleIds(nextPadSampleIds);
      setPadSampleSettings(
        normalizePadSampleSettingsMap({
          ...defaultsPadSampleSettings,
          ...(candidateProjectState.padSampleSettings ?? {}),
        })
      );
      warmAssignedSamples(nextPadSampleIds);
      setSequencerPatterns(nextPatterns);
      setActivePatternId(nextActivePattern.id);
      setPadStepSequence(clonePadStepSequence(nextActivePattern.padStepSequence));
      setPadStepOctaves(clonePadStepOctaves(nextActivePattern.padStepOctaves));
      setPadStepLength(clonePadStepLength(nextActivePattern.padStepLength));
      setSequencerBpm(
        clampSequencerBpm(Number(candidateProjectState.sequencerBpm ?? DEFAULT_SEQUENCER_BPM))
      );
      setSequencerClockStepLength(
        isSequencerStepLength(candidateProjectState.sequencerClockStepLength)
          ? candidateProjectState.sequencerClockStepLength
          : BASE_SEQUENCER_STEP_LENGTH
      );
      setIsMetronomeEnabled(Boolean(candidateProjectState.isMetronomeEnabled));
    },
    [
      cancelCountIn,
      normalizePadStepLength,
      normalizePadStepOctaves,
      normalizePadSampleSettingsMap,
      normalizePadStepSequence,
      normalizeSequencerPatterns,
      stopAllMetronomeSources,
      stopAllLoopBufferSources,
      warmAssignedSamples,
    ]
  );

  const handleLoadProject = useCallback(
    (projectId: string) => {
      const project = savedProjects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return;
      }

      applyProjectState(project.state as Partial<ProjectState>, {
        selectedProjectId: project.id,
      });
    },
    [applyProjectState, savedProjects]
  );

  const handleExportProject = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const projectState = buildProjectStateSnapshot();
    const zip = new JSZip();
    const usedFileNames = new Set<string>();
    const sampleIdsInProject = Array.from(
      new Set(
        Object.values(projectState.padSampleIds)
          .map((sampleId) => sampleId.trim())
          .filter((sampleId) => Boolean(sampleId))
      )
    );
    const exportedSamples: ProjectArchiveManifest["samples"] = [];

    for (const sampleId of sampleIdsInProject) {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        continue;
      }

      const sampleBuffer =
        sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
      if (!sampleBuffer) {
        continue;
      }

      const fileName = createKitArchiveSampleFileName(sample.name, usedFileNames);
      const filePath = `samples/${fileName}`;
      const wavBuffer = encodeAudioBufferToWav(sampleBuffer);
      zip.file(filePath, wavBuffer);
      exportedSamples.push({
        sampleId: sample.id,
        name: sample.name,
        relativePath: sample.relativePath,
        filePath,
      });
    }

    const metadataOverridesForProject = Object.fromEntries(
      exportedSamples.flatMap((sampleEntry) => {
        const override = sampleMetadataOverrides[sampleEntry.sampleId];
        return override ? ([[sampleEntry.sampleId, override]] as const) : [];
      })
    ) as SampleMetadataOverrides;

    const manifestName =
      sanitizeProjectName(selectedProject?.name ?? "") ||
      `Project ${nowIso.slice(0, 19).replace(/:/g, "-")}`;
    const manifest: ProjectArchiveManifest = {
      format: "noodlr-project",
      version: 1,
      name: manifestName,
      exportedAt: nowIso,
      state: projectState,
      sampleMetadataOverrides: metadataOverridesForProject,
      samples: exportedSamples,
    };

    zip.file(PROJECT_ARCHIVE_MANIFEST_FILE_NAME, JSON.stringify(manifest, null, 2));
    const archiveBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = window.URL.createObjectURL(archiveBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = createProjectArchiveFileName(manifest.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }, [
    buildProjectStateSnapshot,
    ensureSampleBuffer,
    sampleAssetsById,
    sampleMetadataOverrides,
    selectedProject,
  ]);

  const handleImportProject = useCallback(
    async (archiveFile: File) => {
      const zip = await JSZip.loadAsync(archiveFile);
      const manifestZipEntry = zip.file(PROJECT_ARCHIVE_MANIFEST_FILE_NAME);
      if (!manifestZipEntry) {
        throw new Error("Invalid project archive: missing project.json.");
      }

      const manifestPayload = JSON.parse(await manifestZipEntry.async("string")) as unknown;
      if (!isProjectArchiveManifest(manifestPayload)) {
        throw new Error("Invalid project archive: bad manifest schema.");
      }

      const manifest = manifestPayload as ProjectArchiveManifest;
      const importedProjectId = createSavedProjectId();
      const importedSampleIdMap = new Map<string, string>();
      const nextImportedAssets: SampleAsset[] = [];

      for (const sampleEntry of manifest.samples) {
        if (importedSampleIdMap.has(sampleEntry.sampleId)) {
          continue;
        }

        const sampleZipEntry = zip.file(sampleEntry.filePath);
        if (!sampleZipEntry) {
          throw new Error(
            `Invalid project archive: missing sample file ${sampleEntry.filePath}.`
          );
        }

        const sampleBlob = await sampleZipEntry.async("blob");
        const sampleObjectUrl = window.URL.createObjectURL(sampleBlob);
        importedSampleObjectUrlsRef.current.add(sampleObjectUrl);

        const importedSampleId = `${IMPORTED_PROJECT_SAMPLE_ID_PREFIX}:${importedProjectId}:${sampleEntry.sampleId}`;
        importedSampleIdMap.set(sampleEntry.sampleId, importedSampleId);
        nextImportedAssets.push({
          id: importedSampleId,
          name: sampleEntry.name,
          previewUrl: sampleObjectUrl,
          category: "uncategorized",
          tags: [],
          relativePath: sampleEntry.relativePath || `Imported/${sampleEntry.filePath}`,
        });
      }

      setImportedSampleAssets((previous) => {
        const existingById = new Map(previous.map((sample) => [sample.id, sample]));
        nextImportedAssets.forEach((sample) => {
          existingById.set(sample.id, sample);
        });
        return Array.from(existingById.values());
      });

      const remappedPadSampleIds = Object.fromEntries(
        Object.entries(manifest.state.padSampleIds ?? {}).map(([padIdRaw, oldSampleId]) => {
          const importedSampleId = importedSampleIdMap.get(String(oldSampleId));
          return [Number(padIdRaw), importedSampleId || ""];
        })
      ) as PadSampleIds;

      const remappedMetadataOverrides = Object.fromEntries(
        Object.entries(manifest.sampleMetadataOverrides).flatMap(([oldSampleId, override]) => {
          const importedSampleId = importedSampleIdMap.get(oldSampleId);
          return importedSampleId ? ([[importedSampleId, override]] as const) : [];
        })
      ) as SampleMetadataOverrides;

      setSampleMetadataOverrides((previous) => {
        const nextOverrides = {
          ...previous,
          ...remappedMetadataOverrides,
        };
        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });

      const remappedProjectState = {
        ...manifest.state,
        padSampleIds: remappedPadSampleIds,
      } as ProjectState;
      applyProjectState(remappedProjectState, {
        selectedProjectId: "",
      });
    },
    [applyProjectState]
  );

  const renderSequencerSelectionToAudioBuffer = useCallback(
    async (padIds: number[], respectRowMute: boolean): Promise<AudioBuffer> => {
      const uniquePadIds = Array.from(new Set(padIds));
      const assignedPadIds = uniquePadIds.filter((padId) => {
        const assignedSampleId = (padSampleIds[padId] ?? "").trim();
        return Boolean(assignedSampleId);
      });

      if (!assignedPadIds.length) {
        throw new Error("No assigned samples available to export.");
      }

      const sequencePadIds = assignedPadIds.filter((padId) => {
        if (!respectRowMute) {
          const steps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
          return steps.some((stepEnabled) => stepEnabled);
        }

        const steps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
        if (!steps.some((stepEnabled) => stepEnabled)) {
          return false;
        }

        return !(padRowMuted[padId] ?? false);
      });

      if (!sequencePadIds.length) {
        if (respectRowMute) {
          throw new Error("All selected rows are muted or have no active steps.");
        }
        throw new Error("No active sequencer steps to export.");
      }

      const gcd = (left: number, right: number): number => {
        let a = Math.abs(left);
        let b = Math.abs(right);
        while (b !== 0) {
          const next = a % b;
          a = b;
          b = next;
        }
        return a || 1;
      };

      const lcm = (left: number, right: number): number => {
        return Math.abs(left * right) / gcd(left, right);
      };

      // Duration spans one full polymetric cycle across all active rows.
      const rowLoopTicksByPad = sequencePadIds.map((padId) => {
        const rowStepLength = padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
        const rowStepTickMultiplier = getStepLengthTickMultiplier(
          rowStepLength,
          sequencerEngineStepLength
        );
        return rowStepTickMultiplier * STEPS_IN_SEQUENCE;
      });
      const patternLoopTicks = rowLoopTicksByPad.reduce(
        (loopTickCount, rowLoopTicks) => lcm(loopTickCount, rowLoopTicks),
        1
      );

      // Export timing runs at engine tick resolution and is not stretched by clock multiplier.
      const secondsPerTick =
        getSequencerStepDurationMs(sequencerBpm, sequencerEngineStepLength) / 1000;
      const patternDurationSeconds = patternLoopTicks * secondsPerTick;

      const maxReleaseSeconds = Math.max(
        0,
        ...sequencePadIds.map((padId) => {
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          return Math.max(0, sampleSettings.releaseMs / 1000);
        })
      );
      const maxDelayTailSeconds = Math.max(
        0,
        ...sequencePadIds.map((padId) => {
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          if (sampleSettings.delayMix <= 0.001) {
            return 0;
          }

          const safeFeedback = Math.max(0, Math.min(0.95, sampleSettings.delayFeedback));
          const feedbackMultiplier = Math.max(1, Math.min(12, 1 / (1 - safeFeedback)));
          return (sampleSettings.delayTimeMs / 1000) * feedbackMultiplier;
        })
      );
      const tailSeconds = Math.min(
        8,
        Math.max(0.2, maxReleaseSeconds + maxDelayTailSeconds + 0.05)
      );
      const totalDurationSeconds = patternDurationSeconds + tailSeconds + 0.05;
      const sampleRate = 44100;
      const offlineContext = new OfflineAudioContext(
        2,
        Math.max(1, Math.ceil(totalDurationSeconds * sampleRate)),
        sampleRate
      );

      const outputCompressor = offlineContext.createDynamicsCompressor();
      outputCompressor.threshold.value = -10;
      outputCompressor.knee.value = 10;
      outputCompressor.ratio.value = 12;
      outputCompressor.attack.value = 0.003;
      outputCompressor.release.value = 0.08;
      outputCompressor.connect(offlineContext.destination);

      const createReverbImpulseBuffer = (): AudioBuffer => {
        const durationSeconds = 1.8;
        const length = Math.floor(offlineContext.sampleRate * durationSeconds);
        const impulseBuffer = offlineContext.createBuffer(2, length, offlineContext.sampleRate);

        for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
          const channelData = impulseBuffer.getChannelData(channel);
          for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
            const decay = Math.pow(1 - sampleIndex / length, 3);
            channelData[sampleIndex] = (Math.random() * 2 - 1) * decay;
          }
        }

        return impulseBuffer;
      };

      const reverbImpulseBuffer = createReverbImpulseBuffer();

      const createRenderVoiceGainNode = (sampleSettings: PadSampleSettings): GainNode => {
        const voiceGainNode = offlineContext.createGain();
        const reverbMix = Math.max(0, Math.min(1, sampleSettings.reverbMix));
        const delayMix = Math.max(0, Math.min(1, sampleSettings.delayMix));
        const dryMix = Math.max(0, 1 - Math.min(1, reverbMix + delayMix));

        const dryGainNode = offlineContext.createGain();
        dryGainNode.gain.value = dryMix;
        voiceGainNode.connect(dryGainNode);
        dryGainNode.connect(outputCompressor);

        if (reverbMix > 0.001) {
          const reverbSendGainNode = offlineContext.createGain();
          reverbSendGainNode.gain.value = reverbMix;
          const convolverNode = offlineContext.createConvolver();
          convolverNode.buffer = reverbImpulseBuffer;

          voiceGainNode.connect(reverbSendGainNode);
          reverbSendGainNode.connect(convolverNode);
          convolverNode.connect(outputCompressor);
        }

        if (delayMix > 0.001) {
          const delaySendGainNode = offlineContext.createGain();
          delaySendGainNode.gain.value = delayMix;

          const delayNode = offlineContext.createDelay(1.0);
          delayNode.delayTime.value = Math.max(
            0.001,
            Math.min(1, sampleSettings.delayTimeMs / 1000)
          );

          const feedbackGainNode = offlineContext.createGain();
          feedbackGainNode.gain.value = Math.max(
            0,
            Math.min(0.95, sampleSettings.delayFeedback)
          );

          voiceGainNode.connect(delaySendGainNode);
          delaySendGainNode.connect(delayNode);
          delayNode.connect(feedbackGainNode);
          feedbackGainNode.connect(delayNode);
          delayNode.connect(outputCompressor);
        }

        return voiceGainNode;
      };

      const bufferedSamplesByPad = new Map<number, AudioBuffer>();

      for (const padId of sequencePadIds) {
        const assignedSampleId = (padSampleIds[padId] ?? "").trim();
        const assignedSample = sampleAssetsById.get(assignedSampleId);
        if (!assignedSample) {
          continue;
        }

        const sampleBuffer =
          sampleBufferCacheRef.current.get(assignedSample.id) ??
          (await ensureSampleBuffer(assignedSample));
        if (sampleBuffer) {
          bufferedSamplesByPad.set(padId, sampleBuffer);
        }
      }

      if (!bufferedSamplesByPad.size) {
        throw new Error("Unable to load sample audio for export.");
      }

      type RenderLoopVoice = {
        source: AudioBufferSourceNode;
        gainNode: GainNode;
        releaseSeconds: number;
      };

      const activeLoopVoices = new Map<number, RenderLoopVoice>();

      const stopLoopVoice = (voice: RenderLoopVoice, stopTime: number) => {
        const safeStopTime = Math.max(0, stopTime);
        const fadeSeconds = Math.max(VOICE_STOP_FADE_SECONDS, voice.releaseSeconds);
        voice.gainNode.gain.cancelScheduledValues(safeStopTime);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, safeStopTime);
        voice.gainNode.gain.linearRampToValueAtTime(0, safeStopTime + fadeSeconds);
        voice.source.stop(safeStopTime + fadeSeconds + 0.001);
      };

      for (let tick = 0; tick < patternLoopTicks; tick += 1) {
        for (const padId of sequencePadIds) {
          const sampleBuffer = bufferedSamplesByPad.get(padId);
          if (!sampleBuffer) {
            continue;
          }

          const rowStepLength = padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
          const rowStepTickMultiplier = getStepLengthTickMultiplier(
            rowStepLength,
            sequencerEngineStepLength
          );
          if (tick % rowStepTickMultiplier !== 0) {
            continue;
          }

          const rowStepIndex = Math.floor(tick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
          const rowSteps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
          if (!rowSteps[rowStepIndex]) {
            continue;
          }
          const rowStepOctaves = padStepOctaves[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
          const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
            rowStepOctaves[rowStepIndex]
          );
          const playbackRate = Math.pow(
            2,
            transposeSemitoneOffset / OCTAVE_TRANSPOSE_SEMITONES
          );

          const eventTimeSeconds = tick * secondsPerTick;
          const padVolume = padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
          const outputGain = Math.max(
            0,
            Math.min(1, (masterVolume / 100) * (padVolume / 100))
          );
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          const isLoopEnabled = padLoopEnabled[padId] ?? false;

          if (isLoopEnabled) {
            const existingLoopVoice = activeLoopVoices.get(padId);
            if (existingLoopVoice) {
              stopLoopVoice(existingLoopVoice, eventTimeSeconds);
              activeLoopVoices.delete(padId);
            }

            const source = offlineContext.createBufferSource();
            source.buffer = sampleBuffer;
            source.loop = true;
            source.playbackRate.value = playbackRate;

            const gainNode = createRenderVoiceGainNode(sampleSettings);
            const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
            const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
            const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
            const sustainGain = outputGain * sustainLevel;

            gainNode.gain.cancelScheduledValues(eventTimeSeconds);
            if (attackSeconds > 0) {
              gainNode.gain.setValueAtTime(0, eventTimeSeconds);
              gainNode.gain.linearRampToValueAtTime(
                outputGain,
                eventTimeSeconds + attackSeconds
              );
            } else {
              gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
            }
            if (decaySeconds > 0) {
              gainNode.gain.linearRampToValueAtTime(
                sustainGain,
                eventTimeSeconds + attackSeconds + decaySeconds
              );
            } else {
              gainNode.gain.setValueAtTime(sustainGain, eventTimeSeconds + attackSeconds);
            }

            source.connect(gainNode);
            source.start(eventTimeSeconds);
            activeLoopVoices.set(padId, {
              source,
              gainNode,
              releaseSeconds: Math.max(0, sampleSettings.releaseMs / 1000),
            });
            continue;
          }

          const source = offlineContext.createBufferSource();
          source.buffer = sampleBuffer;
          source.playbackRate.value = playbackRate;

          const gainNode = createRenderVoiceGainNode(sampleSettings);
          const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
          const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
          const releaseSeconds = Math.max(0, sampleSettings.releaseMs / 1000);
          const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
          const sustainGain = outputGain * sustainLevel;
          const attackEndTime = eventTimeSeconds + attackSeconds;
          const decayEndTime = attackEndTime + decaySeconds;
          const naturalEndTime = eventTimeSeconds + sampleBuffer.duration / playbackRate;

          gainNode.gain.cancelScheduledValues(eventTimeSeconds);
          if (attackSeconds > 0) {
            gainNode.gain.setValueAtTime(0, eventTimeSeconds);
            gainNode.gain.linearRampToValueAtTime(outputGain, attackEndTime);
          } else {
            gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
          }

          if (decaySeconds > 0) {
            gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
          } else {
            gainNode.gain.setValueAtTime(sustainGain, attackEndTime);
          }

          if (releaseSeconds > 0) {
            const releaseStartTime = Math.max(decayEndTime, naturalEndTime - releaseSeconds);
            gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
            gainNode.gain.linearRampToValueAtTime(0, naturalEndTime);
          }

          source.connect(gainNode);
          source.start(eventTimeSeconds);
        }
      }

      activeLoopVoices.forEach((voice) => {
        stopLoopVoice(voice, patternDurationSeconds);
      });
      activeLoopVoices.clear();

      return offlineContext.startRendering();
    },
    [
      ensureSampleBuffer,
      masterVolume,
      padLoopEnabled,
      padRowMuted,
      padSampleIds,
      padSampleSettings,
      padStepLength,
      padStepOctaves,
      padStepSequence,
      padVolumes,
      sampleAssetsById,
      sequencerBpm,
      sequencerClockStepLength,
      sequencerEngineStepLength,
    ]
  );

  const downloadRenderedAudioBuffer = useCallback(
    (audioBuffer: AudioBuffer, fileNameStem: string) => {
      const sanitizedStem =
        fileNameStem
          .trim()
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^\.+/, "")
          .replace(/\.+$/, "") || "sequence";
      const wavBuffer = encodeAudioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      const downloadUrl = window.URL.createObjectURL(wavBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${sanitizedStem}.wav`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
    []
  );

  const handleExportSequencerPattern = useCallback(async () => {
    const padIds = DRUM_PADS.map((pad) => pad.id).filter((padId) =>
      Boolean((padSampleIds[padId] ?? "").trim())
    );
    const renderedBuffer = await renderSequencerSelectionToAudioBuffer(padIds, true);
    const activePatternName =
      patternOptions.find((pattern) => pattern.id === activePatternId)?.name ?? "Pattern";
    downloadRenderedAudioBuffer(renderedBuffer, `${activePatternName}-pattern`);
  }, [
    activePatternId,
    downloadRenderedAudioBuffer,
    padSampleIds,
    patternOptions,
    renderSequencerSelectionToAudioBuffer,
  ]);

  const handleExportSequencerRow = useCallback(
    async (padId: number) => {
      const assignedSampleId = (padSampleIds[padId] ?? "").trim();
      if (!assignedSampleId) {
        throw new Error("This row has no assigned sample.");
      }

      const renderedBuffer = await renderSequencerSelectionToAudioBuffer([padId], false);
      const rowLabel = padNames[padId] ?? `Pad-${padId}`;
      downloadRenderedAudioBuffer(renderedBuffer, `${rowLabel}-row`);
    },
    [
      downloadRenderedAudioBuffer,
      padNames,
      padSampleIds,
      renderSequencerSelectionToAudioBuffer,
    ]
  );

  const handleOpenSaveProjectModal = useCallback(() => {
    setProjectNameDraft(selectedProject?.name ?? "");
    setIsSaveProjectModalOpen(true);
  }, [selectedProject]);

  const handleCloseSaveProjectModal = useCallback(() => {
    setIsSaveProjectModalOpen(false);
    setProjectNameDraft("");
  }, []);

  const handleSubmitSaveProjectAsNew = useCallback(() => {
    const projectName = sanitizeProjectName(projectNameDraft);
    if (!projectName) {
      return;
    }

    handleSaveProjectAsNew(projectName);
    handleCloseSaveProjectModal();
  }, [handleCloseSaveProjectModal, handleSaveProjectAsNew, projectNameDraft]);

  const handleSubmitOverwriteProject = useCallback(() => {
    if (!selectedProject) {
      return;
    }

    const projectName = sanitizeProjectName(projectNameDraft || selectedProject.name);
    if (!projectName) {
      return;
    }

    handleOverwriteProject(selectedProject.id, projectName);
    handleCloseSaveProjectModal();
  }, [
    handleCloseSaveProjectModal,
    handleOverwriteProject,
    projectNameDraft,
    selectedProject,
  ]);

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      if (!projectId) {
        return;
      }

      handleLoadProject(projectId);
    },
    [handleLoadProject]
  );

  const handleDeleteProject = useCallback((projectId: string) => {
    if (!projectId) {
      return;
    }

    setSavedProjects((previous) => {
      const nextProjects = previous.filter((project) => project.id !== projectId);
      if (nextProjects.length === previous.length) {
        return previous;
      }

      writeSavedProjectsToSession(nextProjects);
      return nextProjects;
    });
    setSelectedProjectId((previousSelectedProjectId) =>
      previousSelectedProjectId === projectId ? "" : previousSelectedProjectId
    );
  }, []);

  const handlePadVolumeChange = (padId: number, volume: number) => {
    setPadVolumes((previous) => ({
      ...previous,
      [padId]: volume,
    }));
  };

  const handlePadPolyphonyChange = (padId: number, polyphony: number) => {
    setPadPolyphony((previous) => ({
      ...previous,
      [padId]: clampPadPolyphony(polyphony),
    }));
  };

  const handlePadNameChange = (padId: number, name: string) => {
    setPadNames((previous) => ({
      ...previous,
      [padId]: sanitizePadName(name),
    }));
  };

  const handleOpenPadSampleEditor = useCallback((padId: number) => {
    setPadEditorSaveMessage("");
    setEditingPadId(padId);
  }, []);

  const handleOpenPadSampleAssignModal = useCallback((padId: number) => {
    setSampleAssignPadId(padId);
  }, []);

  const handleClosePadSampleAssignModal = useCallback(() => {
    setSampleAssignPadId(null);
  }, []);

  const handlePadSampleEditorOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setPadEditorSaveMessage("");
      setEditingPadId(null);
    }
  }, []);

  const handlePadSampleSettingsChange = useCallback(
    (padId: number, nextSettings: Partial<PadSampleSettings>) => {
      setPadSampleSettings((previous) => ({
        ...previous,
        [padId]: normalizePadSampleSettings({
          ...previous[padId],
          ...nextSettings,
        }),
      }));
    },
    []
  );

  const handleResetPadSampleSettings = useCallback((padId: number) => {
    setPadSampleSettings((previous) => ({
      ...previous,
      [padId]: { ...DEFAULT_PAD_SAMPLE_SETTINGS },
    }));
  }, []);

  const handleSavePadEditorSettingsToSavedKits = useCallback(() => {
    if (!editingPad || !editingPadSampleId) {
      setPadEditorSaveMessage("Assign a sample first.");
      return;
    }

    const currentPadSettings =
      padSampleSettings[editingPad.id] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
    const normalizedSettings = normalizePadSampleSettings(currentPadSettings);
    const nowIso = new Date().toISOString();

    setSavedKits((previous) => {
      let updatedKitCount = 0;
      const nextKits = previous.map((kit) => {
        const kitSampleId = kit.state.padSampleIds?.[editingPad.id] ?? "";
        if (kitSampleId !== editingPadSampleId) {
          return kit;
        }

        updatedKitCount += 1;
        return {
          ...kit,
          updatedAt: nowIso,
          state: {
            ...kit.state,
            padSampleSettings: {
              ...(kit.state.padSampleSettings ?? {}),
              [editingPad.id]: normalizedSettings,
            },
          },
        };
      });

      if (updatedKitCount === 0) {
        setPadEditorSaveMessage("No saved kits currently use this pad sample.");
        return previous;
      }

      const sortedKits = [...nextKits].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
      writeSavedKitsToSession(sortedKits);
      setPadEditorSaveMessage(`Saved to ${updatedKitCount} kit${updatedKitCount > 1 ? "s" : ""}.`);
      return sortedKits;
    });
  }, [
    editingPad,
    editingPadSampleId,
    padSampleSettings,
    normalizePadSampleSettings,
  ]);

  const handlePadSampleDrop = useCallback(
    (padId: number, sampleId: string) => {
      const selectedSample = sampleAssetsById.get(sampleId);
      if (!selectedSample) {
        return;
      }

      stopLoopBufferSourceForPad(padId);
      setPadSampleIds((previous) => ({
        ...previous,
        [padId]: sampleId,
      }));

      void ensureSampleBuffer(selectedSample).catch(() => {
        // Buffer warmup failures should not block assignment.
      });
    },
    [ensureSampleBuffer, sampleAssetsById, stopLoopBufferSourceForPad]
  );

  const handleAssignSampleToSelectedPad = useCallback(
    (sampleId: string) => {
      if (sampleAssignPadId === null) {
        return;
      }

      handlePadSampleDrop(sampleAssignPadId, sampleId);
      setSampleAssignPadId(null);
    },
    [handlePadSampleDrop, sampleAssignPadId]
  );

  const handlePadSampleClear = useCallback((padId: number) => {
    stopLoopBufferSourceForPad(padId);
    setPadEditorSaveMessage("");
    setPadSampleIds((previous) => ({
      ...previous,
      [padId]: "",
    }));
  }, [stopLoopBufferSourceForPad]);

  const handlePadLoopToggle = useCallback(
    (padId: number) => {
      setPadLoopEnabled((previous) => {
        const nextEnabled = !(previous[padId] ?? false);
        const nextLoopEnabled = {
          ...previous,
          [padId]: nextEnabled,
        };

        if (!nextEnabled) {
          stopLoopBufferSourceForPad(padId);
        }

        return nextLoopEnabled;
      });
    },
    [stopLoopBufferSourceForPad]
  );

  useEffect(() => {
    if (!Object.keys(padSampleIds).length) {
      return;
    }

    warmAssignedSamples(padSampleIds);
  }, [padSampleIds, sampleAssetsById, warmAssignedSamples]);

  const buildNormalizedMetadataOverride = (
    metadata: SampleMetadataOverride
  ): SampleMetadataOverride => {
    const normalizedName = metadata.name?.trim();
    const normalizedTags = Array.isArray(metadata.tags)
      ? Array.from(
          new Set(
            metadata.tags
              .map((tag) => tag.trim().toLowerCase())
              .filter((tag) => Boolean(tag))
          )
        )
      : undefined;

    return {
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(metadata.category ? { category: metadata.category } : {}),
      ...(normalizedTags ? { tags: normalizedTags } : {}),
    };
  };

  const handleSaveSampleMetadata = useCallback(
    (sampleId: string, metadata: SampleMetadataOverride) => {
      setSampleMetadataOverrides((previous) => {
        const normalizedMetadata = buildNormalizedMetadataOverride(metadata);
        const hasOverrides = Object.keys(normalizedMetadata).length > 0;
        const nextOverrides = { ...previous };

        if (hasOverrides) {
          nextOverrides[sampleId] = normalizedMetadata;
        } else {
          delete nextOverrides[sampleId];
        }

        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });
    },
    []
  );

  const handleResetSampleMetadata = useCallback((sampleId: string) => {
    setSampleMetadataOverrides((previous) => {
      if (!(sampleId in previous)) {
        return previous;
      }

      const nextOverrides = { ...previous };
      delete nextOverrides[sampleId];
      writeSampleMetadataOverrides(nextOverrides);
      return nextOverrides;
    });
  }, []);

  const clearLocalSampleObjectUrls = useCallback(() => {
    localSampleObjectUrlsRef.current.forEach((objectUrl) => {
      window.URL.revokeObjectURL(objectUrl);
    });
    localSampleObjectUrlsRef.current.clear();
  }, []);

  const handleLoadSampleAssets = useCallback(
    async (
      rootDirOverride?: string,
      directoryHandleOverride?: FileSystemDirectoryHandle | null
    ): Promise<boolean> => {
      const resolvedDirectoryHandle = directoryHandleOverride ?? sampleDirectoryHandle;
      const normalizedRootDir = (rootDirOverride ?? sampleRootDir).trim();

      if (!resolvedDirectoryHandle && !normalizedRootDir) {
        setSampleError("Set a sample folder path or import a project/kit to continue.");
        return false;
      }

      setIsLoadingSampleAssets(true);
      setSampleError(null);

      try {
        if (resolvedDirectoryHandle) {
          const hasPermission = await queryDirectoryReadPermission(resolvedDirectoryHandle);
          if (!hasPermission) {
            throw new Error(
              "Sample folder access was revoked. Choose the folder again to continue."
            );
          }

          const result = await scanDirectoryHandleForSamples(resolvedDirectoryHandle);
          clearLocalSampleObjectUrls();
          result.objectUrls.forEach((objectUrl) => {
            localSampleObjectUrlsRef.current.add(objectUrl);
          });
          setSampleDirectoryHandle(resolvedDirectoryHandle);
          setSampleRootDir(result.rootDir);
          setSampleRootDirDraft(result.rootDir);
          setSampleAssets(result.samples);
          writePersistedSampleSoundsDir(result.rootDir);
          sampleBufferCacheRef.current.clear();
          sampleBufferPendingRef.current.clear();
          return true;
        }

        const result = await fetchSampleAssets({
          rootDir: normalizedRootDir,
        });
        const resolvedRootDir = (result.rootDir || normalizedRootDir).trim();
        clearLocalSampleObjectUrls();
        setSampleDirectoryHandle(null);
        setSampleRootDir(resolvedRootDir);
        setSampleRootDirDraft(resolvedRootDir);
        setSampleAssets(result.samples);
        writePersistedSampleSoundsDir(resolvedRootDir);
        sampleBufferCacheRef.current.clear();
        sampleBufferPendingRef.current.clear();
        return true;
      } catch (error) {
        setSampleError(error instanceof Error ? error.message : "Unable to load samples.");
        return false;
      } finally {
        setIsLoadingSampleAssets(false);
      }
    },
    [clearLocalSampleObjectUrls, sampleDirectoryHandle, sampleRootDir]
  );

  const handleSampleRootDirChange = useCallback(
    (value: string) => {
      setSampleRootDir(value);
      setSampleRootDirDraft(value);
      setSampleDirectoryHandle(null);
      void clearPersistedDirectoryHandle().catch(() => {
        // Ignore storage errors; path mode can still function.
      });
      if (sampleError) {
        setSampleError(null);
      }
    },
    [sampleError]
  );

  const handleSampleSearchChange = useCallback(
    (value: string) => {
      setSampleSearch(value);
      if (sampleError) {
        setSampleError(null);
      }
    },
    [sampleError]
  );

  const handleSelectSampleDirectory = useCallback(() => {
    if (!supportsDirectoryPicker) {
      return;
    }

    setIsSelectingSampleDirectory(true);
    setSampleError(null);

    void (async () => {
      try {
        const selectedDirectoryHandle = await openDirectoryPicker();
        if (!selectedDirectoryHandle) {
          return;
        }

        const hasPermission = await requestDirectoryReadPermission(selectedDirectoryHandle);
        if (!hasPermission) {
          setSampleError("Sample folder permission was not granted.");
          return;
        }

        await writePersistedDirectoryHandle(selectedDirectoryHandle);
        const rootDirLabel = selectedDirectoryHandle.name.trim() || "Selected Sample Folder";
        setSampleDirectoryHandle(selectedDirectoryHandle);
        setSampleRootDir(rootDirLabel);
        setSampleRootDirDraft(rootDirLabel);
        writePersistedSampleSoundsDir(rootDirLabel);
        const didLoad = await handleLoadSampleAssets(undefined, selectedDirectoryHandle);
        if (didLoad) {
          setIsSampleRootDirPromptOpen(false);
        }
      } catch (error) {
        setSampleError(error instanceof Error ? error.message : "Unable to access selected folder.");
      } finally {
        setIsSelectingSampleDirectory(false);
      }
    })();
  }, [handleLoadSampleAssets, supportsDirectoryPicker]);

  const handleRefreshSampleAssets = useCallback(() => {
    void handleLoadSampleAssets();
  }, [handleLoadSampleAssets]);

  const handleSubmitSampleRootDirPrompt = useCallback(() => {
    if (supportsDirectoryPicker) {
      handleSelectSampleDirectory();
      return;
    }

    const normalizedRootDir = sampleRootDirDraft.trim();
    if (!normalizedRootDir) {
      setSampleError("Enter a sample folder path, or import a project/kit.");
      return;
    }

    setSampleRootDir(normalizedRootDir);
    void (async () => {
      const didLoad = await handleLoadSampleAssets(normalizedRootDir);
      if (didLoad) {
        setIsSampleRootDirPromptOpen(false);
      }
    })();
  }, [handleLoadSampleAssets, handleSelectSampleDirectory, sampleRootDirDraft, supportsDirectoryPicker]);

  const handleSampleRootPromptProjectFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const archiveFile = event.target.files?.[0];
      event.target.value = "";

      if (!archiveFile) {
        return;
      }

      setSampleError(null);
      void (async () => {
        try {
          await handleImportProject(archiveFile);
          setIsSampleRootDirPromptOpen(false);
        } catch (error) {
          setSampleError(error instanceof Error ? error.message : "Unable to import project.");
        }
      })();
    },
    [handleImportProject]
  );

  const handleSampleRootPromptKitFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const archiveFile = event.target.files?.[0];
      event.target.value = "";

      if (!archiveFile) {
        return;
      }

      setSampleError(null);
      void (async () => {
        try {
          await handleImportKit(archiveFile);
          setIsSampleRootDirPromptOpen(false);
        } catch (error) {
          setSampleError(error instanceof Error ? error.message : "Unable to import kit.");
        }
      })();
    },
    [handleImportKit]
  );

  const handleOpenSampleRootPromptProjectImport = useCallback(() => {
    sampleRootPromptProjectInputRef.current?.click();
  }, []);

  const handleOpenSampleRootPromptKitImport = useCallback(() => {
    sampleRootPromptKitInputRef.current?.click();
  }, []);

  const handleUseDemoKit = useCallback(() => {
    void (async () => {
      const didImport = await importDemoKitArchive();
      if (didImport) {
        setIsSampleRootDirPromptOpen(false);
      }
    })();
  }, [importDemoKitArchive]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSampleSource = async () => {
      const tryAutoLoadDemoKit = async (): Promise<boolean> => {
        if (hasDemoKitAutoLoaded()) {
          return false;
        }

        const didImportDemoKit = await importDemoKitArchive();
        if (cancelled) {
          return true;
        }

        if (didImportDemoKit) {
          setIsSampleRootDirPromptOpen(false);
          return true;
        }

        return false;
      };

      if (supportsDirectoryPicker) {
        const persistedDirectoryHandle = await readPersistedDirectoryHandle();
        if (cancelled) {
          return;
        }

        if (persistedDirectoryHandle) {
          const hasPermission = await queryDirectoryReadPermission(persistedDirectoryHandle);
          if (cancelled) {
            return;
          }

          if (hasPermission) {
            const rootDirLabel =
              persistedDirectoryHandle.name.trim() || sampleRootDir.trim() || "Selected Sample Folder";
            setSampleDirectoryHandle(persistedDirectoryHandle);
            setSampleRootDir(rootDirLabel);
            setSampleRootDirDraft(rootDirLabel);
            writePersistedSampleSoundsDir(rootDirLabel);
            const didLoad = await handleLoadSampleAssets(undefined, persistedDirectoryHandle);
            if (!cancelled && !didLoad) {
              setIsSampleRootDirPromptOpen(true);
            }
            return;
          }

          await clearPersistedDirectoryHandle().catch(() => {
            // Ignore storage errors; user can re-select a folder.
          });
        }

        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
        return;
      }

      const normalizedRootDir = sampleRootDir.trim();
      if (!normalizedRootDir) {
        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
        return;
      }

      const didLoad = await handleLoadSampleAssets(normalizedRootDir, null);
      if (!didLoad) {
        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
      }
    };

    void bootstrapSampleSource();

    return () => {
      cancelled = true;
    };
    // Intentional one-time initial bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSampleRootDirDraft(sampleRootDir);
  }, [sampleRootDir]);

  useEffect(() => {
    return () => {
      isCountInActiveRef.current = false;
      clearCountInTimeouts();
      stopAllLoopBufferSources();
      stopAllOneShotBufferSources();
      stopAllMetronomeSources();
      stopPreviewBufferSource();
      clearScheduledTickVisualTimeouts();

      padFlashTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      padFlashTimeoutsRef.current.clear();

      const context = audioContextRef.current;
      if (context) {
        void context.close().catch(() => {
          // Ignore cleanup errors.
        });
      }
      outputCompressorRef.current = null;
      outputCompressorContextRef.current = null;
      reverbImpulseBufferRef.current = null;
      reverbImpulseBufferContextRef.current = null;
      clearLocalSampleObjectUrls();
      importedSampleObjectUrlsRef.current.forEach((objectUrl) => {
        window.URL.revokeObjectURL(objectUrl);
      });
      importedSampleObjectUrlsRef.current.clear();
    };
  }, [
    clearCountInTimeouts,
    clearScheduledTickVisualTimeouts,
    stopAllMetronomeSources,
    stopAllLoopBufferSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
    clearLocalSampleObjectUrls,
  ]);

  return (
    <>
      <div className={pageClassName}>
        <div className={contentClassName}>
          <DrumpadHeader />
          <div className={layoutClassName}>
            <div className="space-y-6">
            <MasterControls
              isPlaying={isPlaying}
              masterVolume={masterVolume}
              bpm={sequencerBpm}
              baseStepLength={sequencerClockStepLength}
              currentStep={currentMainStep}
              projectOptions={projectOptions}
              selectedProjectId={selectedProjectId}
              onTogglePlayback={handleTogglePlayback}
              onClearSequence={handleClearSequence}
              onOpenSaveProjectModal={handleOpenSaveProjectModal}
              onProjectSelect={handleProjectSelect}
              onDeleteProject={handleDeleteProject}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
              onMasterVolumeChange={setMasterVolume}
            />
            <StepSequencer
              patterns={patternOptions}
              activePatternId={activePatternId}
              rows={sequencerRows}
              currentTick={currentStep}
              isPlaying={isPlaying}
              isRecording={isRecording}
              isMetronomeEnabled={isMetronomeEnabled}
              getCurrentTransposeSemitoneOffset={getCurrentTransposeSemitoneOffset}
              bpm={sequencerBpm}
              clockStepLength={sequencerClockStepLength}
              engineStepLength={sequencerEngineStepLength}
              onTogglePlayback={handleTogglePlayback}
              onToggleRecording={handleToggleRecording}
              onToggleMetronome={handleToggleMetronome}
              onAddPattern={handleAddSequencerPattern}
              onDuplicatePattern={handleDuplicateSequencerPattern}
              onDeletePattern={handleDeleteSequencerPattern}
              onSelectPattern={handleSelectSequencerPattern}
              onExportPattern={handleExportSequencerPattern}
              onExportRow={handleExportSequencerRow}
              onToggleRowMute={handleSequencerRowMuteToggle}
              onStepToggle={handleSequencerStepToggle}
              onStepSet={handleSequencerStepSet}
              onRowStepLengthChange={handleSequencerRowStepLengthChange}
              onBpmChange={handleSequencerBpmChange}
              onClockStepLengthChange={handleSequencerClockStepLengthChange}
            />
              <KitManager
                kits={savedKits}
                onSaveKit={handleSaveKit}
                onLoadKit={handleLoadKit}
                onExportKit={handleExportKit}
                onImportKit={handleImportKit}
              />
              <div className="rounded-xl border border-[#a8aba5] bg-[#efeee8]/90 px-3 py-3 text-center">
                <div className="mt-1 text-[#5c6270] text-xs font-medium">{KEYBOARD_HINT_TEXT}</div>
                <div className="text-[#5c6270] text-[11px] font-medium mt-2">
                  Hold `1-9` + pad key for +0.25..+2.25 octaves, hold `Shift` + `1-9` + pad key
                  for -0.25..-2.25 octaves.
                </div>
                <div className="text-[#5c6270] text-[11px] font-medium mb-2">
                  Click toggles steps. Hold `1-9` and click a step to set transpose. Hold `Shift`
                  + `1-9` and click for negative transpose.
                </div>
                <div
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 mt-2 text-[11px] font-semibold ${
                    heldTransposeSemitoneOffset === 0
                      ? "border-[#a8aba5] bg-[#d7d9d3] text-[#515a6a]"
                      : "border-[#cc6e20] bg-[#ff8c2b] text-[#ffffff]"
                  }`}
                >
                  Held Transpose: {heldTransposeOctaveOffsetLabel}
                </div>
              </div>
              <DrumpadGrid
                pads={DRUM_PADS}
                padVolumes={padVolumes}
                padNames={padNames}
                padPolyphony={padPolyphony}
                padAssignedSamples={padAssignedSamples}
                defaultPadVolume={DEFAULT_PAD_VOLUME}
                onPadButtonMount={handlePadButtonMount}
                onPadPress={handlePadPress}
                onPadSampleDrop={handlePadSampleDrop}
                onOpenPadSampleAssignModal={handleOpenPadSampleAssignModal}
                onOpenPadSampleEditor={handleOpenPadSampleEditor}
              />
            </div>
            <SampleLibrarySidebar
              rootDir={sampleRootDir}
              supportsDirectoryPicker={supportsDirectoryPicker}
              search={sampleSearch}
              isLoading={isLoadingSampleAssets}
              error={sampleError}
              totalSampleCount={effectiveSampleAssets.length}
              filteredSampleCount={filteredSampleAssets.length}
              samples={filteredSampleAssets}
              onRootDirChange={handleSampleRootDirChange}
              onPickDirectory={handleSelectSampleDirectory}
              onSearchChange={handleSampleSearchChange}
              onRefreshSamples={handleRefreshSampleAssets}
              onPreviewSample={handlePreviewSample}
              onSaveSampleMetadata={handleSaveSampleMetadata}
              onResetSampleMetadata={handleResetSampleMetadata}
            />
          </div>
        </div>
      </div>
      {countInBeatsRemaining !== null ? (
        <div className="fixed inset-0 z-[1400] pointer-events-none flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgba(255,140,43,0.16),rgba(7,10,18,0.68)_62%)] backdrop-blur-[2px]">
          <div className="relative flex flex-col items-center gap-3">
            <div className="text-[#ff8c2b] text-[30vw] sm:text-[20vw] lg:text-[13vw] leading-none font-black tracking-[0.04em] drop-shadow-[0_0_26px_rgba(255,140,43,0.65)]">
              {countInBeatsRemaining}
            </div>
          </div>
        </div>
      ) : null}
      <PadSampleAssignModal
        isOpen={Boolean(sampleAssignPad)}
        padName={sampleAssignPad ? padNames[sampleAssignPad.id] ?? sampleAssignPad.label : ""}
        samples={effectiveSampleAssets}
        onClose={handleClosePadSampleAssignModal}
        onPreviewSample={handlePreviewSample}
        onAssignSample={handleAssignSampleToSelectedPad}
      />
      <PadSampleEditorModal
        isOpen={Boolean(editingPad)}
        padName={editingPad ? padNames[editingPad.id] ?? editingPad.label : ""}
        sampleName={editingPad ? padAssignedSamples[editingPad.id]?.name ?? "" : ""}
        padVolume={editingPad ? padVolumes[editingPad.id] ?? DEFAULT_PAD_VOLUME : DEFAULT_PAD_VOLUME}
        padPolyphony={
          editingPad ? padPolyphony[editingPad.id] ?? DEFAULT_SAMPLE_POLYPHONY : DEFAULT_SAMPLE_POLYPHONY
        }
        isLoopEnabled={editingPad ? padLoopEnabled[editingPad.id] ?? false : false}
        settings={
          editingPad
            ? padSampleSettings[editingPad.id] ?? DEFAULT_PAD_SAMPLE_SETTINGS
            : DEFAULT_PAD_SAMPLE_SETTINGS
        }
        saveToKitsDisabled={!editingPadSampleId}
        saveToKitsMessage={padEditorSaveMessage}
        onOpenChange={handlePadSampleEditorOpenChange}
        onPadNameChange={(nextName) => {
          if (!editingPad) {
            return;
          }

          handlePadNameChange(editingPad.id, nextName);
        }}
        onPadVolumeChange={(nextVolume) => {
          if (!editingPad) {
            return;
          }

          handlePadVolumeChange(editingPad.id, nextVolume);
        }}
        onPadPolyphonyChange={(nextPolyphony) => {
          if (!editingPad) {
            return;
          }

          handlePadPolyphonyChange(editingPad.id, nextPolyphony);
        }}
        onPadLoopToggle={() => {
          if (!editingPad) {
            return;
          }

          handlePadLoopToggle(editingPad.id);
        }}
        onPadSampleClear={() => {
          if (!editingPad) {
            return;
          }

          handlePadSampleClear(editingPad.id);
        }}
        onChange={(nextSettings) => {
          if (!editingPad) {
            return;
          }

          handlePadSampleSettingsChange(editingPad.id, nextSettings);
        }}
        onReset={() => {
          if (!editingPad) {
            return;
          }

          handleResetPadSampleSettings(editingPad.id);
        }}
        onSaveToKits={handleSavePadEditorSettingsToSavedKits}
      />
      <input
        ref={sampleRootPromptProjectInputRef}
        type="file"
        accept={PROJECT_ARCHIVE_ACCEPT}
        className="hidden"
        onChange={handleSampleRootPromptProjectFileChange}
      />
      <input
        ref={sampleRootPromptKitInputRef}
        type="file"
        accept={KIT_ARCHIVE_ACCEPT}
        className="hidden"
        onChange={handleSampleRootPromptKitFileChange}
      />
      {isSaveProjectModalOpen ? (
        <div className="fixed inset-0 z-[4000] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-4 shadow-2xl">
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Save Project</h4>
            <p className="text-xs text-[#666] mb-3">
              {selectedProject
                ? `Overwrite "${selectedProject.name}" or save this as a new project.`
                : "Enter a name for this project."}
            </p>
            <input
              autoFocus
              type="text"
              maxLength={PROJECT_NAME_MAX_LENGTH}
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (selectedProject) {
                    handleSubmitOverwriteProject();
                  } else {
                    handleSubmitSaveProjectAsNew();
                  }
                }

                if (event.key === "Escape") {
                  handleCloseSaveProjectModal();
                }
              }}
              className="w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
              placeholder={selectedProject?.name || "My Project"}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleCloseSaveProjectModal}
              >
                Cancel
              </button>
              {selectedProject ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-xs font-bold bg-[#8f9bb0] hover:bg-[#7e8ba2] text-[#515a6a] border border-[#778299] transition-colors"
                  onClick={handleSubmitOverwriteProject}
                >
                  Overwrite
                </button>
              ) : null}
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors"
                onClick={handleSubmitSaveProjectAsNew}
              >
                {selectedProject ? "Save As New" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isSampleRootDirPromptOpen ? (
        <div className="fixed inset-0 z-[7000] bg-[#111]/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-5 shadow-2xl">
            <h4 className="text-[#515a6a] text-lg font-bold">Set Sample Folder</h4>
            <p className="text-xs text-[#666] mt-1">
              {supportsDirectoryPicker
                ? "Choose a local sample folder, or import a project/kit without selecting one."
                : "Enter a local sample folder path, or import a project/kit without setting a folder."}
            </p>
            {supportsDirectoryPicker ? (
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-[#515a6a]">SELECTED FOLDER</label>
                <input
                  type="text"
                  value={sampleRootDir || "No folder selected"}
                  readOnly
                  className="mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5]"
                />
              </div>
            ) : (
              <>
                <label className="mt-4 block text-[11px] font-bold text-[#515a6a]">SAMPLE FOLDER PATH</label>
                <input
                  autoFocus
                  type="text"
                  value={sampleRootDirDraft}
                  onChange={(event) => {
                    setSampleRootDirDraft(event.target.value);
                    if (sampleError) {
                      setSampleError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSubmitSampleRootDirPrompt();
                    }
                  }}
                  placeholder="/path/to/samples"
                  className="mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
                />
              </>
            )}
            {sampleError ? <p className="mt-2 text-xs text-[#a6382f]">{sampleError}</p> : null}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleOpenSampleRootPromptProjectImport}
              >
                Import Project
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleOpenSampleRootPromptKitImport}
              >
                Import Kit
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleUseDemoKit}
                disabled={isImportingDemoKit || isSelectingSampleDirectory}
              >
                {isImportingDemoKit ? "Loading Demo..." : "Use Demo Kit"}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSubmitSampleRootDirPrompt}
                disabled={isSelectingSampleDirectory || isImportingDemoKit}
              >
                {supportsDirectoryPicker
                  ? isSelectingSampleDirectory
                    ? "Opening..."
                    : "Choose Folder"
                  : "Load Samples"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DrumpadController;
