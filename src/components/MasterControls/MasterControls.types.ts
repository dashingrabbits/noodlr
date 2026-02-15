import type { SequencerStepLength } from "../StepSequencer/StepSequencer.utilities";

export interface ProjectOption {
  id: string;
  name: string;
}

export interface MasterControlsProps {
  isPlaying: boolean;
  masterVolume: number;
  bpm: number;
  baseStepLength: SequencerStepLength;
  currentStep: number;
  projectOptions: ProjectOption[];
  selectedProjectId: string;
  onTogglePlayback: () => void;
  onClearSequence: () => void;
  onOpenSaveProjectModal: () => void;
  onProjectSelect: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: () => Promise<void> | void;
  onImportProject: (file: File) => Promise<void> | void;
  onMasterVolumeChange: (volume: number) => void;
}
