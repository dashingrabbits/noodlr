import { createSavedKitId } from "../../../KitManager/KitManager.utilities";
import { PAD_GROUP_IDS } from "../../constants";
import type {
  PadGroupsState,
  SceneDefinition,
  ScenePatternSelection,
  SequencerPanelMode,
  SongArrangementEntry,
} from "../../DrumpadController.types";

export const createDefaultScenePatternSelection = (
  padGroupsState: PadGroupsState
): ScenePatternSelection => {
  return PAD_GROUP_IDS.reduce((selection, groupId) => {
    void padGroupsState[groupId];
    selection[groupId] = null;
    return selection;
  }, {} as ScenePatternSelection);
};

export const createDefaultSceneDefinition = (
  padGroupsState: PadGroupsState,
  sceneNumber = 1
): SceneDefinition => {
  return {
    id: createSavedKitId(),
    name: `Scene ${sceneNumber}`,
    selectedPatternIdsByGroup: createDefaultScenePatternSelection(padGroupsState),
  };
};

export const cloneScenePatternSelection = (
  scenePatternSelection: ScenePatternSelection
): ScenePatternSelection => {
  return { ...scenePatternSelection };
};

export const cloneSceneDefinition = (sceneDefinition: SceneDefinition): SceneDefinition => {
  return {
    ...sceneDefinition,
    selectedPatternIdsByGroup: cloneScenePatternSelection(sceneDefinition.selectedPatternIdsByGroup),
  };
};

export const cloneSceneDefinitions = (sceneDefinitions: SceneDefinition[]): SceneDefinition[] => {
  return sceneDefinitions.map((sceneDefinition) => cloneSceneDefinition(sceneDefinition));
};

export const cloneSongArrangement = (songArrangement: SongArrangementEntry[]): SongArrangementEntry[] => {
  return songArrangement.map((songEntry) => ({ ...songEntry }));
};

export const areSceneDefinitionsEqual = (
  leftScenes: SceneDefinition[],
  rightScenes: SceneDefinition[]
): boolean => {
  if (leftScenes.length !== rightScenes.length) {
    return false;
  }

  return leftScenes.every((leftScene, sceneIndex) => {
    const rightScene = rightScenes[sceneIndex];
    if (!rightScene) {
      return false;
    }

    if (leftScene.id !== rightScene.id || leftScene.name !== rightScene.name) {
      return false;
    }

    return PAD_GROUP_IDS.every(
      (groupId) =>
        leftScene.selectedPatternIdsByGroup[groupId] === rightScene.selectedPatternIdsByGroup[groupId]
    );
  });
};

export const isSequencerPanelMode = (value: unknown): value is SequencerPanelMode => {
  return value === "sequencer" || value === "scenes" || value === "song";
};
