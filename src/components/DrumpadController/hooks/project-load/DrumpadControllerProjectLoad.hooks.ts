import { useCallback,useEffect,useState } from "react";
import type {
ProjectSampleReference,
ProjectState
} from "../../../ProjectManager/ProjectManager.types";
import { PAD_GROUP_IDS } from "../../constants";
import type { PadGroupsState,PadSampleIds } from "../../DrumpadController.types";
import { createDefaultPadGroupState } from "../../helpers/pattern";
import {
collectProjectReferencedSampleIds,
isDemoKitImportedSampleId,
normalizeProjectSampleReferences,
} from "../../helpers/project";

import type {
ProjectLoadAudit,
UseProjectLoadHandlersInput,
} from "./DrumpadControllerProjectLoad.types";

export const useProjectLoadHandlers = ({
  applyProjectState,
  handleRestoreProjectSampleSource,
  importDemoKitArchive,
  isImportingDemoKit,
  isLoadingSampleAssets,
  sampleAssetsById,
  savedProjects,
  setSelectedProjectId,
}: UseProjectLoadHandlersInput) => {
  const [projectLoadStatusMessage, setProjectLoadStatusMessage] = useState("");
  const [missingProjectSamples, setMissingProjectSamples] = useState<string[]>([]);
  const [projectLoadAudit, setProjectLoadAudit] = useState<ProjectLoadAudit | null>(null);

  const clearProjectLoadFeedback = useCallback(() => {
    setProjectLoadStatusMessage("");
    setMissingProjectSamples([]);
    setProjectLoadAudit(null);
  }, []);

  const handleLoadProject = useCallback(
    (projectId: string) => {
      const project = savedProjects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return;
      }

      void (async () => {
        const projectState = project.state as Partial<ProjectState>;
        const projectSampleReferencesFromState = normalizeProjectSampleReferences(
          projectState.sampleReferences
        );
        const sampleReferenceById = new Map(
          projectSampleReferencesFromState.map((sampleReference) => [
            sampleReference.sampleId,
            sampleReference,
          ])
        );
        const restoredSamples = await handleRestoreProjectSampleSource(projectState);
        const availableSamplesById = new Map(sampleAssetsById);
        restoredSamples.forEach((sample) => {
          availableSamplesById.set(sample.id, sample);
        });

        const sampleIdByRelativePath = new Map<string, string>();
        availableSamplesById.forEach((sample) => {
          const relativePathKey = sample.relativePath?.trim().toLowerCase();
          if (!relativePathKey || sampleIdByRelativePath.has(relativePathKey)) {
            return;
          }

          sampleIdByRelativePath.set(relativePathKey, sample.id);
        });

        const sampleIdRemap = new Map<string, string>();
        projectSampleReferencesFromState.forEach((sampleReference) => {
          if (availableSamplesById.has(sampleReference.sampleId)) {
            return;
          }

          const relativePathKey = sampleReference.relativePath?.trim().toLowerCase();
          if (!relativePathKey) {
            return;
          }

          const matchedSampleId = sampleIdByRelativePath.get(relativePathKey);
          if (!matchedSampleId) {
            return;
          }

          sampleIdRemap.set(sampleReference.sampleId, matchedSampleId);
        });

        const remapPadSampleIds = (
          candidatePadSampleIds?: PadSampleIds
        ): PadSampleIds | undefined => {
          if (!candidatePadSampleIds) {
            return undefined;
          }

          return Object.fromEntries(
            Object.entries(candidatePadSampleIds).map(([padIdRaw, sampleId]) => [
              Number(padIdRaw),
              sampleIdRemap.get(sampleId) ?? sampleId,
            ])
          ) as PadSampleIds;
        };

        const remappedProjectState: Partial<ProjectState> = {
          ...projectState,
          padSampleIds: remapPadSampleIds(projectState.padSampleIds),
          padGroups: projectState.padGroups
            ? PAD_GROUP_IDS.reduce((groupsState, groupId) => {
                const sourceGroup = projectState.padGroups?.[groupId];
                if (!sourceGroup) {
                  groupsState[groupId] = createDefaultPadGroupState();
                  return groupsState;
                }

                groupsState[groupId] = {
                  ...sourceGroup,
                  padSampleIds: remapPadSampleIds(sourceGroup.padSampleIds) ?? {},
                };
                return groupsState;
              }, {} as PadGroupsState)
            : undefined,
        };

        const projectSampleIds = collectProjectReferencedSampleIds(remappedProjectState);
        const projectSampleReferences = projectSampleIds.map(
          (sampleId): ProjectSampleReference => {
            const sampleReference = sampleReferenceById.get(sampleId);
            if (sampleReference) {
              return sampleReference;
            }

            const sampleAsset = availableSamplesById.get(sampleId);
            return {
              sampleId,
              name: sampleAsset?.name || sampleId,
              relativePath: sampleAsset?.relativePath,
            };
          }
        );

        const hasMissingDemoKitSamples = projectSampleIds.some(
          (sampleId) => isDemoKitImportedSampleId(sampleId) && !availableSamplesById.has(sampleId)
        );
        const skipMissingSampleIds: string[] = [];

        if (hasMissingDemoKitSamples) {
          const didImportDemoKit = await importDemoKitArchive();
          if (didImportDemoKit) {
            projectSampleIds
              .filter((sampleId) => isDemoKitImportedSampleId(sampleId))
              .forEach((sampleId) => skipMissingSampleIds.push(sampleId));
          }
        }

        applyProjectState(remappedProjectState, {
          selectedProjectId: project.id,
        });

        setProjectLoadStatusMessage("");
        setMissingProjectSamples([]);
        setProjectLoadAudit({
          projectName: project.name,
          referencedSampleIds: projectSampleIds,
          sampleReferences: projectSampleReferences,
          skipMissingSampleIds,
        });
      })();
    },
    [
      applyProjectState,
      handleRestoreProjectSampleSource,
      importDemoKitArchive,
      sampleAssetsById,
      savedProjects,
    ]
  );

  useEffect(() => {
    if (!projectLoadAudit) {
      return;
    }

    if (isLoadingSampleAssets || isImportingDemoKit) {
      return;
    }

    const skippedSampleIds = new Set(projectLoadAudit.skipMissingSampleIds);
    const sampleReferenceById = new Map(
      projectLoadAudit.sampleReferences.map((sampleReference) => [
        sampleReference.sampleId,
        sampleReference,
      ])
    );

    const missingSampleLabels = projectLoadAudit.referencedSampleIds
      .filter((sampleId) => !skippedSampleIds.has(sampleId))
      .filter((sampleId) => !sampleAssetsById.has(sampleId))
      .map((sampleId) => {
        const sampleReference = sampleReferenceById.get(sampleId);
        if (!sampleReference) {
          return sampleId;
        }

        return sampleReference.relativePath
          ? `${sampleReference.name} (${sampleReference.relativePath})`
          : `${sampleReference.name} (${sampleReference.sampleId})`;
      });

    if (missingSampleLabels.length > 0) {
      setProjectLoadStatusMessage(
        `Unable to find ${missingSampleLabels.length} sample${
          missingSampleLabels.length === 1 ? "" : "s"
        } for "${projectLoadAudit.projectName}".`
      );
      setMissingProjectSamples(missingSampleLabels);
    } else {
      setProjectLoadStatusMessage("");
      setMissingProjectSamples([]);
    }

    setProjectLoadAudit(null);
  }, [isImportingDemoKit, isLoadingSampleAssets, projectLoadAudit, sampleAssetsById]);

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      if (!projectId) {
        return;
      }

      handleLoadProject(projectId);
    },
    [handleLoadProject, setSelectedProjectId]
  );

  return {
    clearProjectLoadFeedback,
    handleProjectSelect,
    missingProjectSamples,
    projectLoadStatusMessage,
  };
};

