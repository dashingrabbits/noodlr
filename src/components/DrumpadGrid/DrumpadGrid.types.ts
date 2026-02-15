import type {
  PadAssignedSamples,
  DrumPadConfig,
  PadNames,
  PadPolyphony,
  PadVolumes,
} from "../DrumpadController/DrumpadController.types";

export interface DrumpadGridProps {
  pads: DrumPadConfig[];
  padVolumes: PadVolumes;
  padNames: PadNames;
  padPolyphony: PadPolyphony;
  padAssignedSamples: PadAssignedSamples;
  defaultPadVolume: number;
  onPadButtonMount: (padId: number, buttonElement: HTMLButtonElement | null) => void;
  onPadPress: (padId: number) => void;
  onPadSampleDrop: (padId: number, sampleId: string) => void;
  onOpenPadSampleEditor: (padId: number) => void;
}
