import type { ChangeEvent, Dispatch, MutableRefObject, SetStateAction } from "react";
import type { SavedProject } from "../../../ProjectManager/ProjectManager.types";
import type { SampleAsset, SampleMetadataOverride } from "../../../../integrations/samples/sample.types";
import type {
  SessionConnectionStatus,
  SessionJoinRequest,
} from "../../hooks/session-collaboration";
import type { SampleMetadataEditorState } from "../../../PadSampleEditorModal";
import type {
  DrumPadConfig,
  PadAssignedSamples,
  PadLoopEnabled,
  PadNames,
  PadPolyphony,
  PadSampleSettings,
  PadSampleSettingsMap,
  PadVolumes,
} from "../../DrumpadController.types";

export type DrumpadControllerOverlaysProps = {
  clearProjectLoadFeedback: () => void;
  countInBeatsRemaining: number | null;
  defaultPadSampleSettings: PadSampleSettings;
  defaultPadVolume: number;
  defaultSamplePolyphony: number;
  editingPad: DrumPadConfig | null;
  editingPadSampleBuffer: AudioBuffer | null;
  editingPadSampleMetadataEditorState: SampleMetadataEditorState | null;
  editingPadSampleId: string;
  effectiveSampleAssets: SampleAsset[];
  handleAssignSampleToSelectedPad: (sampleId: string) => void;
  handleClosePadSampleAssignModal: () => void;
  handleCloseSaveProjectModal: () => void;
  handleOpenSampleRootPromptKitImport: () => void;
  handleOpenSampleRootPromptProjectImport: () => void;
  handlePadLoopToggle: (padId: number) => void;
  handlePadNameChange: (padId: number, name: string) => void;
  handlePadPolyphonyChange: (padId: number, polyphony: number) => void;
  handlePadSampleClear: (padId: number) => void;
  handlePadSampleEditorOpenChange: (isOpen: boolean) => void;
  handlePadSampleSettingsChange: (padId: number, nextSettings: Partial<PadSampleSettings>) => void;
  handlePadVolumeChange: (padId: number, volume: number) => void;
  handlePreviewSample: (sampleId: string) => void;
  handleResetSampleMetadata: (sampleId: string) => void;
  handleResetPadSampleSettings: (padId: number) => void;
  handleSampleMetadataEditorOpenChange: (isOpen: boolean) => void;
  handleSampleRootPromptKitFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSampleRootPromptProjectFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSaveSampleMetadata: (sampleId: string, metadata: SampleMetadataOverride) => void;
  handleSavePadEditorSettingsToSavedKits: () => void;
  handleSubmitOverwriteProject: () => void;
  handleSubmitSampleRootDirPrompt: () => void;
  handleSubmitSaveProjectAsNew: () => void;
  handleUseDemoKit: () => void;
  isEditingPadSampleBufferLoading: boolean;
  isImportingDemoKit: boolean;
  isSampleRootDirPromptOpen: boolean;
  isSaveProjectModalOpen: boolean;
  isSelectingSampleDirectory: boolean;
  kitArchiveAccept: string;
  missingProjectSamples: string[];
  padAssignedSamples: PadAssignedSamples;
  padEditorSaveMessage: string;
  padLoopEnabled: PadLoopEnabled;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padSampleSettings: PadSampleSettingsMap;
  padVolumes: PadVolumes;
  projectArchiveAccept: string;
  projectLoadStatusMessage: string;
  projectNameDraft: string;
  projectNameMaxLength: number;
  sampleAssignPad: DrumPadConfig | null;
  sampleError: string | null;
  sampleMetadataEditorState: SampleMetadataEditorState | null;
  sampleMetadataEditorSampleName: string;
  sampleRootDir: string;
  sampleRootDirDraft: string;
  sampleRootPromptKitInputRef: MutableRefObject<HTMLInputElement | null>;
  sampleRootPromptProjectInputRef: MutableRefObject<HTMLInputElement | null>;
  isSampleMetadataEditorOpen: boolean;
  selectedProject: SavedProject | null;
  setProjectNameDraft: Dispatch<SetStateAction<string>>;
  setSampleError: Dispatch<SetStateAction<string | null>>;
  setSampleRootDirDraft: Dispatch<SetStateAction<string>>;
  sessionConnectionStatus: SessionConnectionStatus;
  sessionError: string | null;
  songModeStatusMessage: string;
  supportsDirectoryPicker: boolean;
  onClearSessionError: () => void;
  onClearSongModeStatusMessage: () => void;
  onJoinSessionFromPrompt: (input: SessionJoinRequest) => Promise<void>;
};
