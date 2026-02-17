import type { SampleAsset,SampleMetadataOverrides } from "../../../../integrations/samples/sample.types";
import type { ProjectOption } from "../../../MasterControls";
import type { SavedProject } from "../../../ProjectManager/ProjectManager.types";
import {
type SequencerStepLength
} from "../../../StepSequencer/StepSequencer.utilities";
import type {
PadAssignedSamples,
PadGroupId,
PadGroupsState,
PadGroupState,
PadNames,
PadRowMuted,
PadSampleIds,
PadStepLength,
PadStepOctaves,
PadStepSequence,
SceneDefinition,
SequencerPattern,
SongArrangementEntry,
} from "../../DrumpadController.types";
import { DRUM_PADS } from "../../DrumpadController.utilities";
import { type SongArrangementTiming } from "../transport-timing";

export type UseDerivedStateInput = {
  activePadGroupId: PadGroupId;
  activeSceneId: string;
  buildPadGroupStateSnapshot: () => PadGroupState;
  currentStep: number;
  editingPadId: number | null;
  heldTransposeSemitoneOffset: number;
  importedSampleAssets: SampleAsset[];
  padGroupsState: PadGroupsState;
  padNames: PadNames;
  padRowMuted: PadRowMuted;
  padSampleIds: PadSampleIds;
  padStepLength: PadStepLength;
  padStepOctaves: PadStepOctaves;
  padStepSequence: PadStepSequence;
  sampleAssets: SampleAsset[];
  sampleMetadataOverrides: SampleMetadataOverrides;
  sampleSearch: string;
  sampleAssignPadId: number | null;
  savedProjects: SavedProject[];
  sceneDefinitions: SceneDefinition[];
  selectedProjectId: string;
  sequencerClockStepLength: SequencerStepLength;
  sequencerPatterns: SequencerPattern[];
  songArrangement: SongArrangementEntry[];
};

export type UseDerivedStateResult = {
  activeScene: SceneDefinition | null;
  activeSceneDurationTicks: number;
  basePatternLoopTicks: number;
  combinedSampleAssets: SampleAsset[];
  editingPad: (typeof DRUM_PADS)[number] | null;
  editingPadSample: SampleAsset | null;
  editingPadSampleId: string;
  effectiveSampleAssets: SampleAsset[];
  filteredSampleAssets: SampleAsset[];
  heldTransposeOctaveOffsetLabel: string;
  keyboardPadMap: Map<string, number>;
  livePadGroupsState: PadGroupsState;
  padAssignedSamples: PadAssignedSamples;
  patternOptions: Array<{ id: string; name: string }>;
  projectOptions: ProjectOption[];
  sampleAssetsById: Map<string, SampleAsset>;
  sampleAssignPad: (typeof DRUM_PADS)[number] | null;
  sceneDefinitionsById: Map<string, SceneDefinition>;
  selectedProject: SavedProject | null;
  sequencerEngineStepLength: SequencerStepLength;
  sequencerRows: Array<{
    padId: number;
    padLabel: string;
    padKey: string;
    sampleName: string;
    isMuted: boolean;
    stepLength: SequencerStepLength;
    steps: boolean[];
    stepOctaves: number[];
  }>;
  songArrangementTiming: SongArrangementTiming;
  currentMainStep: number;
};
