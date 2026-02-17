import {
useCallback,
useEffect,
type ChangeEvent
} from "react";
import { fetchSampleAssets } from "../../../../integrations/samples/sample.client";
import {
clearPersistedDirectoryHandle,
openDirectoryPicker,
queryDirectoryReadPermission,
readPersistedDirectoryHandle,
requestDirectoryReadPermission,
scanDirectoryHandleForSamples,
writePersistedDirectoryHandle,
} from "../../../../integrations/samples/sample.file-system";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import type { ProjectState } from "../../../ProjectManager/ProjectManager.types";
import { writePersistedSampleSoundsDir } from "../../DrumpadController.utilities";
import {
hasDemoKitAutoLoaded,
normalizeProjectSampleSourceType,
} from "../../helpers/project";

import type {
LoadSampleAssetsResult,
UseDrumpadSampleSourceHandlersInput,
} from "./DrumpadControllerSampleSource.types";

export const useDrumpadSampleSourceHandlers = ({
  handleImportKit,
  handleImportProject,
  importDemoKitArchive,
  localSampleObjectUrlsRef,
  sampleBufferCacheRef,
  sampleBufferPendingRef,
  sampleDirectoryHandle,
  sampleError,
  sampleRootDir,
  sampleRootDirDraft,
  sampleRootPromptKitInputRef,
  sampleRootPromptProjectInputRef,
  setIsLoadingSampleAssets,
  setIsSampleRootDirPromptOpen,
  setIsSelectingSampleDirectory,
  setSampleAssets,
  setSampleDirectoryHandle,
  setSampleError,
  setSampleRootDir,
  setSampleRootDirDraft,
  setSampleSearch,
  supportsDirectoryPicker,
}: UseDrumpadSampleSourceHandlersInput) => {
  const clearLocalSampleObjectUrls = useCallback(() => {
    localSampleObjectUrlsRef.current.forEach((objectUrl) => {
      window.URL.revokeObjectURL(objectUrl);
    });
    localSampleObjectUrlsRef.current.clear();
  }, [localSampleObjectUrlsRef]);

  const handleLoadSampleAssets = useCallback(
    async (
      rootDirOverride?: string,
      directoryHandleOverride?: FileSystemDirectoryHandle | null
    ): Promise<LoadSampleAssetsResult> => {
      const resolvedDirectoryHandle =
        directoryHandleOverride === undefined ? sampleDirectoryHandle : directoryHandleOverride;
      const normalizedRootDir = (rootDirOverride ?? sampleRootDir).trim();

      if (!resolvedDirectoryHandle && !normalizedRootDir) {
        setSampleError("Set a sample folder path or import a project/kit to continue.");
        return { didLoad: false, loadedSamples: [] };
      }

      setIsLoadingSampleAssets(true);
      setSampleError(null);

      try {
        if (resolvedDirectoryHandle) {
          const hasPermission = await queryDirectoryReadPermission(resolvedDirectoryHandle);
          if (!hasPermission) {
            throw new Error(
              "Sample folder access was revoked. Choose the folder again to continue."
            );
          }

          const result = await scanDirectoryHandleForSamples(resolvedDirectoryHandle);
          clearLocalSampleObjectUrls();
          result.objectUrls.forEach((objectUrl) => {
            localSampleObjectUrlsRef.current.add(objectUrl);
          });
          setSampleDirectoryHandle(resolvedDirectoryHandle);
          setSampleRootDir(result.rootDir);
          setSampleRootDirDraft(result.rootDir);
          setSampleAssets(result.samples);
          writePersistedSampleSoundsDir(result.rootDir);
          sampleBufferCacheRef.current.clear();
          sampleBufferPendingRef.current.clear();
          return { didLoad: true, loadedSamples: result.samples };
        }

        const result = await fetchSampleAssets({
          rootDir: normalizedRootDir,
        });
        const resolvedRootDir = (result.rootDir || normalizedRootDir).trim();
        clearLocalSampleObjectUrls();
        setSampleDirectoryHandle(null);
        setSampleRootDir(resolvedRootDir);
        setSampleRootDirDraft(resolvedRootDir);
        setSampleAssets(result.samples);
        writePersistedSampleSoundsDir(resolvedRootDir);
        sampleBufferCacheRef.current.clear();
        sampleBufferPendingRef.current.clear();
        return { didLoad: true, loadedSamples: result.samples };
      } catch (error) {
        setSampleError(error instanceof Error ? error.message : "Unable to load samples.");
        return { didLoad: false, loadedSamples: [] };
      } finally {
        setIsLoadingSampleAssets(false);
      }
    },
    [
      clearLocalSampleObjectUrls,
      localSampleObjectUrlsRef,
      sampleBufferCacheRef,
      sampleBufferPendingRef,
      sampleDirectoryHandle,
      sampleRootDir,
      setIsLoadingSampleAssets,
      setSampleAssets,
      setSampleDirectoryHandle,
      setSampleError,
      setSampleRootDir,
      setSampleRootDirDraft,
    ]
  );

  const handleRestoreProjectSampleSource = useCallback(
    async (candidateProjectState: Partial<ProjectState>): Promise<SampleAsset[]> => {
      const sampleSourceType = normalizeProjectSampleSourceType(
        candidateProjectState.sampleSourceType
      );
      const projectRootDir =
        typeof candidateProjectState.sampleRootDir === "string"
          ? candidateProjectState.sampleRootDir.trim()
          : "";

      if ((sampleSourceType === "path" || (!sampleSourceType && projectRootDir)) && projectRootDir) {
        const { loadedSamples } = await handleLoadSampleAssets(projectRootDir, null);
        return loadedSamples;
      }

      if (sampleSourceType !== "directory-handle") {
        return [];
      }

      const persistedHandle = await readPersistedDirectoryHandle();
      if (!persistedHandle) {
        return [];
      }

      const hasPermission =
        (await queryDirectoryReadPermission(persistedHandle)) ||
        (await requestDirectoryReadPermission(persistedHandle));
      if (!hasPermission) {
        setSampleError("Sample folder permission was denied. Some project samples may be missing.");
        return [];
      }

      const { loadedSamples } = await handleLoadSampleAssets(undefined, persistedHandle);
      return loadedSamples;
    },
    [handleLoadSampleAssets, setSampleError]
  );

  const handleSampleRootDirChange = useCallback(
    (value: string) => {
      setSampleRootDir(value);
      setSampleRootDirDraft(value);
      setSampleDirectoryHandle(null);
      void clearPersistedDirectoryHandle().catch(() => {
        // Ignore storage errors; path mode can still function.
      });
      if (sampleError) {
        setSampleError(null);
      }
    },
    [sampleError, setSampleDirectoryHandle, setSampleError, setSampleRootDir, setSampleRootDirDraft]
  );

  const handleSampleSearchChange = useCallback(
    (value: string) => {
      setSampleSearch(value);
      if (sampleError) {
        setSampleError(null);
      }
    },
    [sampleError, setSampleError, setSampleSearch]
  );

  const handleSelectSampleDirectory = useCallback(() => {
    if (!supportsDirectoryPicker) {
      return;
    }

    setIsSelectingSampleDirectory(true);
    setSampleError(null);

    void (async () => {
      try {
        const selectedDirectoryHandle = await openDirectoryPicker();
        if (!selectedDirectoryHandle) {
          return;
        }

        const hasPermission = await requestDirectoryReadPermission(selectedDirectoryHandle);
        if (!hasPermission) {
          setSampleError("Sample folder permission was not granted.");
          return;
        }

        await writePersistedDirectoryHandle(selectedDirectoryHandle);
        const rootDirLabel = selectedDirectoryHandle.name.trim() || "Selected Sample Folder";
        setSampleDirectoryHandle(selectedDirectoryHandle);
        setSampleRootDir(rootDirLabel);
        setSampleRootDirDraft(rootDirLabel);
        writePersistedSampleSoundsDir(rootDirLabel);
        const { didLoad } = await handleLoadSampleAssets(undefined, selectedDirectoryHandle);
        if (didLoad) {
          setIsSampleRootDirPromptOpen(false);
        }
      } catch (error) {
        setSampleError(error instanceof Error ? error.message : "Unable to access selected folder.");
      } finally {
        setIsSelectingSampleDirectory(false);
      }
    })();
  }, [
    handleLoadSampleAssets,
    setIsSampleRootDirPromptOpen,
    setIsSelectingSampleDirectory,
    setSampleDirectoryHandle,
    setSampleError,
    setSampleRootDir,
    setSampleRootDirDraft,
    supportsDirectoryPicker,
  ]);

  const handleRefreshSampleAssets = useCallback(() => {
    void handleLoadSampleAssets();
  }, [handleLoadSampleAssets]);

  const handleSubmitSampleRootDirPrompt = useCallback(() => {
    if (supportsDirectoryPicker) {
      handleSelectSampleDirectory();
      return;
    }

    const normalizedRootDir = sampleRootDirDraft.trim();
    if (!normalizedRootDir) {
      setSampleError("Enter a sample folder path, or import a project/kit.");
      return;
    }

    setSampleRootDir(normalizedRootDir);
    void (async () => {
      const { didLoad } = await handleLoadSampleAssets(normalizedRootDir);
      if (didLoad) {
        setIsSampleRootDirPromptOpen(false);
      }
    })();
  }, [
    handleLoadSampleAssets,
    handleSelectSampleDirectory,
    sampleRootDirDraft,
    setIsSampleRootDirPromptOpen,
    setSampleError,
    setSampleRootDir,
    supportsDirectoryPicker,
  ]);

  const handleSampleRootPromptProjectFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const archiveFile = event.target.files?.[0];
      event.target.value = "";

      if (!archiveFile) {
        return;
      }

      setSampleError(null);
      void (async () => {
        try {
          await handleImportProject(archiveFile);
          setIsSampleRootDirPromptOpen(false);
        } catch (error) {
          setSampleError(error instanceof Error ? error.message : "Unable to import project.");
        }
      })();
    },
    [handleImportProject, setIsSampleRootDirPromptOpen, setSampleError]
  );

  const handleSampleRootPromptKitFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const archiveFile = event.target.files?.[0];
      event.target.value = "";

      if (!archiveFile) {
        return;
      }

      setSampleError(null);
      void (async () => {
        try {
          await handleImportKit(archiveFile);
          setIsSampleRootDirPromptOpen(false);
        } catch (error) {
          setSampleError(error instanceof Error ? error.message : "Unable to import kit.");
        }
      })();
    },
    [handleImportKit, setIsSampleRootDirPromptOpen, setSampleError]
  );

  const handleOpenSampleRootPromptProjectImport = useCallback(() => {
    sampleRootPromptProjectInputRef.current?.click();
  }, [sampleRootPromptProjectInputRef]);

  const handleOpenSampleRootPromptKitImport = useCallback(() => {
    sampleRootPromptKitInputRef.current?.click();
  }, [sampleRootPromptKitInputRef]);

  const handleUseDemoKit = useCallback(() => {
    void (async () => {
      const didImport = await importDemoKitArchive();
      if (didImport) {
        setIsSampleRootDirPromptOpen(false);
      }
    })();
  }, [importDemoKitArchive, setIsSampleRootDirPromptOpen]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSampleSource = async () => {
      const tryAutoLoadDemoKit = async (): Promise<boolean> => {
        if (hasDemoKitAutoLoaded()) {
          return false;
        }

        const didImportDemoKit = await importDemoKitArchive();
        if (cancelled) {
          return true;
        }

        if (didImportDemoKit) {
          setIsSampleRootDirPromptOpen(false);
          return true;
        }

        return false;
      };

      if (supportsDirectoryPicker) {
        const persistedDirectoryHandle = await readPersistedDirectoryHandle();
        if (cancelled) {
          return;
        }

        if (persistedDirectoryHandle) {
          const hasPermission = await queryDirectoryReadPermission(persistedDirectoryHandle);
          if (cancelled) {
            return;
          }

          if (hasPermission) {
            const rootDirLabel =
              persistedDirectoryHandle.name.trim() || sampleRootDir.trim() || "Selected Sample Folder";
            setSampleDirectoryHandle(persistedDirectoryHandle);
            setSampleRootDir(rootDirLabel);
            setSampleRootDirDraft(rootDirLabel);
            writePersistedSampleSoundsDir(rootDirLabel);
            const { didLoad } = await handleLoadSampleAssets(undefined, persistedDirectoryHandle);
            if (!cancelled && !didLoad) {
              setIsSampleRootDirPromptOpen(true);
            }
            return;
          }

          await clearPersistedDirectoryHandle().catch(() => {
            // Ignore storage errors; user can re-select a folder.
          });
        }

        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
        return;
      }

      const normalizedRootDir = sampleRootDir.trim();
      if (!normalizedRootDir) {
        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
        return;
      }

      const { didLoad } = await handleLoadSampleAssets(normalizedRootDir, null);
      if (!didLoad) {
        const didAutoLoadDemoKit = await tryAutoLoadDemoKit();
        if (cancelled || didAutoLoadDemoKit) {
          return;
        }

        setIsSampleRootDirPromptOpen(true);
      }
    };

    void bootstrapSampleSource();

    return () => {
      cancelled = true;
    };
    // Intentional one-time initial bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSampleRootDirDraft(sampleRootDir);
  }, [sampleRootDir, setSampleRootDirDraft]);

  return {
    clearLocalSampleObjectUrls,
    handleLoadSampleAssets,
    handleOpenSampleRootPromptKitImport,
    handleOpenSampleRootPromptProjectImport,
    handleRefreshSampleAssets,
    handleRestoreProjectSampleSource,
    handleSampleRootDirChange,
    handleSampleRootPromptKitFileChange,
    handleSampleRootPromptProjectFileChange,
    handleSampleSearchChange,
    handleSelectSampleDirectory,
    handleSubmitSampleRootDirPrompt,
    handleUseDemoKit,
  };
};

