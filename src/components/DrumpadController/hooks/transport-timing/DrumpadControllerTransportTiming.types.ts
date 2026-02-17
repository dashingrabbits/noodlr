import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadGroupsState,
SceneDefinition,
SongArrangementEntry
} from "../../DrumpadController.types";

export type SongArrangementTiming = {
  totalTicks: number;
  entryDurations: Array<{
    sceneId: string;
    durationTicks: number;
    startTick: number;
    endTick: number;
  }>;
};

export type UseTransportTimingInput = {
  activeScene: SceneDefinition | null;
  basePatternLoopTicks: number;
  livePadGroupsState: PadGroupsState;
  sceneDefinitions: SceneDefinition[];
  sequencerEngineStepLength: SequencerStepLength;
  songArrangement: SongArrangementEntry[];
};
