import { useCallback, useEffect, useState } from "react";
import DrumpadHeader from "../DrumpadHeader";
import DrumpadGrid from "../DrumpadGrid";
import MasterControls from "../MasterControls";
import SampleLibrarySidebar from "../SampleLibrarySidebar";
import StepSequencer from "../StepSequencer";
import SceneModePanel from "./components/SceneModePanel";
import SongModePanel from "./components/SongModePanel";
import DrumpadControllerPanelModeTabs from "./components/PanelModeTabs";
import DrumpadControllerKitPadGroupCard from "./components/KitPadGroupCard";
import DrumpadControllerOverlays from "./components/Overlays";
import {
  BASE_SEQUENCER_STEP_LENGTH,
  DEFAULT_SEQUENCER_BPM,
  KEYBOARD_HINT_TEXT,
  type SequencerStepLength,
} from "../StepSequencer/StepSequencer.utilities";
import { contentClassName, layoutClassName, pageClassName } from "./DrumpadController.styles";
import type {
  DrumPadConfig,
  PadGroupId,
  PadGroupState,
  PadGroupsState,
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadRowMuted,
  PadSampleSettingsMap,
  PadStepOctaves,
  PadStepLength,
  PadStepSequence,
  PadSampleIds,
  PadVolumes,
  SceneDefinition,
  SequencerPanelMode,
  SequencerPattern,
  SongArrangementEntry,
} from "./DrumpadController.types";
import {
  DEFAULT_SAMPLE_POLYPHONY,
  DEFAULT_PAD_SAMPLE_SETTINGS,
  DEFAULT_PAD_VOLUME,
  DRUM_PADS,
  normalizePadSampleSettings,
} from "./DrumpadController.utilities";
import { useKeyboardTransposeHotkeys } from "../KeyboardTranspose/KeyboardTranspose.hooks";
import {
  MAX_TRANSPOSE_STEP_DIGIT,
  TRANSPOSE_STEP_SEMITONES,
} from "../KeyboardTranspose/KeyboardTranspose.utilities";
import { isDirectoryPickerSupported } from "../../integrations/samples/sample.file-system";
import type {
  SampleAsset,
  SampleMetadataOverrides,
} from "../../integrations/samples/sample.types";
import { readSampleMetadataOverrides } from "../../integrations/samples/sample.utilities";
import type {
  DrumKitState,
  SavedDrumKit,
} from "../KitManager/KitManager.types";
import { readSavedKitsFromSession } from "../KitManager/KitManager.utilities";
import type {
  ProjectState,
  SavedProject,
} from "../ProjectManager/ProjectManager.types";
import {
  PROJECT_NAME_MAX_LENGTH,
  readSavedProjectsFromSession,
} from "../ProjectManager/ProjectManager.utilities";
import {
  DEFAULT_ACTIVE_PAD_GROUP_ID,
  DEFAULT_SEQUENCER_PANEL_MODE,
  KIT_ARCHIVE_ACCEPT,
  MAX_SCENE_NAME_LENGTH,
  PROJECT_ARCHIVE_ACCEPT,
} from "./constants";
import {
  clonePadGroupsState,
  clonePadStepLength,
  clonePadStepOctaves,
  clonePadStepSequence,
  cloneSequencerPatterns,
} from "./helpers/pattern";
import { isEditableEventTarget } from "./helpers/dom";
import { useDrumpadControllerInitialState } from "./hooks/initial-state";
import { useDrumpadControllerRefs } from "./hooks/bootstrap";
import { normalizePadGroupState } from "./helpers/normalization";
import {
  createDrumKitStateSnapshot,
  createPadGroupStateSnapshot,
  createProjectStateSnapshot,
} from "./helpers/snapshot";
import { useSceneSongModeHandlers } from "./hooks/scene-song";
import { useSequencerEditHandlers } from "./hooks/sequencer-edit";
import { useSequencerPatternHandlers } from "./hooks/sequencer-pattern";
import { useDrumpadAudioExportHandlers } from "./hooks/audio-export";
import { useKitArchiveHandlers } from "./hooks/kit-archive";
import { usePadSampleHandlers } from "./hooks/pad-sample";
import { useSampleMetadataHandlers } from "./hooks/sample-metadata";
import { useTransportOrchestration } from "./hooks/transport";
import { useInteractionHandlers } from "./hooks/interaction";
import { usePadGroupStateHandlers } from "./hooks/pad-group-state";
import { usePlaybackEngine } from "./hooks/playback";
import { useApplyProjectState } from "./hooks/apply-project-state";
import { useProjectActionHandlers } from "./hooks/project-actions";
import { useProjectArchiveHandlers } from "./hooks/project-archive";
import { useProjectLoadHandlers } from "./hooks/project-load";
import { useDrumpadSampleSourceHandlers } from "./hooks/sample-source";
import { useKeyboardInputEffect } from "./hooks/input";
import { useResetHandlers } from "./hooks/reset";
import { useLifecycleCleanupEffect } from "./hooks/lifecycle";
import { useDerivedState } from "./hooks/derived-state";
import { useRefSynchronization } from "./hooks/ref-sync";
import { useStateSyncEffects } from "./hooks/state-sync";
import { useKitStateHandlers } from "./hooks/kit-state";
import { useEditingPadSampleBufferEffect } from "./hooks/editing-pad-buffer";
import { useSessionCollaboration } from "./hooks/session-collaboration";
import { cloneSceneDefinitions } from "./helpers/scene";

