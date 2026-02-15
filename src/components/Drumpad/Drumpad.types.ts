import type { DrumPadConfig } from "../DrumpadController/DrumpadController.types";

export interface DrumpadProps {
  pad: DrumPadConfig;
  volume: number;
  polyphony: number;
  name: string;
  assignedSampleName: string;
  onPadButtonMount: (padId: number, buttonElement: HTMLButtonElement | null) => void;
  onPadPress: (padId: number) => void;
  onPadSampleDrop: (padId: number, sampleId: string) => void;
  onOpenPadSampleAssignModal: (padId: number) => void;
  onOpenPadSampleEditor: (padId: number) => void;
}
