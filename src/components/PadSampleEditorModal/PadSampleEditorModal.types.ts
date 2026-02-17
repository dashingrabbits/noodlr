import type {
  SampleCategory,
  SampleMetadataOverride,
} from "../../integrations/samples/sample.types";
import type { PadSampleSettings } from "../DrumpadController/DrumpadController.types";

export interface SampleMetadataEditorState {
  sampleId: string;
  name: string;
  category: SampleCategory;
  tags: string[];
}

export interface PadSampleEditorModalProps {
  isOpen: boolean;
  editorMode?: "pad" | "sample";
  padName: string;
  sampleName: string;
  sampleBuffer: AudioBuffer | null;
  isSampleBufferLoading?: boolean;
  padVolume: number;
  padPolyphony: number;
  isLoopEnabled: boolean;
  settings: PadSampleSettings;
  saveToKitsDisabled?: boolean;
  saveToKitsMessage?: string;
  sampleMetadataEditorState?: SampleMetadataEditorState | null;
  onSaveSampleMetadata?: (sampleId: string, metadata: SampleMetadataOverride) => void;
  onResetSampleMetadata?: (sampleId: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onPadNameChange: (name: string) => void;
  onPadVolumeChange: (volume: number) => void;
  onPadPolyphonyChange: (polyphony: number) => void;
  onPadLoopToggle: () => void;
  onPadSampleClear: () => void;
  onChange: (nextSettings: Partial<PadSampleSettings>) => void;
  onReset: () => void;
  onSaveToKits: () => void;
}

export interface KnobFieldProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}
