import JSZip from "jszip";
import { useCallback } from "react";
import type { SampleAsset,SampleMetadataOverrides } from "../../../../integrations/samples/sample.types";
import { writeSampleMetadataOverrides } from "../../../../integrations/samples/sample.utilities";
import {
createKitArchiveSampleFileName,
encodeAudioBufferToWav,
} from "../../../KitManager/KitManager.utilities";
import type {
ProjectArchiveManifest,
ProjectState
} from "../../../ProjectManager/ProjectManager.types";
import {
PROJECT_ARCHIVE_MANIFEST_FILE_NAME,
createProjectArchiveFileName,
createSavedProjectId,
isProjectArchiveManifest,
sanitizeProjectName,
} from "../../../ProjectManager/ProjectManager.utilities";
import { IMPORTED_PROJECT_SAMPLE_ID_PREFIX,PAD_GROUP_IDS } from "../../constants";
import type { PadGroupsState,PadSampleIds } from "../../DrumpadController.types";
import { createDefaultPadGroupState } from "../../helpers/pattern";
import { collectProjectReferencedSampleIds } from "../../helpers/project";

import type {
UseProjectArchiveHandlersInput,
} from "./DrumpadControllerProjectArchive.types";

export const useProjectArchiveHandlers = ({
  applyProjectState,
  buildProjectStateSnapshot,
  ensureSampleBuffer,
  importedSampleObjectUrlsRef,
  sampleAssetsById,
  sampleBufferCacheRef,
  sampleMetadataOverrides,
  selectedProject,
  setImportedSampleAssets,
  setSampleMetadataOverrides,
}: UseProjectArchiveHandlersInput) => {
  const handleExportProject = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const projectState = buildProjectStateSnapshot();
    const zip = new JSZip();
    const usedFileNames = new Set<string>();
    const sampleIdsInProject = collectProjectReferencedSampleIds(projectState);
    const exportedSamples: ProjectArchiveManifest["samples"] = [];

    for (const sampleId of sampleIdsInProject) {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        continue;
      }

      const sampleBuffer =
        sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
      if (!sampleBuffer) {
        continue;
      }

      const fileName = createKitArchiveSampleFileName(sample.name, usedFileNames);
      const filePath = `samples/${fileName}`;
      const wavBuffer = encodeAudioBufferToWav(sampleBuffer);
      zip.file(filePath, wavBuffer);
      exportedSamples.push({
        sampleId: sample.id,
        name: sample.name,
        relativePath: sample.relativePath,
        filePath,
      });
    }

    const metadataOverridesForProject = Object.fromEntries(
      exportedSamples.flatMap((sampleEntry) => {
        const override = sampleMetadataOverrides[sampleEntry.sampleId];
        return override ? ([[sampleEntry.sampleId, override]] as const) : [];
      })
    ) as SampleMetadataOverrides;

    const manifestName =
      sanitizeProjectName(selectedProject?.name ?? "") ||
      `Project ${nowIso.slice(0, 19).replace(/:/g, "-")}`;
    const manifest: ProjectArchiveManifest = {
      format: "noodlr-project",
      version: 1,
      name: manifestName,
      exportedAt: nowIso,
      state: projectState,
      sampleMetadataOverrides: metadataOverridesForProject,
      samples: exportedSamples,
    };

    zip.file(PROJECT_ARCHIVE_MANIFEST_FILE_NAME, JSON.stringify(manifest, null, 2));
    const archiveBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = window.URL.createObjectURL(archiveBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = createProjectArchiveFileName(manifest.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }, [
    buildProjectStateSnapshot,
    ensureSampleBuffer,
    sampleAssetsById,
    sampleBufferCacheRef,
    sampleMetadataOverrides,
    selectedProject,
  ]);

  const handleImportProject = useCallback(
    async (archiveFile: File) => {
      const zip = await JSZip.loadAsync(archiveFile);
      const manifestZipEntry = zip.file(PROJECT_ARCHIVE_MANIFEST_FILE_NAME);
      if (!manifestZipEntry) {
        throw new Error("Invalid project archive: missing project.json.");
      }

      const manifestPayload = JSON.parse(await manifestZipEntry.async("string")) as unknown;
      if (!isProjectArchiveManifest(manifestPayload)) {
        throw new Error("Invalid project archive: bad manifest schema.");
      }

      const manifest = manifestPayload as ProjectArchiveManifest;
      const importedProjectId = createSavedProjectId();
      const importedSampleIdMap = new Map<string, string>();
      const nextImportedAssets: SampleAsset[] = [];

      for (const sampleEntry of manifest.samples) {
        if (importedSampleIdMap.has(sampleEntry.sampleId)) {
          continue;
        }

        const sampleZipEntry = zip.file(sampleEntry.filePath);
        if (!sampleZipEntry) {
          throw new Error(
            `Invalid project archive: missing sample file ${sampleEntry.filePath}.`
          );
        }

        const sampleBlob = await sampleZipEntry.async("blob");
        const sampleObjectUrl = window.URL.createObjectURL(sampleBlob);
        importedSampleObjectUrlsRef.current.add(sampleObjectUrl);

        const importedSampleId = `${IMPORTED_PROJECT_SAMPLE_ID_PREFIX}:${importedProjectId}:${sampleEntry.sampleId}`;
        importedSampleIdMap.set(sampleEntry.sampleId, importedSampleId);
        nextImportedAssets.push({
          id: importedSampleId,
          name: sampleEntry.name,
          previewUrl: sampleObjectUrl,
          category: "uncategorized",
          tags: [],
          relativePath: sampleEntry.relativePath || `Imported/${sampleEntry.filePath}`,
        });
      }

      setImportedSampleAssets((previous) => {
        const existingById = new Map(previous.map((sample) => [sample.id, sample]));
        nextImportedAssets.forEach((sample) => {
          existingById.set(sample.id, sample);
        });
        return Array.from(existingById.values());
      });

      const remapPadSampleIds = (candidatePadSampleIds?: PadSampleIds): PadSampleIds => {
        return Object.fromEntries(
          Object.entries(candidatePadSampleIds ?? {}).map(([padIdRaw, oldSampleId]) => {
            const importedSampleId = importedSampleIdMap.get(String(oldSampleId));
            return [Number(padIdRaw), importedSampleId || ""];
          })
        ) as PadSampleIds;
      };

      const remappedPadSampleIds = remapPadSampleIds(manifest.state.padSampleIds);
      const remappedPadGroups = manifest.state.padGroups
        ? PAD_GROUP_IDS.reduce((groupsState, groupId) => {
            const sourceGroup = manifest.state.padGroups?.[groupId];
            if (!sourceGroup) {
              groupsState[groupId] = createDefaultPadGroupState();
              return groupsState;
            }

            groupsState[groupId] = {
              ...sourceGroup,
              padSampleIds: remapPadSampleIds(sourceGroup.padSampleIds),
            };
            return groupsState;
          }, {} as PadGroupsState)
        : undefined;

      const remappedMetadataOverrides = Object.fromEntries(
        Object.entries(manifest.sampleMetadataOverrides).flatMap(([oldSampleId, override]) => {
          const importedSampleId = importedSampleIdMap.get(oldSampleId);
          return importedSampleId ? ([[importedSampleId, override]] as const) : [];
        })
      ) as SampleMetadataOverrides;

      setSampleMetadataOverrides((previous) => {
        const nextOverrides = {
          ...previous,
          ...remappedMetadataOverrides,
        };
        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });

      const remappedProjectState = {
        ...manifest.state,
        padSampleIds: remappedPadSampleIds,
        padGroups: remappedPadGroups,
      } as ProjectState;
      applyProjectState(remappedProjectState, {
        selectedProjectId: "",
      });
    },
    [applyProjectState, importedSampleObjectUrlsRef, setImportedSampleAssets, setSampleMetadataOverrides]
  );

  return {
    handleExportProject,
    handleImportProject,
  };
};

