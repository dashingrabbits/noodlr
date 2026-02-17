import type { PadGroupId, PadGroupsState, SceneDefinition } from "../../DrumpadController.types";

export type SceneModePanelProps = {
  activeScene: SceneDefinition | null;
  isPlaying: boolean;
  livePadGroupsState: PadGroupsState;
  maxSceneNameLength: number;
  sceneDefinitions: SceneDefinition[];
  onAddScene: () => void;
  onAddSceneToSong: (sceneId: string) => void;
  onDeleteActiveScene: () => void;
  onSceneNameChange: (sceneId: string, nextName: string) => void;
  onSceneNameCommit: (sceneId: string) => void;
  onScenePlayStopToggle: (sceneId: string) => void;
  onSelectSceneDefinition: (sceneId: string) => void;
  onSelectScenePattern: (groupId: PadGroupId, patternId: string) => void;
};
