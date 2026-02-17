export const kitPadGroupCardContainerClassName =
  "relative overflow-hidden rounded-2xl border border-[#b8b5aa] bg-[linear-gradient(165deg,rgba(247,246,241,0.97),rgba(234,232,224,0.92))] px-4 py-4 shadow-[0_14px_28px_rgba(28,28,28,0.09)] sm:px-5";

export const kitPadGroupCardGlowClassName =
  "pointer-events-none absolute -top-20 -right-10 h-48 w-48 rounded-full bg-[#ffffff]/35 blur-2xl";

export const getPadGroupButtonClassName = (isActiveGroup: boolean): string =>
  `px-4 py-2 rounded-md text-xs font-bold border transition-colors ${
    isActiveGroup
      ? "border-[#cc6e20] bg-[#ee8d3d] text-white"
      : "border-[#a8aba5] bg-[#d7d9d3] text-[#515a6a] hover:bg-[#c8cbc2]"
  }`;

export const getHeldTransposeClassName = (isNeutral: boolean): string =>
  `inline-flex items-center rounded-full border px-3 py-0.5 mt-2 text-[11px] font-semibold ${
    isNeutral
      ? "border-[#a8aba5] bg-[#d7d9d3] text-[#515a6a]"
      : "border-[#cc6e20] bg-[#ff8c2b] text-[#ffffff]"
  }`;
