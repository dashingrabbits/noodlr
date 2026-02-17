import { type Dispatch,type SetStateAction } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type {
ProjectSampleReference,
ProjectState,
SavedProject,
} from "../../../ProjectManager/ProjectManager.types";

export type ProjectLoadAudit = {
  projectName: string;
  referencedSampleIds: string[];
  sampleReferences: ProjectSampleReference[];
  skipMissingSampleIds: string[];
};

export type UseProjectLoadHandlersInput = {
  applyProjectState: (
    candidateProjectState: Partial<ProjectState>,
    options?: { selectedProjectId?: string }
  ) => void;
  handleRestoreProjectSampleSource: (
    candidateProjectState: Partial<ProjectState>
  ) => Promise<SampleAsset[]>;
  importDemoKitArchive: () => Promise<boolean>;
  isImportingDemoKit: boolean;
  isLoadingSampleAssets: boolean;
  sampleAssetsById: Map<string, SampleAsset>;
  savedProjects: SavedProject[];
  setSelectedProjectId: Dispatch<SetStateAction<string>>;
};
