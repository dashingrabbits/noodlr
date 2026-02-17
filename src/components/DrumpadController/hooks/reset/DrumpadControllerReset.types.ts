import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadGroupId,
PadGroupsState,
PadLoopEnabled,
PadNames,
PadPolyphony,
PadRowMuted,
PadSampleIds,
PadSampleSettingsMap,
PadStepLength,
PadStepOctaves,
PadStepSequence,
PadVolumes,
SceneDefinition,
SequencerPanelMode,
SequencerPattern,
SongArrangementEntry,
} from "../../DrumpadController.types";

export type UseResetHandlersInput = {
  cancelCountIn: () => void;
  clearProjectLoadFeedback: () => void;
  clearScheduledTickVisualTimeouts: () => void;
  currentTickRef: MutableRefObject<number>;
  handleCloseSaveProjectModal: () => void;
  setActivePadGroupId: Dispatch<SetStateAction<PadGroupId>>;
  setActivePatternId: Dispatch<SetStateAction<string>>;
  setActiveSceneId: Dispatch<SetStateAction<string>>;
  setCurrentSongEntryIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentSongEntryProgress: Dispatch<SetStateAction<number | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setEditingPadId: Dispatch<SetStateAction<number | null>>;
  setEditingPadSampleBuffer: Dispatch<SetStateAction<AudioBuffer | null>>;
  setIsEditingPadSampleBufferLoading: Dispatch<SetStateAction<boolean>>;
  setIsExportingSong: Dispatch<SetStateAction<boolean>>;
  setIsMetronomeEnabled: Dispatch<SetStateAction<boolean>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setMasterVolume: Dispatch<SetStateAction<number>>;
  setPadEditorSaveMessage: Dispatch<SetStateAction<string>>;
  setPadGroupsState: Dispatch<SetStateAction<PadGroupsState>>;
  setPadLoopEnabled: Dispatch<SetStateAction<PadLoopEnabled>>;
  setPadNames: Dispatch<SetStateAction<PadNames>>;
  setPadPolyphony: Dispatch<SetStateAction<PadPolyphony>>;
  setPadRowMuted: Dispatch<SetStateAction<PadRowMuted>>;
  setPadSampleIds: Dispatch<SetStateAction<PadSampleIds>>;
  setPadSampleSettings: Dispatch<SetStateAction<PadSampleSettingsMap>>;
  setPadStepLength: Dispatch<SetStateAction<PadStepLength>>;
  setPadStepOctaves: Dispatch<SetStateAction<PadStepOctaves>>;
  setPadStepSequence: Dispatch<SetStateAction<PadStepSequence>>;
  setPadVolumes: Dispatch<SetStateAction<PadVolumes>>;
  setSampleAssignPadId: Dispatch<SetStateAction<number | null>>;
  setSceneDefinitions: Dispatch<SetStateAction<SceneDefinition[]>>;
  setSelectedProjectId: Dispatch<SetStateAction<string>>;
  setSequencerBpm: Dispatch<SetStateAction<number>>;
  setSequencerClockStepLength: Dispatch<SetStateAction<SequencerStepLength>>;
  setSequencerPanelMode: Dispatch<SetStateAction<SequencerPanelMode>>;
  setSequencerPatterns: Dispatch<SetStateAction<SequencerPattern[]>>;
  setSongArrangement: Dispatch<SetStateAction<SongArrangementEntry[]>>;
  setSongSceneDraftId: Dispatch<SetStateAction<string>>;
  stopAllLoopBufferSources: () => void;
  stopAllOneShotBufferSources: () => void;
  stopPreviewBufferSource: () => void;
};
