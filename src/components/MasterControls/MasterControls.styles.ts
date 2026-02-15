import type { CSSProperties } from "react";

export const containerClassName =
  "relative z-50 overflow-visible bg-[#efeee8]/95 rounded-2xl p-4 sm:p-6 mb-8 border border-[#b8b5aa] shadow-[0_8px_20px_rgba(20,20,20,0.08)]";
export const primaryButtonBaseClassName =
  "flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-sm sm:text-base font-bold border transition-colors";
export const clearButtonClassName =
  "flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-[#515a6a] hover:bg-[#454d5b] text-[#f7f7f5] rounded-xl text-sm sm:text-base font-bold border border-[#3f4653] transition-colors";
export const saveButtonClassName =
  "flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] rounded-xl text-sm sm:text-base font-bold border border-[#d66d14] transition-colors";
export const projectSelectClassName =
  "h-11 min-w-40 rounded-xl bg-[#fbfaf6] text-[#1d1d1d] text-sm px-3 py-2 border border-[#aaa79d] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]";
export const masterSliderClassName =
  "slider w-24 sm:w-32 h-2 bg-[#a9adaf] rounded-lg appearance-none cursor-pointer";
export const volumeControlContainerClassName = "relative z-[2100]";
export const volumeToggleButtonClassName =
  "inline-flex items-center gap-2 rounded-xl border border-[#9ca0a3] bg-[#f7f6f2] px-3 py-2 text-sm font-bold text-[#515a6a] transition-colors hover:bg-[#ecebe5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]";
export const volumePopoverClassName =
  "absolute left-0 right-0 mt-2 z-[2200] w-auto sm:left-auto sm:right-0 sm:w-56 sm:max-w-[82vw] rounded-xl border border-[#a8aaa7] bg-[#f5f4ee] p-3 shadow-xl";

export const createMasterSliderBackgroundStyle = (value: number): CSSProperties => {
  return {
    background: `linear-gradient(to right, #ff8c2b 0%, #ff8c2b ${value}%, #9ca3af ${value}%, #9ca3af 100%)`,
  };
};

export const getPlayButtonClassName = (isPlaying: boolean): string => {
  const stateColorClassName = isPlaying
    ? "bg-[#df5a4d] hover:bg-[#cb4e42] text-white border-[#b44539]"
    : "bg-[#95b257] hover:bg-[#839f49] text-[#515a6a] border-[#748b40]";
  return `${primaryButtonBaseClassName} ${stateColorClassName}`;
};
