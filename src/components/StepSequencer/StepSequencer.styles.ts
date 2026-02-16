export const containerClassName =
  "relative z-10 bg-[#efeee8]/95 rounded-2xl p-4 border border-[#b8b5aa] shadow-[0_8px_20px_rgba(20,20,20,0.08)]";
export const transportButtonBaseClassName =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-bold border transition-colors";
export const rowContainerClassName = "rounded-lg border border-[#b8b5aa] bg-[#f7f6f2] px-2 py-2";
export const rowStepsScrollerClassName = "w-full";
export const rowGridClassName = "grid w-full gap-1";
export const stepCellClassName =
  "relative w-full aspect-square rounded-full sm:rounded-sm border transition-colors duration-100 cursor-pointer";

export const getTransportButtonClassName = (isPlaying: boolean): string => {
  if (isPlaying) {
    return `${transportButtonBaseClassName} bg-[#df5a4d] border-[#b44539] text-white hover:bg-[#cb4e42]`;
  }

  return `${transportButtonBaseClassName} bg-[#95b257] border-[#748b40] text-[#515a6a] hover:bg-[#839f49]`;
};

export const getRecordButtonClassName = (isRecording: boolean): string => {
  if (isRecording) {
    return `${transportButtonBaseClassName} bg-[#f97316] border-[#d65e10] text-white hover:bg-[#ea580c]`;
  }

  return `${transportButtonBaseClassName} bg-[#d4d4ce] border-[#a8aba5] text-[#515a6a] hover:bg-[#c6c6bf]`;
};

export const getMetronomeButtonClassName = (isMetronomeEnabled: boolean): string => {
  if (isMetronomeEnabled) {
    return `${transportButtonBaseClassName} bg-[#ff8c2b] border-[#cc6e20] text-white hover:bg-[#ff9b45]`;
  }

  return `${transportButtonBaseClassName} bg-[#d4d4ce] border-[#a8aba5] text-[#515a6a] hover:bg-[#c6c6bf]`;
};

export const addPatternButtonClassName =
  `${transportButtonBaseClassName} bg-[#515a6a] border-[#3f4653] text-[#f7f7f5] hover:bg-[#454d5b]`;
export const sequencerToggleButtonClassName =
  `${transportButtonBaseClassName} bg-[#d4d4ce] border-[#a8aba5] text-[#515a6a] hover:bg-[#c6c6bf]`;
export const duplicatePatternButtonClassName =
  `${transportButtonBaseClassName} bg-[#8f9bb0] border-[#778299] text-[#515a6a] hover:bg-[#7e8ba2]`;
export const deletePatternButtonClassName =
  `${transportButtonBaseClassName} bg-[#d96d64] border-[#bf5950] text-white hover:bg-[#c75d54]`;
export const exportButtonClassName =
  `${transportButtonBaseClassName} bg-[#b2b9c1] border-[#9098a1] text-[#515a6a] hover:bg-[#9fa8b2]`;
export const rowActionButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-[#a8aba5] bg-[#d4d4ce] text-[#515a6a] hover:bg-[#c4c6bf] px-2 py-1 text-[10px] font-bold transition-colors";
export const rowMuteButtonActiveClassName =
  "border-[#df5a4d] bg-[#df5a4d] text-white hover:bg-[#cb4e42]";

export const patternSelectClassName =
  "rounded-md bg-[#fbfaf6] text-[#1d1d1d] text-xs px-2 py-1 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]";

export const getStepCellClassName = (
  isEnabled: boolean,
  isCurrentStep: boolean,
  isPlaying: boolean
): string => {
  if (isEnabled && isCurrentStep && isPlaying) {
    return `${stepCellClassName} bg-[#ff8c2b] border-[#cc6e20] shadow-[0_0_0_2px_rgba(255,140,43,0.28)]`;
  }

  if (isEnabled) {
    return `${stepCellClassName} bg-[#ffa14f] border-[#d67e2d] hover:bg-[#ff9540]`;
  }

  if (isCurrentStep && isPlaying) {
    return `${stepCellClassName} bg-[#c8cbc4] border-[#8f938f]`;
  }

  return `${stepCellClassName} bg-[#d7d9d3] border-[#b0b4ad] hover:bg-[#c8cbc4]`;
};
