import type {
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadRowMuted,
  PadSampleSettingsMap,
  PadStepLength,
  PadStepSequence,
  PadSampleIds,
  PadVolumes,
  SequencerPattern,
} from "../DrumpadController/DrumpadController.types";
import type { SequencerStepLength } from "../StepSequencer/StepSequencer.utilities";
import type { SampleMetadataOverrides } from "../../integrations/samples/sample.types";

export interface ProjectState {
  masterVolume: number;
  padVolumes: PadVolumes;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padLoopEnabled: PadLoopEnabled;
  padRowMuted: PadRowMuted;
  padSampleIds: PadSampleIds;
  padSampleSettings: PadSampleSettingsMap;
  padStepSequence: PadStepSequence;
  padStepLength: PadStepLength;
  sequencerPatterns: SequencerPattern[];
  activePatternId: string;
  sequencerBpm: number;
  sequencerClockStepLength: SequencerStepLength;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: ProjectState;
}

export interface ProjectArchiveSampleEntry {
  sampleId: string;
  name: string;
  relativePath?: string;
  filePath: string;
}

export interface ProjectArchiveManifest {
  format: "noodlr-project";
  version: 1;
  name: string;
  exportedAt: string;
  state: ProjectState;
  sampleMetadataOverrides: SampleMetadataOverrides;
  samples: ProjectArchiveSampleEntry[];
}
