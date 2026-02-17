import JSZip from "jszip";
import { useCallback } from "react";
import type { SampleAsset,SampleMetadataOverrides } from "../../../../integrations/samples/sample.types";
import { writeSampleMetadataOverrides } from "../../../../integrations/samples/sample.utilities";
import type {
KitArchiveManifest
} from "../../../KitManager/KitManager.types";
import {
KIT_ARCHIVE_MANIFEST_FILE_NAME,
createKitArchiveFileName,
createKitArchiveSampleFileName,
createSavedKitId,
encodeAudioBufferToWav,
isKitArchiveManifest,
} from "../../../KitManager/KitManager.utilities";
import {
DEMO_KIT_ARCHIVE_FILE_NAME,
DEMO_KIT_ARCHIVE_URL,
DEMO_KIT_IMPORTED_ID_PREFIX,
IMPORTED_SAMPLE_ID_PREFIX,
} from "../../constants";
import type { PadSampleIds } from "../../DrumpadController.types";
import { markDemoKitAutoLoaded } from "../../helpers/project";

import type {
UseKitArchiveHandlersInput,
} from "./DrumpadControllerKitArchive.types";

export const useKitArchiveHandlers = ({
  applyDrumKitState,
  buildDrumKitStateSnapshot,
  ensureSampleBuffer,
  importedSampleObjectUrlsRef,
  sampleAssetsById,
  sampleBufferCacheRef,
  sampleMetadataOverrides,
  setImportedSampleAssets,
  setIsImportingDemoKit,
  setSampleError,
  setSampleMetadataOverrides,
}: UseKitArchiveHandlersInput) => {
  const handleExportKit = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const kitState = buildDrumKitStateSnapshot();
    const zip = new JSZip();
    const usedFileNames = new Set<string>();
    const sampleIdsInKit = Array.from(
      new Set(
        Object.values(kitState.padSampleIds)
          .map((sampleId) => sampleId.trim())
          .filter((sampleId) => Boolean(sampleId))
      )
    );

    const exportedSamples: KitArchiveManifest["samples"] = [];

    for (const sampleId of sampleIdsInKit) {
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

    const metadataOverridesForKit = Object.fromEntries(
      exportedSamples.flatMap((sampleEntry) => {
        const override = sampleMetadataOverrides[sampleEntry.sampleId];
        return override ? ([[sampleEntry.sampleId, override]] as const) : [];
      })
    ) as SampleMetadataOverrides;

    const manifest: KitArchiveManifest = {
      format: "noodlr-kit",
      version: 1,
      name: `Kit ${nowIso.slice(0, 19).replace(/:/g, "-")}`,
      exportedAt: nowIso,
      state: kitState,
      sampleMetadataOverrides: metadataOverridesForKit,
      samples: exportedSamples,
    };

    zip.file(KIT_ARCHIVE_MANIFEST_FILE_NAME, JSON.stringify(manifest, null, 2));
    const archiveBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = window.URL.createObjectURL(archiveBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = createKitArchiveFileName(manifest.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }, [
    buildDrumKitStateSnapshot,
    ensureSampleBuffer,
    sampleAssetsById,
    sampleBufferCacheRef,
    sampleMetadataOverrides,
  ]);

  const handleImportKit = useCallback(
    async (archiveFile: File, options?: { importedIdPrefix?: string }) => {
      const zip = await JSZip.loadAsync(archiveFile);
      const manifestZipEntry = zip.file(KIT_ARCHIVE_MANIFEST_FILE_NAME);
      if (!manifestZipEntry) {
        throw new Error("Invalid kit archive: missing kit.json.");
      }

      const manifestPayload = JSON.parse(await manifestZipEntry.async("string")) as unknown;
      if (!isKitArchiveManifest(manifestPayload)) {
        throw new Error("Invalid kit archive: bad manifest schema.");
      }

      const manifest = manifestPayload as KitArchiveManifest;
      const importedKitId = options?.importedIdPrefix ?? createSavedKitId();
      const importedSampleIdMap = new Map<string, string>();
      const nextImportedAssets: SampleAsset[] = [];

      for (const sampleEntry of manifest.samples) {
        if (importedSampleIdMap.has(sampleEntry.sampleId)) {
          continue;
        }

        const sampleZipEntry = zip.file(sampleEntry.filePath);
        if (!sampleZipEntry) {
          throw new Error(`Invalid kit archive: missing sample file ${sampleEntry.filePath}.`);
        }

        const sampleBlob = await sampleZipEntry.async("blob");
        const sampleObjectUrl = window.URL.createObjectURL(sampleBlob);
        importedSampleObjectUrlsRef.current.add(sampleObjectUrl);

        const importedSampleId = `${IMPORTED_SAMPLE_ID_PREFIX}:${importedKitId}:${sampleEntry.sampleId}`;
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

      applyDrumKitState({
        ...manifest.state,
        padSampleIds: remappedPadSampleIds,
      });
    },
    [applyDrumKitState, importedSampleObjectUrlsRef, setImportedSampleAssets, setSampleMetadataOverrides]
  );

  const importDemoKitArchive = useCallback(async (): Promise<boolean> => {
    setSampleError(null);
    setIsImportingDemoKit(true);

    try {
      const response = await fetch(DEMO_KIT_ARCHIVE_URL);
      if (!response.ok) {
        throw new Error("Demo kit is unavailable.");
      }

      const archiveBlob = await response.blob();
      const archiveFile = new File([archiveBlob], DEMO_KIT_ARCHIVE_FILE_NAME, {
        type: archiveBlob.type || "application/zip",
      });

      await handleImportKit(archiveFile, {
        importedIdPrefix: DEMO_KIT_IMPORTED_ID_PREFIX,
      });
      markDemoKitAutoLoaded();
      return true;
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "Unable to load demo kit.");
      return false;
    } finally {
      setIsImportingDemoKit(false);
    }
  }, [handleImportKit, setIsImportingDemoKit, setSampleError]);

  return {
    handleExportKit,
    handleImportKit,
    importDemoKitArchive,
  };
};

