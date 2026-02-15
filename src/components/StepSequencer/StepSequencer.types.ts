import type { SequencerStepLength } from "./StepSequencer.utilities";

export interface StepSequencerRow {
  padId: number;
  padLabel: string;
  padKey: string;
  sampleName: string;
  isMuted: boolean;
  stepLength: SequencerStepLength;
  steps: boolean[];
}

export interface StepSequencerPatternOption {
  id: string;
  name: string;
}

export interface StepSequencerProps {
  patterns: StepSequencerPatternOption[];
  activePatternId: string;
  rows: StepSequencerRow[];
  currentTick: number;
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
  clockStepLength: SequencerStepLength;
  engineStepLength: SequencerStepLength;
  onTogglePlayback: () => void;
  onToggleRecording: () => void;
  onAddPattern: () => void;
  onDuplicatePattern: () => void;
  onDeletePattern: () => void;
  onSelectPattern: (patternId: string) => void;
  onExportPattern: () => Promise<void> | void;
  onExportRow: (padId: number) => Promise<void> | void;
  onToggleRowMute: (padId: number) => void;
  onStepToggle: (padId: number, stepIndex: number) => void;
  onStepSet: (padId: number, stepIndex: number, isEnabled: boolean) => void;
  onRowStepLengthChange: (padId: number, stepLength: SequencerStepLength) => void;
  onBpmChange: (bpm: number) => void;
  onClockStepLengthChange: (stepLength: SequencerStepLength) => void;
}
