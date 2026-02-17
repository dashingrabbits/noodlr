export const panelModeTabsContainerClassName =
  "rounded-2xl border border-[#b8b5aa] bg-[#efeee8]/95 p-3 shadow-[0_8px_20px_rgba(20,20,20,0.08)]";

export const panelModeTabsGridClassName =
  "grid h-12 w-full grid-cols-3 overflow-hidden rounded-lg border border-[#a8aba5] bg-[#d7d9d3]";

export const getPanelModeTabButtonClassName = (isActive: boolean, isLast: boolean): string =>
  `h-full w-full px-3 text-sm font-extrabold tracking-wide border-y-0 border-l-0 ${
    isLast ? "border-r-0" : "border-r border-[#a8aba5]"
  } transition-colors ${
    isActive ? "bg-[#ee8d3d] text-white" : "bg-[#ecebe6] text-[#515a6a] hover:bg-[#dfe2db]"
  }`;
