import type { SampleAsset, SampleMetadataOverride } from "../../integrations/samples/sample.types";

export interface SampleLibrarySidebarProps {
  rootDir: string;
  supportsDirectoryPicker: boolean;
  search: string;
  isLoading: boolean;
  error: string | null;
  totalSampleCount: number;
  filteredSampleCount: number;
  samples: SampleAsset[];
  onRootDirChange: (value: string) => void;
  onPickDirectory: () => void;
  onSearchChange: (value: string) => void;
  onRefreshSamples: () => void;
  onPreviewSample: (sampleId: string) => void;
  onSaveSampleMetadata: (sampleId: string, metadata: SampleMetadataOverride) => void;
  onResetSampleMetadata: (sampleId: string) => void;
}
