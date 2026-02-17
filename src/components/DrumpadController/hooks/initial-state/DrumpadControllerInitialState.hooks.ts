import { useCallback, useMemo } from "react";
import { DEFAULT_ACTIVE_PAD_GROUP_ID } from "../../constants";
import { createInitialPadGroupsState } from "../../helpers/pattern";
import { createDefaultSceneDefinition } from "../../helpers/scene";
import { readPersistedSampleSoundsDir } from "../../DrumpadController.utilities";

export const useDrumpadControllerInitialState = () => {
  const getInitialSampleRootDir = useCallback(() => readPersistedSampleSoundsDir(), []);
  const initialPadGroupsState = useMemo(() => createInitialPadGroupsState(), []);
  const initialActivePadGroupState = initialPadGroupsState[DEFAULT_ACTIVE_PAD_GROUP_ID];
  const initialSceneDefinitions = useMemo(
    () => [createDefaultSceneDefinition(initialPadGroupsState, 1)],
    [initialPadGroupsState]
  );

  return {
    getInitialSampleRootDir,
    initialPadGroupsState,
    initialActivePadGroupState,
    initialSceneDefinitions,
  };
};
