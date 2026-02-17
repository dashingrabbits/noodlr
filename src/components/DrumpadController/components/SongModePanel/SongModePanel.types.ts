import type { SceneDefinition, SongArrangementEntry } from "../../DrumpadController.types";

export type SongModePanelProps = {
  currentSongEntryIndex: number | null;
  currentSongEntryProgress: number | null;
  isExportingSong: boolean;
  isPlaying: boolean;
  sceneDefinitions: SceneDefinition[];
  sceneDefinitionsById: Map<string, SceneDefinition>;
  songArrangement: SongArrangementEntry[];
  songSceneDraftId: string;
  onAddSceneToSong: (sceneId: string) => void;
  onDeleteSongEntry: (songEntryId: string) => void;
  onExportSongWithStatus: () => void;
  onMoveSongEntry: (draggedSongEntryId: string, targetSongEntryId: string) => void;
  onSongSceneDraftIdChange: (sceneId: string) => void;
  onTogglePlayback: () => void;
};
