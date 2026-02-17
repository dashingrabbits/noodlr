import { type Dispatch,type SetStateAction } from "react";
import type { ProjectState,SavedProject } from "../../../ProjectManager/ProjectManager.types";

export type UseProjectActionHandlersInput = {
  buildProjectStateSnapshot: () => ProjectState;
  selectedProject: SavedProject | null;
  setSavedProjects: Dispatch<SetStateAction<SavedProject[]>>;
  setSelectedProjectId: Dispatch<SetStateAction<string>>;
};
