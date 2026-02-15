import type { PadSampleSettings } from "../DrumpadController/DrumpadController.types";

export interface PadSampleEditorModalProps {
  isOpen: boolean;
  padName: string;
  sampleName: string;
  padVolume: number;
  padPolyphony: number;
  isLoopEnabled: boolean;
  settings: PadSampleSettings;
  saveToKitsDisabled?: boolean;
  saveToKitsMessage?: string;
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
