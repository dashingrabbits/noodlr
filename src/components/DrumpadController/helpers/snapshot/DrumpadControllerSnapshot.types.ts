import type { PadSampleSettings } from "../../DrumpadController.types";
import type {
  PadGroupId,
  PadGroupsState,
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadRowMuted,
  PadSampleIds,
  PadSampleSettingsMap,
  PadStepLength,
  PadStepOctaves,
  PadStepSequence,
  PadVolumes,
  SceneDefinition,
  SequencerPattern,
  SequencerPanelMode,
  SongArrangementEntry,
} from "../../DrumpadController.types";
import type { ProjectState } from "../../../ProjectManager/ProjectManager.types";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";

export type NormalizePadSampleSettingsFn = (
  candidate?: Partial<PadSampleSettings>
) => PadSampleSettings;

export type DrumKitSnapshotInput = {
  normalizePadSampleSettings: NormalizePadSampleSettingsFn;
  padLoopEnabled: PadLoopEnabled;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padSampleIds: PadSampleIds;
  padSampleSettings: PadSampleSettingsMap;
  padVolumes: PadVolumes;
};

export type PadGroupSnapshotInput = {
  activePatternId: string;
  normalizePadSampleSettings: NormalizePadSampleSettingsFn;
  padLoopEnabled: PadLoopEnabled;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padRowMuted: PadRowMuted;
  padSampleIds: PadSampleIds;
  padSampleSettings: PadSampleSettingsMap;
  padStepLength: PadStepLength;
  padStepOctaves: PadStepOctaves;
  padStepSequence: PadStepSequence;
  padVolumes: PadVolumes;
  sequencerPatterns: SequencerPattern[];
};

export type ProjectSnapshotInput = {
  activePadGroupId: PadGroupId;
  activeSceneId: string;
  isMetronomeEnabled: boolean;
  livePadGroupsState: PadGroupsState;
  masterVolume: number;
  normalizePadSampleSettings: NormalizePadSampleSettingsFn;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleDirectoryHandle: FileSystemDirectoryHandle | null;
  sampleRootDir: string;
  sceneDefinitions: SceneDefinition[];
  sequencerBpm: number;
  sequencerClockStepLength: ProjectState["sequencerClockStepLength"];
  sequencerPanelMode: SequencerPanelMode;
  songArrangement: SongArrangementEntry[];
};
