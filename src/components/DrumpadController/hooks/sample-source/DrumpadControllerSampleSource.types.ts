import {
type Dispatch,
type MutableRefObject,
type SetStateAction
} from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";

export type LoadSampleAssetsResult = {
  didLoad: boolean;
  loadedSamples: SampleAsset[];
};

export type UseDrumpadSampleSourceHandlersInput = {
  handleImportKit: (archiveFile: File) => Promise<void>;
  handleImportProject: (archiveFile: File) => Promise<void>;
  importDemoKitArchive: () => Promise<boolean>;
  localSampleObjectUrlsRef: MutableRefObject<Set<string>>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  sampleBufferPendingRef: MutableRefObject<Map<string, Promise<AudioBuffer | null>>>;
  sampleDirectoryHandle: FileSystemDirectoryHandle | null;
  sampleError: string | null;
  sampleRootDir: string;
  sampleRootDirDraft: string;
  sampleRootPromptKitInputRef: MutableRefObject<HTMLInputElement | null>;
  sampleRootPromptProjectInputRef: MutableRefObject<HTMLInputElement | null>;
  setIsLoadingSampleAssets: Dispatch<SetStateAction<boolean>>;
  setIsSampleRootDirPromptOpen: Dispatch<SetStateAction<boolean>>;
  setIsSelectingSampleDirectory: Dispatch<SetStateAction<boolean>>;
  setSampleAssets: Dispatch<SetStateAction<SampleAsset[]>>;
  setSampleDirectoryHandle: Dispatch<SetStateAction<FileSystemDirectoryHandle | null>>;
  setSampleError: Dispatch<SetStateAction<string | null>>;
  setSampleRootDir: Dispatch<SetStateAction<string>>;
  setSampleRootDirDraft: Dispatch<SetStateAction<string>>;
  setSampleSearch: Dispatch<SetStateAction<string>>;
  supportsDirectoryPicker: boolean;
};
