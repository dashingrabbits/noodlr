import { type Dispatch,type SetStateAction } from "react";
import type { PadGroupId,PadGroupsState,PadSampleIds,PadStepLength,PadStepOctaves,PadStepSequence,SceneDefinition,SequencerPattern } from "../../DrumpadController.types";

export type UseStateSyncEffectsInput = {
  activePadGroupId: PadGroupId;
  activePatternId: string;
  activeSceneId: string;
  buildPadGroupStateSnapshot: () => PadGroupsState[PadGroupId];
  livePadGroupsState: PadGroupsState;
  padSampleIds: PadSampleIds;
  padStepLength: PadStepLength;
  padStepOctaves: PadStepOctaves;
  padStepSequence: PadStepSequence;
  sceneDefinitions: SceneDefinition[];
  sequencerPatterns: SequencerPattern[];
  setActivePatternId: Dispatch<SetStateAction<string>>;
  setActiveSceneId: Dispatch<SetStateAction<string>>;
  setPadGroupsState: Dispatch<SetStateAction<PadGroupsState>>;
  setPadStepLength: Dispatch<SetStateAction<PadStepLength>>;
  setPadStepOctaves: Dispatch<SetStateAction<PadStepOctaves>>;
  setPadStepSequence: Dispatch<SetStateAction<PadStepSequence>>;
  setSceneDefinitions: Dispatch<SetStateAction<SceneDefinition[]>>;
  setSequencerPatterns: Dispatch<SetStateAction<SequencerPattern[]>>;
  setSongSceneDraftId: Dispatch<SetStateAction<string>>;
  songSceneDraftId: string;
  warmAssignedSamples: (sampleIds: PadSampleIds) => void;
};
