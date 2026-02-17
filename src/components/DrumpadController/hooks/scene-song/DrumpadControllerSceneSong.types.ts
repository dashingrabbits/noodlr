import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type {
PadGroupsState,
SceneDefinition,
SequencerPanelMode,
SongArrangementEntry
} from "../../DrumpadController.types";

export type UseSceneSongModeHandlersInput = {
  activeScene: SceneDefinition | null;
  activeSceneId: string;
  cancelCountIn: () => void;
  handleTogglePlayback: () => void;
  isCountInActiveRef: MutableRefObject<boolean>;
  isPlayingRef: MutableRefObject<boolean>;
  livePadGroupsState: PadGroupsState;
  restartTransportFromStart: () => void;
  sceneDefinitions: SceneDefinition[];
  sceneDefinitionsById: Map<string, SceneDefinition>;
  sequencerPanelMode: SequencerPanelMode;
  setActiveSceneId: Dispatch<SetStateAction<string>>;
  setCurrentSongEntryIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setSceneDefinitions: Dispatch<SetStateAction<SceneDefinition[]>>;
  setSequencerPanelMode: Dispatch<SetStateAction<SequencerPanelMode>>;
  setSongArrangement: Dispatch<SetStateAction<SongArrangementEntry[]>>;
  setSongModeStatusMessage: Dispatch<SetStateAction<string>>;
  setSongSceneDraftId: Dispatch<SetStateAction<string>>;
  stopTransportPlayback: () => void;
  currentTickRef: MutableRefObject<number>;
};
