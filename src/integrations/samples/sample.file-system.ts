import type { SampleAsset } from "./sample.types";
import { normalizeSampleAsset } from "./sample.utilities";

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  ".wav",
  ".mp3",
  ".aiff",
  ".aif",
  ".flac",
  ".ogg",
  ".m4a",
]);

const DIRECTORY_HANDLE_DB_NAME = "noodlr.sampleFolderDb";
const DIRECTORY_HANDLE_STORE_NAME = "handles";
const DIRECTORY_HANDLE_KEY = "sample-folder";

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  entries?: () => AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
};

const openDirectoryHandleDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DIRECTORY_HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DIRECTORY_HANDLE_STORE_NAME)) {
        database.createObjectStore(DIRECTORY_HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open sample folder database."));
  });
};

const runDirectoryHandleStoreRequest = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void
): Promise<T> => {
  const database = await openDirectoryHandleDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DIRECTORY_HANDLE_STORE_NAME, mode);
    const store = transaction.objectStore(DIRECTORY_HANDLE_STORE_NAME);
    action(store, resolve, reject);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Sample folder database transaction failed."));
      database.close();
    };
  });
};

const getReadableRelativePath = (pathSegments: string[]): string => {
  return pathSegments.join("/");
};

const getSampleIdFromRelativePath = (relativePath: string): string => {
  return `local-folder:${relativePath}`;
};

const walkDirectoryForSamples = async (
  directoryHandle: FileSystemDirectoryHandle,
  pathSegments: string[],
  collectedSamples: SampleAsset[],
  objectUrls: string[]
): Promise<void> => {
  const permissionCapableDirectoryHandle = directoryHandle as PermissionCapableDirectoryHandle;
  const directoryEntriesIteratorFactory = permissionCapableDirectoryHandle.entries;
  if (!directoryEntriesIteratorFactory) {
    return;
  }

  for await (const [entryName, entryHandle] of directoryEntriesIteratorFactory.call(
    permissionCapableDirectoryHandle
  )) {
    const nextPathSegments = [...pathSegments, entryName];
    if (entryHandle.kind === "directory") {
      await walkDirectoryForSamples(entryHandle, nextPathSegments, collectedSamples, objectUrls);
      continue;
    }

    if (entryHandle.kind !== "file") {
      continue;
    }

    const extension = entryName.includes(".") ? `.${entryName.split(".").pop()?.toLowerCase()}` : "";
    if (!SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
      continue;
    }

    const file = await entryHandle.getFile();
    const relativePath = getReadableRelativePath(nextPathSegments);
    const objectUrl = window.URL.createObjectURL(file);
    const normalizedSample = normalizeSampleAsset({
      id: getSampleIdFromRelativePath(relativePath),
      name: file.name,
      previewUrl: objectUrl,
      relativePath,
    });

    if (!normalizedSample) {
      window.URL.revokeObjectURL(objectUrl);
      continue;
    }

    objectUrls.push(objectUrl);
    collectedSamples.push(normalizedSample);
  }
};

export interface DirectoryScanResult {
  rootDir: string;
  samples: SampleAsset[];
  objectUrls: string[];
}

export const isDirectoryPickerSupported = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
};

export const openDirectoryPicker = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!isDirectoryPickerSupported()) {
    return null;
  }

  try {
    return await (window as DirectoryPickerWindow).showDirectoryPicker?.({ mode: "read" })!;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
};

export const readPersistedDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  try {
    return await runDirectoryHandleStoreRequest<FileSystemDirectoryHandle | null>(
      "readonly",
      (store, resolve, reject) => {
        const request = store.get(DIRECTORY_HANDLE_KEY);
        request.onsuccess = () => {
          const result = request.result;
          if (result && typeof result === "object") {
            resolve(result as FileSystemDirectoryHandle);
            return;
          }

          resolve(null);
        };
        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read saved sample folder handle."));
        };
      }
    );
  } catch {
    return null;
  }
};

export const writePersistedDirectoryHandle = async (
  handle: FileSystemDirectoryHandle
): Promise<void> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  await runDirectoryHandleStoreRequest<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(handle, DIRECTORY_HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to save sample folder handle."));
    };
  });
};

export const clearPersistedDirectoryHandle = async (): Promise<void> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  await runDirectoryHandleStoreRequest<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(DIRECTORY_HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to clear sample folder handle."));
    };
  });
};

export const queryDirectoryReadPermission = async (
  handle: FileSystemDirectoryHandle
): Promise<boolean> => {
  try {
    const permissionCapableHandle = handle as PermissionCapableDirectoryHandle;
    if (typeof permissionCapableHandle.queryPermission !== "function") {
      return true;
    }

    const permission = await permissionCapableHandle.queryPermission({ mode: "read" });
    return permission === "granted";
  } catch {
    return false;
  }
};

export const requestDirectoryReadPermission = async (
  handle: FileSystemDirectoryHandle
): Promise<boolean> => {
  try {
    const permissionCapableHandle = handle as PermissionCapableDirectoryHandle;
    if (typeof permissionCapableHandle.requestPermission !== "function") {
      return true;
    }

    const permission = await permissionCapableHandle.requestPermission({ mode: "read" });
    return permission === "granted";
  } catch {
    return false;
  }
};

export const scanDirectoryHandleForSamples = async (
  directoryHandle: FileSystemDirectoryHandle
): Promise<DirectoryScanResult> => {
  const samples: SampleAsset[] = [];
  const objectUrls: string[] = [];
  await walkDirectoryForSamples(directoryHandle, [], samples, objectUrls);

  samples.sort((left, right) => {
    const byName = left.name.localeCompare(right.name);
    if (byName !== 0) {
      return byName;
    }

    return (left.relativePath || "").localeCompare(right.relativePath || "");
  });

  return {
    rootDir: directoryHandle.name.trim() || "Selected Sample Folder",
    samples,
    objectUrls,
  };
};
