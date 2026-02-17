export const songModePanelContainerClassName =
  "rounded-2xl border border-[#b8b5aa] bg-[#efeee8]/95 p-4 shadow-[0_8px_20px_rgba(20,20,20,0.08)]";

export const addToSongButtonClassName =
  "px-3 py-1.5 rounded-md text-xs font-bold border border-[#778299] bg-[#8f9bb0] text-[#f7f7f5] hover:bg-[#7e8ba2] transition-colors";

export const exportSongButtonClassName =
  "px-3 py-1.5 rounded-md text-xs font-bold border border-[#4f617d] bg-[#5f7598] text-[#f7f7f5] hover:bg-[#526687] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const getSongPlayButtonClassName = (isPlaying: boolean): string =>
  `px-3 py-1.5 rounded-md text-xs font-bold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
    isPlaying
      ? "border-[#bf5950] bg-[#d96d64] text-white hover:bg-[#c75d54]"
      : "border-[#748b40] bg-[#95b257] text-[#f7f7f5] hover:bg-[#839f49]"
  }`;
