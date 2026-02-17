import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadGroupId,
PadGroupState,
PadGroupsState,
SceneDefinition,
SequencerPanelMode,
SongArrangementEntry
} from "../../DrumpadController.types";

export type UseApplyProjectStateInput = {
  applyPadGroupState: (candidatePadGroupState?: Partial<PadGroupState>) => PadGroupState;
  cancelCountIn: () => void;
  currentTickRef: MutableRefObject<number>;
  setActivePadGroupId: Dispatch<SetStateAction<PadGroupId>>;
  setActiveSceneId: Dispatch<SetStateAction<string>>;
  setCurrentSongEntryIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentSongEntryProgress: Dispatch<SetStateAction<number | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setIsMetronomeEnabled: Dispatch<SetStateAction<boolean>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setIsRecording: Dispatch<SetStateAction<boolean>>;
  setMasterVolume: Dispatch<SetStateAction<number>>;
  setPadGroupsState: Dispatch<SetStateAction<PadGroupsState>>;
  setSceneDefinitions: Dispatch<SetStateAction<SceneDefinition[]>>;
  setSelectedProjectId: Dispatch<SetStateAction<string>>;
  setSequencerBpm: Dispatch<SetStateAction<number>>;
  setSequencerClockStepLength: Dispatch<SetStateAction<SequencerStepLength>>;
  setSequencerPanelMode: Dispatch<SetStateAction<SequencerPanelMode>>;
  setSongArrangement: Dispatch<SetStateAction<SongArrangementEntry[]>>;
  setSongSceneDraftId: Dispatch<SetStateAction<string>>;
  stopAllLoopBufferSources: () => void;
  stopAllMetronomeSources: () => void;
  stopAllOneShotBufferSources: () => void;
};

export type ApplyProjectStateOptions = {
  selectedProjectId?: string;
  preserveTransport?: boolean;
};