const DrumpadController = () => {
  const {
    getInitialSampleRootDir,
    initialPadGroupsState,
    initialActivePadGroupState,
    initialSceneDefinitions,
  } = useDrumpadControllerInitialState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_PAD_VOLUME);
  const [sequencerPanelMode, setSequencerPanelMode] = useState<SequencerPanelMode>(
    DEFAULT_SEQUENCER_PANEL_MODE
  );
  const [activePadGroupId, setActivePadGroupId] = useState<PadGroupId>(
    DEFAULT_ACTIVE_PAD_GROUP_ID
  );
  const [padGroupsState, setPadGroupsState] = useState<PadGroupsState>(() =>
    clonePadGroupsState(initialPadGroupsState)
  );
  const [padVolumes, setPadVolumes] = useState<PadVolumes>(() => ({
    ...initialActivePadGroupState.padVolumes,
  }));
  const [padNames, setPadNames] = useState<PadNames>(() => ({
    ...initialActivePadGroupState.padNames,
  }));
  const [padPolyphony, setPadPolyphony] = useState<PadPolyphony>(() => ({
    ...initialActivePadGroupState.padPolyphony,
  }));
  const [padLoopEnabled, setPadLoopEnabled] = useState<PadLoopEnabled>(() => ({
    ...initialActivePadGroupState.padLoopEnabled,
  }));
  const [padRowMuted, setPadRowMuted] = useState<PadRowMuted>(() => ({
    ...initialActivePadGroupState.padRowMuted,
  }));
  const [padSampleSettings, setPadSampleSettings] = useState<PadSampleSettingsMap>(() =>
    Object.fromEntries(
      Object.entries(initialActivePadGroupState.padSampleSettings).map(([padId, settings]) => [
        Number(padId),
        normalizePadSampleSettings(settings),
      ])
    ) as PadSampleSettingsMap
  );
  const [padStepSequence, setPadStepSequence] = useState<PadStepSequence>(() =>
    clonePadStepSequence(initialActivePadGroupState.padStepSequence)
  );
  const [padStepOctaves, setPadStepOctaves] = useState<PadStepOctaves>(() =>
    clonePadStepOctaves(initialActivePadGroupState.padStepOctaves)
  );
  const [padStepLength, setPadStepLength] = useState<PadStepLength>(() =>
    clonePadStepLength(initialActivePadGroupState.padStepLength)
  );
  const [sequencerPatterns, setSequencerPatterns] = useState<SequencerPattern[]>(() =>
    cloneSequencerPatterns(initialActivePadGroupState.sequencerPatterns)
  );
  const [activePatternId, setActivePatternId] = useState<string>(
    () => initialActivePadGroupState.activePatternId
  );
  const [sceneDefinitions, setSceneDefinitions] = useState<SceneDefinition[]>(() =>
    cloneSceneDefinitions(initialSceneDefinitions)
  );
  const [activeSceneId, setActiveSceneId] = useState<string>(() => initialSceneDefinitions[0].id);
  const [songArrangement, setSongArrangement] = useState<SongArrangementEntry[]>([]);
  const [songSceneDraftId, setSongSceneDraftId] = useState<string>(
    () => initialSceneDefinitions[0].id
  );
  const [songModeStatusMessage, setSongModeStatusMessage] = useState("");
  const [isExportingSong, setIsExportingSong] = useState(false);
  const [currentSongEntryIndex, setCurrentSongEntryIndex] = useState<number | null>(null);
  const [currentSongEntryProgress, setCurrentSongEntryProgress] = useState<number | null>(null);
  const [playbackSessionId, setPlaybackSessionId] = useState(0);
  const [padSampleIds, setPadSampleIds] = useState<PadSampleIds>(() => ({
    ...initialActivePadGroupState.padSampleIds,
  }));
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
  const [editingPadSampleBuffer, setEditingPadSampleBuffer] = useState<AudioBuffer | null>(null);
  const [isEditingPadSampleBufferLoading, setIsEditingPadSampleBufferLoading] = useState(false);
  const [sampleAssignPadId, setSampleAssignPadId] = useState<number | null>(null);
  const [padEditorSaveMessage, setPadEditorSaveMessage] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
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
  const {
    activeBufferSourcesByPadRef,
    activeLoopBufferSourcesByPadRef,
    activeMetronomeSourcesRef,
    activePadGroupIdRef,
    activeSceneDurationTicksRef,
    activeSceneRef,
    audioContextRef,
    audioContextResumePendingRef,
    countInTimeoutsRef,
    currentTickRef,
    importedSampleObjectUrlsRef,
    isCountInActiveRef,
    isMetronomeEnabledRef,
    isPlayingRef,
    isRecordingRef,
    livePadGroupsStateRef,
    localSampleObjectUrlsRef,
    masterVolumeRef,
    outputCompressorContextRef,
    outputCompressorRef,
    padButtonElementsRef,
    padFlashTimeoutsRef,
    padLoopEnabledRef,
    padRowMutedRef,
    padSampleIdsRef,
    padSampleSettingsRef,
    padStepLengthRef,
    padStepOctavesRef,
    padStepSequenceRef,
    playAssignedSampleRef,
    previewBufferSourceRef,
    reverbImpulseBufferContextRef,
    reverbImpulseBufferRef,
    sampleBufferCacheRef,
    sampleBufferPendingRef,
    sampleRootPromptKitInputRef,
    sampleRootPromptProjectInputRef,
    sceneDefinitionsByIdRef,
    scheduledTickVisualTimeoutsRef,
    sequencerPanelModeRef,
    songArrangementTimingRef,
  } = useDrumpadControllerRefs({
    activePadGroupId,
    initialPadGroupsState,
    masterVolume,
    sequencerPanelMode,
  });
  const { heldTransposeSemitoneOffset, getCurrentTransposeSemitoneOffset } =
    useKeyboardTransposeHotkeys({
      isEditableEventTarget,
      maxTransposeSteps: MAX_TRANSPOSE_STEP_DIGIT,
      transposeStepSemitones: TRANSPOSE_STEP_SEMITONES,
    });

  const buildDrumKitStateSnapshot = useCallback((): DrumKitState => {
    return createDrumKitStateSnapshot({
      normalizePadSampleSettings,
      padLoopEnabled,
      padNames,
      padPolyphony,
      padSampleIds,
      padSampleSettings,
      padVolumes,
    });
  }, [
    padLoopEnabled,
    padNames,
    padPolyphony,
    padSampleSettings,
    padSampleIds,
    padVolumes,
    normalizePadSampleSettings,
  ]);

  const buildPadGroupStateSnapshot = useCallback((): PadGroupState => {
    return createPadGroupStateSnapshot({
      activePatternId,
      normalizePadSampleSettings,
      padLoopEnabled,
      padNames,
      padPolyphony,
      padRowMuted,
      padSampleIds,
      padSampleSettings,
      padStepLength,
      padStepOctaves,
      padStepSequence,
      padVolumes,
      sequencerPatterns,
    });
  }, [
    activePatternId,
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
    normalizePadSampleSettings,
    sequencerPatterns,
  ]);

  const {
    activeScene,
    activeSceneDurationTicks,
    basePatternLoopTicks,
    currentMainStep,
    editingPad,
    editingPadSample,
    editingPadSampleId,
    effectiveSampleAssets,
    filteredSampleAssets,
    heldTransposeOctaveOffsetLabel,
    keyboardPadMap,
    livePadGroupsState,
    padAssignedSamples,
    patternOptions,
    projectOptions,
    sampleAssignPad,
    sampleAssetsById,
    sceneDefinitionsById,
    selectedProject,
    sequencerEngineStepLength,
    sequencerRows,
    songArrangementTiming,
  } = useDerivedState({
    activePadGroupId,
    activeSceneId,
    buildPadGroupStateSnapshot,
    currentStep,
    editingPadId,
    heldTransposeSemitoneOffset,
    importedSampleAssets,
    padGroupsState,
    padNames,
    padRowMuted,
    padSampleIds,
    padStepLength,
    padStepOctaves,
    padStepSequence,
    sampleAssets,
    sampleMetadataOverrides,
    sampleSearch,
    sampleAssignPadId,
    savedProjects,
    sceneDefinitions,
    selectedProjectId,
    sequencerClockStepLength,
    sequencerPatterns,
    songArrangement,
  });

  useRefSynchronization({
    activePadGroupId,
    activePadGroupIdRef,
    activeScene,
    activeSceneDurationTicks,
    activeSceneDurationTicksRef,
    activeSceneRef,
    currentStep,
    currentTickRef,
    isMetronomeEnabled,
    isMetronomeEnabledRef,
    isPlaying,
    isPlayingRef,
    isRecording,
    isRecordingRef,
    livePadGroupsState,
    livePadGroupsStateRef,
    masterVolume,
    masterVolumeRef,
    padLoopEnabled,
    padLoopEnabledRef,
    padRowMuted,
    padRowMutedRef,
    padSampleIds,
    padSampleIdsRef,
    padSampleSettings,
    padSampleSettingsRef,
    padStepLength,
    padStepLengthRef,
    padStepOctaves,
    padStepOctavesRef,
    padStepSequence,
    padStepSequenceRef,
    sceneDefinitionsById,
    sceneDefinitionsByIdRef,
    sequencerPanelMode,
    sequencerPanelModeRef,
    songArrangementTiming,
    songArrangementTimingRef,
  });

  const buildProjectStateSnapshot = useCallback((): ProjectState => {
    return createProjectStateSnapshot({
      activePadGroupId,
      activeSceneId,
      isMetronomeEnabled,
      livePadGroupsState,
      masterVolume,
      normalizePadSampleSettings,
      sampleAssetsById,
      sampleDirectoryHandle,
      sampleRootDir,
      sceneDefinitions,
      sequencerBpm,
      sequencerClockStepLength,
      sequencerPanelMode,
      songArrangement,
    });
  }, [
    activeSceneId,
    activePadGroupId,
    isMetronomeEnabled,
    livePadGroupsState,
    masterVolume,
    normalizePadSampleSettings,
    sampleAssetsById,
    sampleDirectoryHandle,
    sampleRootDir,
    sceneDefinitions,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerPanelMode,
    songArrangement,
  ]);

  const {
    ensureAudioContextReady,
    ensureSampleBuffer,
    getAudioContext,
    getOutputNode,
    playAssignedSample,
    playSceneAssignedSample,
    resetAudioGraphCaches,
    scheduleMetronomeTone,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopLoopBufferSourceForPad,
  } = usePlaybackEngine({
    activeBufferSourcesByPadRef,
    activeLoopBufferSourcesByPadRef,
    activeMetronomeSourcesRef,
    audioContextRef,
    audioContextResumePendingRef,
    masterVolume,
    outputCompressorContextRef,
    outputCompressorRef,
    padAssignedSamples,
    padLoopEnabled,
    padLoopEnabledRef,
    padPolyphony,
    padSampleIdsRef,
    padSampleSettings,
    padSampleSettingsRef,
    padVolumes,
    playAssignedSampleRef,
    reverbImpulseBufferContextRef,
    reverbImpulseBufferRef,
    sampleAssetsById,
    sampleBufferCacheRef,
    sampleBufferPendingRef,
  });

  useEditingPadSampleBufferEffect({
    editingPad,
    editingPadSample,
    ensureSampleBuffer,
    sampleBufferCacheRef,
    setEditingPadSampleBuffer,
    setIsEditingPadSampleBufferLoading,
  });

  const {
    clearScheduledTickVisualTimeouts,
    flashPadVisual,
    handlePadButtonMount,
    handlePadPress,
    handlePreviewSample,
    stopPreviewBufferSource,
  } = useInteractionHandlers({
    ensureAudioContextReady,
    ensureSampleBuffer,
    getOutputNode,
    masterVolume,
    padButtonElementsRef,
    padFlashTimeoutsRef,
    playAssignedSample,
    previewBufferSourceRef,
    sampleAssetsById,
    sampleBufferCacheRef,
    scheduledTickVisualTimeoutsRef,
  });
  const {
    cancelCountIn,
    clearCountInTimeouts,
    handleTogglePlayback,
    restartTransportFromStart,
    stopTransportPlayback,
  } = useTransportOrchestration({
    activePadGroupIdRef,
    activeSceneDurationTicksRef,
    activeSceneRef,
    basePatternLoopTicks,
    clearScheduledTickVisualTimeouts,
    countInTimeoutsRef,
    currentTickRef,
    flashPadVisual,
    getAudioContext,
    isCountInActiveRef,
    isMetronomeEnabledRef,
    isPlaying,
    isPlayingRef,
    isRecording,
    isRecordingRef,
    livePadGroupsStateRef,
    masterVolume,
    masterVolumeRef,
    padRowMutedRef,
    padSampleIdsRef,
    padStepLengthRef,
    padStepOctavesRef,
    padStepSequenceRef,
    playAssignedSampleRef,
    playbackSessionId,
    playSceneAssignedSample,
    sceneDefinitionsByIdRef,
    scheduleMetronomeTone,
    scheduledTickVisualTimeoutsRef,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerEngineStepLength,
    sequencerPanelModeRef,
    setCountInBeatsRemaining,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    setIsPlaying,
    setPlaybackSessionId,
    songArrangementTimingRef,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  });

  const {
    handleAddSequencerPattern,
    handleDeleteSequencerPattern,
    handleDuplicateSequencerPattern,
    handleSelectSequencerPattern,
  } = useSequencerPatternHandlers({
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
  });

  const { applyPadGroupState, handleSelectPadGroup, warmAssignedSamples } =
    usePadGroupStateHandlers({
      activePadGroupId,
      activePadGroupIdRef,
      buildPadGroupStateSnapshot,
      cancelCountIn,
      clearScheduledTickVisualTimeouts,
      currentTickRef,
      ensureSampleBuffer,
      normalizePadGroupState,
      padGroupsState,
      sampleAssetsById,
      setActivePadGroupId,
      setActivePatternId,
      setCurrentStep,
      setEditingPadId,
      setIsPlaying,
      setIsRecording,
      setPadGroupsState,
      setPadLoopEnabled,
      setPadNames,
      setPadPolyphony,
      setPadRowMuted,
      setPadSampleIds,
      setPadSampleSettings,
      setPadStepLength,
      setPadStepOctaves,
      setPadStepSequence,
      setPadVolumes,
      setSampleAssignPadId,
      setSequencerPatterns,
      stopAllLoopBufferSources,
      stopAllMetronomeSources,
      stopAllOneShotBufferSources,
      stopPreviewBufferSource,
    });

  const {
    handleAddScene,
    handleAddSceneToSong,
    handleDeleteActiveScene,
    handleDeleteSongEntry,
    handleMoveSongEntry,
    handleSceneNameChange,
    handleSceneNameCommit,
    handleScenePlayStopToggle,
    handleSelectSceneDefinition,
    handleSelectScenePattern,
    handleSelectSequencerPanelMode,
  } = useSceneSongModeHandlers({
    activeScene,
    activeSceneId,
    cancelCountIn,
    currentTickRef,
    handleTogglePlayback,
    isCountInActiveRef,
    isPlayingRef,
    livePadGroupsState,
    restartTransportFromStart,
    sceneDefinitions,
    sceneDefinitionsById,
    sequencerPanelMode,
    setActiveSceneId,
    setCurrentSongEntryIndex,
    setCurrentStep,
    setIsPlaying,
    setSceneDefinitions,
    setSequencerPanelMode,
    setSongArrangement,
    setSongModeStatusMessage,
    setSongSceneDraftId,
    stopTransportPlayback,
  });

  const {
    handleSequencerBpmChange,
    handleSequencerClockStepLengthChange,
    handleSequencerRowMuteToggle,
    handleSequencerRowStepLengthChange,
    handleSequencerStepSet,
    handleSequencerStepToggle,
    handleToggleMetronome,
    handleToggleRecording,
    recordPadStepAtQuantizedTick,
  } = useSequencerEditHandlers({
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
  });

  useKeyboardInputEffect({
    getCurrentTransposeSemitoneOffset,
    handlePadPress,
    isRecording,
    keyboardPadMap,
    recordPadStepAtQuantizedTick,
    setIsRecording,
  });

  useStateSyncEffects({
    activePadGroupId,
    activePatternId,
    activeSceneId,
    buildPadGroupStateSnapshot,
    livePadGroupsState,
    padSampleIds,
    padStepLength,
    padStepOctaves,
    padStepSequence,
    sceneDefinitions,
    sequencerPatterns,
    setActivePatternId,
    setActiveSceneId,
    setPadGroupsState,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setSceneDefinitions,
    setSequencerPatterns,
    setSongSceneDraftId,
    songSceneDraftId,
    warmAssignedSamples,
  });

  const { applyDrumKitState, handleLoadKit, handleSaveKit } = useKitStateHandlers({
    activePadGroupId,
    applyPadGroupState,
    buildDrumKitStateSnapshot,
    buildPadGroupStateSnapshot,
    savedKits,
    setPadGroupsState,
    setSavedKits,
    stopAllLoopBufferSources,
  });

  const { handleExportKit, handleImportKit, importDemoKitArchive } = useKitArchiveHandlers({
    applyDrumKitState,
    buildDrumKitStateSnapshot,
    ensureSampleBuffer,
    importedSampleObjectUrlsRef,
    sampleAssetsById,
    sampleBufferCacheRef,
    sampleMetadataOverrides,
    setImportedSampleAssets,
    setIsImportingDemoKit,
    setSampleError,
    setSampleMetadataOverrides,
  });

  const applyProjectState = useApplyProjectState({
    applyPadGroupState,
    cancelCountIn,
    currentTickRef,
    setActivePadGroupId,
    setActiveSceneId,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    setIsMetronomeEnabled,
    setIsPlaying,
    setIsRecording,
    setMasterVolume,
    setPadGroupsState,
    setSceneDefinitions,
    setSelectedProjectId,
    setSequencerBpm,
    setSequencerClockStepLength,
    setSequencerPanelMode,
    setSongArrangement,
    setSongSceneDraftId,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
  });

  const { handleExportProject, handleImportProject } = useProjectArchiveHandlers({
    applyProjectState,
    buildProjectStateSnapshot,
    ensureSampleBuffer,
    importedSampleObjectUrlsRef,
    sampleAssetsById,
    sampleBufferCacheRef,
    sampleMetadataOverrides,
    selectedProject,
    setImportedSampleAssets,
    setSampleMetadataOverrides,
  });

  const {
    handleExportSequencerPattern,
    handleExportSequencerRow,
    handleExportSongWithStatus,
  } = useDrumpadAudioExportHandlers({
    activePatternId,
    ensureSampleBuffer,
    isExportingSong,
    livePadGroupsState,
    masterVolume,
    padLoopEnabled,
    padNames,
    padRowMuted,
    padSampleIds,
    padSampleSettings,
    padStepLength,
    padStepOctaves,
    padStepSequence,
    padVolumes,
    patternOptions,
    sampleAssetsById,
    sampleBufferCacheRef,
    sceneDefinitionsById,
    selectedProject,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerEngineStepLength,
    setIsExportingSong,
    setSongModeStatusMessage,
    songArrangementTiming,
  });

  const {
    handleCloseSaveProjectModal,
    handleDeleteProject,
    handleOpenSaveProjectModal,
    handleSubmitOverwriteProject,
    handleSubmitSaveProjectAsNew,
    isSaveProjectModalOpen,
    projectNameDraft,
    setProjectNameDraft,
  } = useProjectActionHandlers({
    buildProjectStateSnapshot,
    selectedProject,
    setSavedProjects,
    setSelectedProjectId,
  });

  const {
    handleAssignSampleToSelectedPad,
    handleClosePadSampleAssignModal,
    handleOpenPadSampleAssignModal,
    handleOpenPadSampleEditor,
    handlePadLoopToggle,
    handlePadNameChange,
    handlePadPolyphonyChange,
    handlePadSampleClear,
    handlePadSampleDrop,
    handlePadSampleEditorOpenChange,
    handlePadSampleSettingsChange,
    handlePadVolumeChange,
    handleResetPadSampleSettings,
    handleSavePadEditorSettingsToSavedKits,
  } = usePadSampleHandlers({
    editingPadId,
    editingPadSampleId,
    ensureSampleBuffer,
    padSampleSettings,
    sampleAssetsById,
    sampleAssignPadId,
    setEditingPadId,
    setEditingPadSampleBuffer,
    setIsEditingPadSampleBufferLoading,
    setPadEditorSaveMessage,
    setPadLoopEnabled,
    setPadNames,
    setPadPolyphony,
    setPadSampleIds,
    setPadSampleSettings,
    setPadVolumes,
    setSampleAssignPadId,
    setSavedKits,
    stopLoopBufferSourceForPad,
  });

  const { handleResetSampleMetadata, handleSaveSampleMetadata } = useSampleMetadataHandlers({
    setSampleMetadataOverrides,
  });

  const {
    clearLocalSampleObjectUrls,
    handleOpenSampleRootPromptKitImport,
    handleOpenSampleRootPromptProjectImport,
    handleRefreshSampleAssets,
    handleRestoreProjectSampleSource,
    handleSampleRootDirChange,
    handleSampleRootPromptKitFileChange,
    handleSampleRootPromptProjectFileChange,
    handleSampleSearchChange,
    handleSelectSampleDirectory,
    handleSubmitSampleRootDirPrompt,
    handleUseDemoKit,
  } = useDrumpadSampleSourceHandlers({
    handleImportKit,
    handleImportProject,
    importDemoKitArchive,
    localSampleObjectUrlsRef,
    sampleBufferCacheRef,
    sampleBufferPendingRef,
    sampleDirectoryHandle,
    sampleError,
    sampleRootDir,
    sampleRootDirDraft,
    sampleRootPromptKitInputRef,
    sampleRootPromptProjectInputRef,
    setIsLoadingSampleAssets,
    setIsSampleRootDirPromptOpen,
    setIsSelectingSampleDirectory,
    setSampleAssets,
    setSampleDirectoryHandle,
    setSampleError,
    setSampleRootDir,
    setSampleRootDirDraft,
    setSampleSearch,
    supportsDirectoryPicker,
  });

  const {
    clearProjectLoadFeedback,
    handleProjectSelect,
    missingProjectSamples,
    projectLoadStatusMessage,
  } = useProjectLoadHandlers({
    applyProjectState,
    handleRestoreProjectSampleSource,
    importDemoKitArchive,
    isImportingDemoKit,
    isLoadingSampleAssets,
    sampleAssetsById,
    savedProjects,
    setSelectedProjectId,
  });

  const {
    clearSessionEnvironment,
    clearSessionError,
    copySessionId,
    handleJoinSession,
    handleKickSessionUser,
    handleLeaveSession,
    handleResolveSessionEndPrompt,
    handleShareSession,
    isSessionEndPromptOpen,
    isSessionHost,
    queueSessionSync,
    sessionConnectionStatus,
    sessionError,
    sessionId,
    sessionParticipants,
  } = useSessionCollaboration({
    activePadGroupIdRef,
    activeSceneRef,
    applyProjectState,
    buildProjectStateSnapshot,
    ensureSampleBuffer,
    importedSampleObjectUrlsRef,
    livePadGroupsStateRef,
    sampleAssetsById,
    sampleMetadataOverrides,
    sequencerPanelModeRef,
    setImportedSampleAssets,
    setSampleMetadataOverrides,
  });

  useEffect(() => {
    queueSessionSync();
  }, [queueSessionSync, buildProjectStateSnapshot, sampleMetadataOverrides, sampleAssetsById]);

  const { handleClearSequence, handleCreateNewProject } = useResetHandlers({
    cancelCountIn,
    clearProjectLoadFeedback,
    clearScheduledTickVisualTimeouts,
    currentTickRef,
    handleCloseSaveProjectModal,
    setActivePadGroupId,
    setActivePatternId,
    setActiveSceneId,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    setEditingPadId,
    setEditingPadSampleBuffer,
    setIsEditingPadSampleBufferLoading,
    setIsExportingSong,
    setIsMetronomeEnabled,
    setIsPlaying,
    setIsRecording,
    setMasterVolume,
    setPadEditorSaveMessage,
    setPadGroupsState,
    setPadLoopEnabled,
    setPadNames,
    setPadPolyphony,
    setPadRowMuted,
    setPadSampleIds,
    setPadSampleSettings,
    setPadStepLength,
    setPadStepOctaves,
    setPadStepSequence,
    setPadVolumes,
    setSampleAssignPadId,
    setSceneDefinitions,
    setSelectedProjectId,
    setSequencerBpm,
    setSequencerClockStepLength,
    setSequencerPanelMode,
    setSequencerPatterns,
    setSongArrangement,
    setSongSceneDraftId,
    stopAllLoopBufferSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  });

  const handleSessionEndDiscard = useCallback(() => {
    clearSessionEnvironment();
    handleCreateNewProject();
  }, [clearSessionEnvironment, handleCreateNewProject]);

  const handleSessionEndDownload = useCallback(async () => {
    await handleExportProject();
    clearSessionEnvironment();
    handleCreateNewProject();
  }, [clearSessionEnvironment, handleCreateNewProject, handleExportProject]);

  const handleJoinSessionFromPrompt = useCallback(
    async (input: Parameters<typeof handleJoinSession>[0]) => {
      await handleJoinSession(input);
      setIsSampleRootDirPromptOpen(false);
    },
    [handleJoinSession, setIsSampleRootDirPromptOpen]
  );

  useLifecycleCleanupEffect({
    audioContextRef,
    clearCountInTimeouts,
    clearLocalSampleObjectUrls,
    clearScheduledTickVisualTimeouts,
    importedSampleObjectUrlsRef,
    isCountInActiveRef,
    padFlashTimeoutsRef,
    resetAudioGraphCaches,
    stopAllMetronomeSources,
    stopAllLoopBufferSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  });

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
              onCreateNewProject={handleCreateNewProject}
              onProjectSelect={handleProjectSelect}
              onDeleteProject={handleDeleteProject}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
              onMasterVolumeChange={setMasterVolume}
            />
            <DrumpadControllerPanelModeTabs
              sequencerPanelMode={sequencerPanelMode}
              onSelectSequencerPanelMode={handleSelectSequencerPanelMode}
            />
            {sequencerPanelMode === "sequencer" ? (
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
            ) : null}
            {sequencerPanelMode === "scenes" ? (
              <SceneModePanel
                activeScene={activeScene}
                isPlaying={isPlaying && sequencerPanelMode === "scenes"}
                livePadGroupsState={livePadGroupsState}
                maxSceneNameLength={MAX_SCENE_NAME_LENGTH}
                sceneDefinitions={sceneDefinitions}
                onAddScene={handleAddScene}
                onAddSceneToSong={handleAddSceneToSong}
                onDeleteActiveScene={handleDeleteActiveScene}
                onSceneNameChange={handleSceneNameChange}
                onSceneNameCommit={handleSceneNameCommit}
                onScenePlayStopToggle={handleScenePlayStopToggle}
                onSelectSceneDefinition={handleSelectSceneDefinition}
                onSelectScenePattern={handleSelectScenePattern}
              />
            ) : null}
            {sequencerPanelMode === "song" ? (
              <SongModePanel
                currentSongEntryIndex={currentSongEntryIndex}
                currentSongEntryProgress={currentSongEntryProgress}
                isExportingSong={isExportingSong}
                isPlaying={isPlaying && sequencerPanelMode === "song"}
                sceneDefinitions={sceneDefinitions}
                sceneDefinitionsById={sceneDefinitionsById}
                songArrangement={songArrangement}
                songSceneDraftId={songSceneDraftId}
                onAddSceneToSong={handleAddSceneToSong}
                onDeleteSongEntry={handleDeleteSongEntry}
                onExportSongWithStatus={handleExportSongWithStatus}
                onMoveSongEntry={handleMoveSongEntry}
                onSongSceneDraftIdChange={setSongSceneDraftId}
                onTogglePlayback={handleTogglePlayback}
              />
            ) : null}
              <DrumpadControllerKitPadGroupCard
                activePadGroupId={activePadGroupId}
                heldTransposeOctaveOffsetLabel={heldTransposeOctaveOffsetLabel}
                heldTransposeSemitoneOffset={heldTransposeSemitoneOffset}
                keyboardHintText={KEYBOARD_HINT_TEXT}
                kits={savedKits}
                onExportKit={handleExportKit}
                onImportKit={handleImportKit}
                onLoadKit={handleLoadKit}
                onSaveKit={handleSaveKit}
                onSelectPadGroup={handleSelectPadGroup}
              />
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
              sessionSharingProps={{
                sessionConnectionStatus,
                sessionError,
                sessionId,
                isSessionHost,
                isSessionEndPromptOpen,
                onClearSessionError: clearSessionError,
                onCopySessionId: copySessionId,
                onHandleSessionEndDownload: handleSessionEndDownload,
                onHandleSessionEndDiscard: handleSessionEndDiscard,
                onJoinSession: handleJoinSession,
                onKickSessionUser: handleKickSessionUser,
                onLeaveSession: handleLeaveSession,
                onResolveSessionEndPrompt: handleResolveSessionEndPrompt,
                onShareSession: handleShareSession,
                sessionParticipants,
              }}
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
      <DrumpadControllerOverlays
        clearProjectLoadFeedback={clearProjectLoadFeedback}
        countInBeatsRemaining={countInBeatsRemaining}
        defaultPadSampleSettings={DEFAULT_PAD_SAMPLE_SETTINGS}
        defaultPadVolume={DEFAULT_PAD_VOLUME}
        defaultSamplePolyphony={DEFAULT_SAMPLE_POLYPHONY}
        editingPad={editingPad as DrumPadConfig | null}
        editingPadSampleBuffer={editingPadSampleBuffer}
        editingPadSampleId={editingPadSampleId}
        effectiveSampleAssets={effectiveSampleAssets}
        handleAssignSampleToSelectedPad={handleAssignSampleToSelectedPad}
        handleClosePadSampleAssignModal={handleClosePadSampleAssignModal}
        handleCloseSaveProjectModal={handleCloseSaveProjectModal}
        handleOpenSampleRootPromptKitImport={handleOpenSampleRootPromptKitImport}
        handleOpenSampleRootPromptProjectImport={handleOpenSampleRootPromptProjectImport}
        handlePadLoopToggle={handlePadLoopToggle}
        handlePadNameChange={handlePadNameChange}
        handlePadPolyphonyChange={handlePadPolyphonyChange}
        handlePadSampleClear={handlePadSampleClear}
        handlePadSampleEditorOpenChange={handlePadSampleEditorOpenChange}
        handlePadSampleSettingsChange={handlePadSampleSettingsChange}
        handlePadVolumeChange={handlePadVolumeChange}
        handlePreviewSample={handlePreviewSample}
        handleResetPadSampleSettings={handleResetPadSampleSettings}
        handleSampleRootPromptKitFileChange={handleSampleRootPromptKitFileChange}
        handleSampleRootPromptProjectFileChange={handleSampleRootPromptProjectFileChange}
        handleSavePadEditorSettingsToSavedKits={handleSavePadEditorSettingsToSavedKits}
        handleSubmitOverwriteProject={handleSubmitOverwriteProject}
        handleSubmitSampleRootDirPrompt={handleSubmitSampleRootDirPrompt}
        handleSubmitSaveProjectAsNew={handleSubmitSaveProjectAsNew}
        handleUseDemoKit={handleUseDemoKit}
        isEditingPadSampleBufferLoading={isEditingPadSampleBufferLoading}
        isImportingDemoKit={isImportingDemoKit}
        isSampleRootDirPromptOpen={isSampleRootDirPromptOpen}
        isSaveProjectModalOpen={isSaveProjectModalOpen}
        isSelectingSampleDirectory={isSelectingSampleDirectory}
        kitArchiveAccept={KIT_ARCHIVE_ACCEPT}
        missingProjectSamples={missingProjectSamples}
        padAssignedSamples={padAssignedSamples}
        padEditorSaveMessage={padEditorSaveMessage}
        padLoopEnabled={padLoopEnabled}
        padNames={padNames}
        padPolyphony={padPolyphony}
        padSampleSettings={padSampleSettings}
        padVolumes={padVolumes}
        projectArchiveAccept={PROJECT_ARCHIVE_ACCEPT}
        projectLoadStatusMessage={projectLoadStatusMessage}
        projectNameDraft={projectNameDraft}
        projectNameMaxLength={PROJECT_NAME_MAX_LENGTH}
        sampleAssignPad={sampleAssignPad as DrumPadConfig | null}
        sampleError={sampleError}
        sampleRootDir={sampleRootDir}
        sampleRootDirDraft={sampleRootDirDraft}
        sampleRootPromptKitInputRef={sampleRootPromptKitInputRef}
        sampleRootPromptProjectInputRef={sampleRootPromptProjectInputRef}
        selectedProject={selectedProject}
        setProjectNameDraft={setProjectNameDraft}
        setSampleError={setSampleError}
        setSampleRootDirDraft={setSampleRootDirDraft}
        sessionConnectionStatus={sessionConnectionStatus}
        sessionError={sessionError}
        songModeStatusMessage={songModeStatusMessage}
        supportsDirectoryPicker={supportsDirectoryPicker}
        onClearSessionError={clearSessionError}
        onClearSongModeStatusMessage={() => setSongModeStatusMessage("")}
        onJoinSessionFromPrompt={handleJoinSessionFromPrompt}
      />
    </>
  );
};

export default DrumpadController;
