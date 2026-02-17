import { useCallback,useState } from "react";
import type { SavedProject } from "../../../ProjectManager/ProjectManager.types";
import {
createSavedProjectId,
sanitizeProjectName,
writeSavedProjectsToSession,
} from "../../../ProjectManager/ProjectManager.utilities";

import type {
UseProjectActionHandlersInput,
} from "./DrumpadControllerProjectActions.types";

export const useProjectActionHandlers = ({
  buildProjectStateSnapshot,
  selectedProject,
  setSavedProjects,
  setSelectedProjectId,
}: UseProjectActionHandlersInput) => {
  const [isSaveProjectModalOpen, setIsSaveProjectModalOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");

  const handleSaveProjectAsNew = useCallback(
    (projectName: string) => {
      const normalizedProjectName = sanitizeProjectName(projectName);
      if (!normalizedProjectName) {
        return;
      }

      const nowIso = new Date().toISOString();
      const nextProject: SavedProject = {
        id: createSavedProjectId(),
        name: normalizedProjectName,
        createdAt: nowIso,
        updatedAt: nowIso,
        state: buildProjectStateSnapshot(),
      };

      setSavedProjects((previous) => {
        const nextProjects = [nextProject, ...previous];
        writeSavedProjectsToSession(nextProjects);
        return nextProjects;
      });
      setSelectedProjectId(nextProject.id);
    },
    [buildProjectStateSnapshot, setSavedProjects, setSelectedProjectId]
  );

  const handleOverwriteProject = useCallback(
    (projectId: string, projectName: string) => {
      const normalizedProjectName = sanitizeProjectName(projectName);
      if (!projectId || !normalizedProjectName) {
        return;
      }

      const nowIso = new Date().toISOString();
      setSavedProjects((previous) => {
        const existingProject = previous.find((candidate) => candidate.id === projectId);
        if (!existingProject) {
          return previous;
        }

        const overwrittenProject: SavedProject = {
          ...existingProject,
          name: normalizedProjectName,
          updatedAt: nowIso,
          state: buildProjectStateSnapshot(),
        };
        const nextProjects = [
          overwrittenProject,
          ...previous.filter((candidate) => candidate.id !== projectId),
        ];

        writeSavedProjectsToSession(nextProjects);
        return nextProjects;
      });
      setSelectedProjectId(projectId);
    },
    [buildProjectStateSnapshot, setSavedProjects, setSelectedProjectId]
  );

  const handleOpenSaveProjectModal = useCallback(() => {
    setProjectNameDraft(selectedProject?.name ?? "");
    setIsSaveProjectModalOpen(true);
  }, [selectedProject]);

  const handleCloseSaveProjectModal = useCallback(() => {
    setIsSaveProjectModalOpen(false);
    setProjectNameDraft("");
  }, []);

  const handleSubmitSaveProjectAsNew = useCallback(() => {
    const projectName = sanitizeProjectName(projectNameDraft);
    if (!projectName) {
      return;
    }

    handleSaveProjectAsNew(projectName);
    handleCloseSaveProjectModal();
  }, [handleCloseSaveProjectModal, handleSaveProjectAsNew, projectNameDraft]);

  const handleSubmitOverwriteProject = useCallback(() => {
    if (!selectedProject) {
      return;
    }

    const projectName = sanitizeProjectName(projectNameDraft || selectedProject.name);
    if (!projectName) {
      return;
    }

    handleOverwriteProject(selectedProject.id, projectName);
    handleCloseSaveProjectModal();
  }, [
    handleCloseSaveProjectModal,
    handleOverwriteProject,
    projectNameDraft,
    selectedProject,
  ]);

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      if (!projectId) {
        return;
      }

      setSavedProjects((previous) => {
        const nextProjects = previous.filter((project) => project.id !== projectId);
        if (nextProjects.length === previous.length) {
          return previous;
        }

        writeSavedProjectsToSession(nextProjects);
        return nextProjects;
      });
      setSelectedProjectId((previousSelectedProjectId) =>
        previousSelectedProjectId === projectId ? "" : previousSelectedProjectId
      );
    },
    [setSavedProjects, setSelectedProjectId]
  );

  return {
    handleCloseSaveProjectModal,
    handleDeleteProject,
    handleOpenSaveProjectModal,
    handleSubmitOverwriteProject,
    handleSubmitSaveProjectAsNew,
    isSaveProjectModalOpen,
    projectNameDraft,
    setProjectNameDraft,
  };
};

