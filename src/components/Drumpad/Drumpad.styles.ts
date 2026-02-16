export const containerClassName =
  "relative bg-[#efeee8]/95 rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-[#b8b5aa] shadow-[0_5px_14px_rgba(20,20,20,0.06)]";
export const padActiveClassName = "brightness-150 scale-105 shadow-2xl";
export const dropHintClassName =
  "mt-2 text-center text-[10px] text-[#2d2d2d] bg-[#f2d9bb] border border-[#e0b07d] rounded-md py-1";
export const editSampleButtonClassName =
  "absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-md border border-[#8e928f] bg-[#d7d8d1] text-[#515a6a] transition-colors hover:bg-[#c8c9c2] disabled:cursor-not-allowed disabled:opacity-40";
export const padSummaryClassName =
  "hidden sm:flex mt-3 items-center justify-between gap-2 rounded-md border border-[#b8b5aa] bg-[#f6f5ef] px-3 py-2";
export const emptyPadIndicatorClassName =
  "absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#515a6a]";
export const emptyPadPlusBadgeClassName =
  "inline-flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#8e928f] bg-[#f6f5ef]/90 shadow-sm cursor-pointer";
export const padKeycapClassName =
  "peer absolute left-2 bottom-2 sm:left-3 sm:bottom-3 inline-flex min-w-6 sm:min-w-7 items-center justify-center rounded-[6px] border border-[#8e928f] bg-[#e3e3dc] px-1.5 py-[8px] text-[10px] sm:text-xs font-bold leading-none text-[#515a6a] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_2px_rgba(0,0,0,0.12)]";
export const padKeycapTooltipClassName =
  "pointer-events-none absolute left-2 bottom-11 sm:left-3 sm:bottom-12 z-20 w-44 rounded-md border border-[#b8b5aa] bg-[#f6f5ef] px-2 py-1 text-[10px] font-semibold text-[#515a6a] shadow-md opacity-0 invisible transition-opacity duration-150 peer-hover:opacity-100 peer-hover:visible peer-focus-visible:opacity-100 peer-focus-visible:visible";

export const getPadButtonClassName = (color: string): string => {
  return `relative w-full aspect-square rounded-lg sm:rounded-xl touch-none select-none ${color} hover:brightness-105 transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center text-[#515a6a] font-bold text-xs sm:text-lg shadow-md border border-[#9fa39c]`;
};
