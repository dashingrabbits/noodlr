import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type { SampleAsset,SampleMetadataOverrides } from "../../../../integrations/samples/sample.types";
import type {
ProjectState,
SavedProject
} from "../../../ProjectManager/ProjectManager.types";

export type UseProjectArchiveHandlersInput = {
  applyProjectState: (
    candidateProjectState: Partial<ProjectState>,
    options?: { selectedProjectId?: string }
  ) => void;
  buildProjectStateSnapshot: () => ProjectState;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  importedSampleObjectUrlsRef: MutableRefObject<Set<string>>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  sampleMetadataOverrides: SampleMetadataOverrides;
  selectedProject: SavedProject | null;
  setImportedSampleAssets: Dispatch<SetStateAction<SampleAsset[]>>;
  setSampleMetadataOverrides: Dispatch<SetStateAction<SampleMetadataOverrides>>;
};
