import { useCallback } from "react";
import { createSavedKitId } from "../../../KitManager/KitManager.utilities";
import { MAX_SCENE_NAME_LENGTH } from "../../constants";
import type {
PadGroupId,
SequencerPanelMode
} from "../../DrumpadController.types";
import { createDefaultSceneDefinition } from "../../helpers/scene";

import type {
UseSceneSongModeHandlersInput,
} from "./DrumpadControllerSceneSong.types";

export const useSceneSongModeHandlers = ({
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
}: UseSceneSongModeHandlersInput) => {
  const handleSelectSceneDefinition = useCallback(
    (sceneId: string) => {
      if (sceneId === activeSceneId) {
        return;
      }

      setActiveSceneId(sceneId);
      if (isPlayingRef.current && sequencerPanelMode === "scenes") {
        restartTransportFromStart();
      }
    },
    [activeSceneId, isPlayingRef, restartTransportFromStart, sequencerPanelMode, setActiveSceneId]
  );

  const handleScenePlayStopToggle = useCallback(
    (sceneId: string) => {
      const isTargetSceneActive = activeSceneId === sceneId;
      const isTargetScenePlaying =
        isPlayingRef.current && sequencerPanelMode === "scenes" && isTargetSceneActive;

      if (isTargetScenePlaying) {
        handleTogglePlayback();
        return;
      }

      if (sequencerPanelMode !== "scenes") {
        setSequencerPanelMode("scenes");
      }
      if (!isTargetSceneActive) {
        setActiveSceneId(sceneId);
      }

      if (isPlayingRef.current) {
        restartTransportFromStart();
        return;
      }

      if (isCountInActiveRef.current) {
        cancelCountIn();
      }
      currentTickRef.current = 0;
      setCurrentStep(0);
      setCurrentSongEntryIndex(null);
      setIsPlaying(true);
    },
    [
      activeSceneId,
      cancelCountIn,
      currentTickRef,
      handleTogglePlayback,
      isCountInActiveRef,
      isPlayingRef,
      restartTransportFromStart,
      sequencerPanelMode,
      setActiveSceneId,
      setCurrentSongEntryIndex,
      setCurrentStep,
      setIsPlaying,
      setSequencerPanelMode,
    ]
  );

  const handleSelectSequencerPanelMode = useCallback(
    (nextMode: SequencerPanelMode) => {
      if (nextMode === sequencerPanelMode) {
        return;
      }

      if (isPlayingRef.current || isCountInActiveRef.current) {
        stopTransportPlayback();
      }

      setSequencerPanelMode(nextMode);
    },
    [
      isCountInActiveRef,
      isPlayingRef,
      sequencerPanelMode,
      setSequencerPanelMode,
      stopTransportPlayback,
    ]
  );

  const handleAddScene = useCallback(() => {
    setSceneDefinitions((previousScenes) => {
      const nextScene = createDefaultSceneDefinition(
        livePadGroupsState,
        previousScenes.length + 1
      );
      setActiveSceneId(nextScene.id);
      setSongSceneDraftId(nextScene.id);
      return [...previousScenes, nextScene];
    });
  }, [livePadGroupsState, setActiveSceneId, setSceneDefinitions, setSongSceneDraftId]);

  const handleDeleteActiveScene = useCallback(() => {
    if (!activeScene || sceneDefinitions.length <= 1) {
      return;
    }

    const deletedSceneId = activeScene.id;
    const nextScenes = sceneDefinitions.filter(
      (sceneDefinition) => sceneDefinition.id !== deletedSceneId
    );
    const nextActiveScene = nextScenes[0];
    if (!nextActiveScene) {
      return;
    }

    setSceneDefinitions(nextScenes);
    setActiveSceneId(nextActiveScene.id);
    setSongSceneDraftId((previous) =>
      previous === deletedSceneId ? nextActiveScene.id : previous
    );
    setSongArrangement((previousSongArrangement) =>
      previousSongArrangement.filter((songEntry) => songEntry.sceneId !== deletedSceneId)
    );
  }, [
    activeScene,
    sceneDefinitions,
    setActiveSceneId,
    setSceneDefinitions,
    setSongArrangement,
    setSongSceneDraftId,
  ]);

  const handleSceneNameChange = useCallback(
    (sceneId: string, nextName: string) => {
      const boundedName = nextName.slice(0, MAX_SCENE_NAME_LENGTH);
      setSceneDefinitions((previousScenes) =>
        previousScenes.map((sceneDefinition) =>
          sceneDefinition.id === sceneId
            ? {
                ...sceneDefinition,
                name: boundedName,
              }
            : sceneDefinition
        )
      );
    },
    [setSceneDefinitions]
  );

  const handleSceneNameCommit = useCallback(
    (sceneId: string) => {
      setSceneDefinitions((previousScenes) =>
        previousScenes.map((sceneDefinition, sceneIndex) => {
          if (sceneDefinition.id !== sceneId) {
            return sceneDefinition;
          }

          const normalizedName = sceneDefinition.name.trim();
          return {
            ...sceneDefinition,
            name: normalizedName || `Scene ${sceneIndex + 1}`,
          };
        })
      );
    },
    [setSceneDefinitions]
  );

  const handleSelectScenePattern = useCallback(
    (groupId: PadGroupId, patternId: string) => {
      setSceneDefinitions((previousScenes) =>
        previousScenes.map((sceneDefinition) => {
          if (!activeScene || sceneDefinition.id !== activeScene.id) {
            return sceneDefinition;
          }

          if (sceneDefinition.selectedPatternIdsByGroup[groupId] === patternId) {
            return {
              ...sceneDefinition,
              selectedPatternIdsByGroup: {
                ...sceneDefinition.selectedPatternIdsByGroup,
                [groupId]: null,
              },
            };
          }

          return {
            ...sceneDefinition,
            selectedPatternIdsByGroup: {
              ...sceneDefinition.selectedPatternIdsByGroup,
              [groupId]: patternId,
            },
          };
        })
      );
    },
    [activeScene, setSceneDefinitions]
  );

  const handleAddSceneToSong = useCallback(
    (sceneId: string) => {
      if (!sceneDefinitionsById.has(sceneId)) {
        return;
      }

      setSongArrangement((previousSongArrangement) => [
        ...previousSongArrangement,
        {
          id: createSavedKitId(),
          sceneId,
        },
      ]);
      const sceneName = sceneDefinitionsById.get(sceneId)?.name ?? "Scene";
      setSongModeStatusMessage(`${sceneName} added to song.`);
    },
    [sceneDefinitionsById, setSongArrangement, setSongModeStatusMessage]
  );

  const handleDeleteSongEntry = useCallback(
    (songEntryId: string) => {
      setSongArrangement((previousSongArrangement) =>
        previousSongArrangement.filter((songEntry) => songEntry.id !== songEntryId)
      );
    },
    [setSongArrangement]
  );

  const handleMoveSongEntry = useCallback(
    (draggedSongEntryId: string, targetSongEntryId: string) => {
      if (draggedSongEntryId === targetSongEntryId) {
        return;
      }

      setSongArrangement((previousSongArrangement) => {
        const draggedIndex = previousSongArrangement.findIndex(
          (songEntry) => songEntry.id === draggedSongEntryId
        );
        const targetIndex = previousSongArrangement.findIndex(
          (songEntry) => songEntry.id === targetSongEntryId
        );
        if (draggedIndex < 0 || targetIndex < 0) {
          return previousSongArrangement;
        }

        const nextSongArrangement = [...previousSongArrangement];
        const [draggedSongEntry] = nextSongArrangement.splice(draggedIndex, 1);
        nextSongArrangement.splice(targetIndex, 0, draggedSongEntry);
        return nextSongArrangement;
      });
    },
    [setSongArrangement]
  );

  return {
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
  };
};

