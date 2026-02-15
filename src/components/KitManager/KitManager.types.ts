import type {
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadSampleSettingsMap,
  PadSampleIds,
  PadVolumes,
} from "../DrumpadController/DrumpadController.types";
import type { SampleMetadataOverrides } from "../../integrations/samples/sample.types";

export interface DrumKitState {
  padVolumes: PadVolumes;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padLoopEnabled: PadLoopEnabled;
  padSampleIds: PadSampleIds;
  padSampleSettings: PadSampleSettingsMap;
}

export interface SavedDrumKit {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: DrumKitState;
}

export interface KitArchiveSampleEntry {
  sampleId: string;
  name: string;
  relativePath?: string;
  filePath: string;
}

export interface KitArchiveManifest {
  format: "noodlr-kit";
  version: 1;
  name: string;
  exportedAt: string;
  state: DrumKitState;
  sampleMetadataOverrides: SampleMetadataOverrides;
  samples: KitArchiveSampleEntry[];
}

export interface KitManagerProps {
  kits: SavedDrumKit[];
  onSaveKit: (kitName: string) => void;
  onLoadKit: (kitId: string) => void;
  onExportKit: () => Promise<void> | void;
  onImportKit: (file: File) => Promise<void> | void;
}
