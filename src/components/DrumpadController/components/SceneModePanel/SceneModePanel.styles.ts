export const sceneModePanelContainerClassName =
  "rounded-2xl border border-[#b8b5aa] bg-[#efeee8]/95 p-4 shadow-[0_8px_20px_rgba(20,20,20,0.08)]";

export const getSceneActionButtonClassName = (variant: "default" | "song" | "delete"): string => {
  if (variant === "song") {
    return "px-3 py-1.5 rounded-md text-xs font-bold border border-[#778299] bg-[#8f9bb0] text-[#f7f7f5] hover:bg-[#7e8ba2] transition-colors";
  }

  if (variant === "delete") {
    return "px-3 py-1.5 rounded-md text-xs font-bold border border-[#bf5950] bg-[#d96d64] text-white hover:bg-[#c75d54] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  }

  return "px-3 py-1.5 rounded-md text-xs font-bold border border-[#a8aba5] bg-[#d4d4ce] text-[#515a6a] hover:bg-[#c4c6bf] transition-colors";
};

export const getScenePlayStopButtonClassName = (isScenePlaying: boolean): string =>
  `inline-flex items-center justify-center px-2.5 py-1.5 border-y-0 border-r-0 border-l border-[#a8aba5] transition-colors ${
    isScenePlaying ? "bg-[#d96d64] text-white hover:bg-[#c75d54]" : "bg-[#95b257] text-[#f7f7f5] hover:bg-[#839f49]"
  }`;
