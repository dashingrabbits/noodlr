export const overlayClassName =
  "fixed inset-0 z-[4000] bg-black/35 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out";
export const contentClassName =
  "fixed left-1/2 top-1/2 z-[4100] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-4 shadow-2xl";
export const titleClassName = "text-[#515a6a] text-base font-bold";
export const subtitleClassName = "text-xs text-[#595959] mt-1";
export const sectionClassName = "rounded-md border border-[#b8b5aa] bg-[#ecebe6] p-3";
export const sectionTitleClassName = "text-[11px] font-bold text-[#3b3f48] uppercase tracking-wide mb-2";
export const sectionAccordionTriggerClassName =
  "flex w-full items-center justify-between rounded-md border border-transparent px-1 py-1 text-left transition-colors hover:border-[#b8b5aa] hover:bg-[#f7f6f2] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#ff8c2b]";
export const sectionAccordionIconClassName = "text-[#555] transition-transform";
export const sectionAccordionContentClassName = "pt-2";
export const padSettingsGridClassName = "grid grid-cols-1 gap-2 sm:grid-cols-2";
export const padFieldLabelClassName = "text-[10px] font-bold text-[#474747] uppercase tracking-wide";
export const padTextInputClassName =
  "mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-xs px-2 py-1.5 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]";
export const padSelectClassName =
  "mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-xs px-2 py-1.5 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]";
export const padVolumeValueClassName = "text-[11px] text-[#2b2b2b] tabular-nums";
export const padVolumeSliderClassName =
  "mt-1 w-full h-1.5 bg-[#a9adaf] rounded-lg appearance-none cursor-pointer";
export const padLoopButtonBaseClassName =
  "mt-1 inline-flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs font-bold transition-colors";
export const padSampleRowClassName = "mt-1 flex items-center gap-2";
export const padSampleNameClassName =
  "min-w-0 flex-1 truncate rounded-md border border-[#a8aba5] bg-[#fbfaf6] px-2 py-1.5 text-xs text-[#2a2a2a]";
export const padSampleClearButtonClassName =
  "rounded-md border border-[#9d8774] bg-[#f3dcc2] px-2 py-1.5 text-xs font-bold text-[#3a2a19] transition-colors hover:bg-[#e7cbac] disabled:opacity-50 disabled:cursor-not-allowed";
export const envelopeGraphWrapClassName =
  "rounded-md border border-[#b8b5aa] bg-[#fbfaf6] p-2";
export const envelopeGraphClassName =
  "w-full rounded-md border border-[#b8b5aa] bg-[radial-gradient(circle_at_top,rgba(255,140,43,0.16),rgba(245,244,238,1))]";
export const envelopeHintClassName =
  "mt-2 text-[10px] text-[#616161]";
export const envelopeFaderListClassName = "mt-3 space-y-2";
export const envelopeFaderRowClassName = "grid grid-cols-[68px_1fr_64px] items-center gap-2";
export const envelopeFaderLabelClassName = "text-[11px] font-bold text-[#272727] uppercase";
export const envelopeFaderInputClassName =
  "w-full h-1.5 bg-[#a9adaf] rounded-lg appearance-none cursor-pointer";
export const envelopeFaderValueClassName = "text-[11px] text-[#505050] text-right tabular-nums";
export const knobGridClassName = "grid grid-cols-2 gap-2 sm:grid-cols-4";
export const knobCardClassName =
  "rounded-md border border-[#b8b5aa] bg-[#f1f0ea] px-2 py-2 text-center";
export const knobLabelClassName = "block text-[10px] font-bold text-[#3f3f3f] uppercase tracking-wide";
export const knobShellClassName =
  "relative mt-2 mx-auto h-16 w-16 rounded-full border-2 border-[#8f9290] bg-[#d8d9d3]";
export const knobDialClassName =
  "absolute inset-[9px] rounded-full border border-[#9ca0a3] bg-[#f6f5ef]";
export const knobIndicatorClassName =
  "absolute h-4 w-[3px] rounded-full bg-[#515a6a]";
export const knobValueClassName = "mt-2 text-[11px] text-[#505050] tabular-nums";
export const footerClassName = "mt-4 flex justify-end gap-2";
export const footerLeftClassName = "mr-auto flex items-center";
export const saveMetaButtonClassName =
  "px-4 py-2 rounded-md text-xs font-bold bg-[#515a6a] hover:bg-[#454d5b] text-[#f7f7f5] border border-[#3f4653] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const saveMetaMessageClassName = "text-[11px] text-[#4e5563]";
export const secondaryButtonClassName =
  "px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors";
export const primaryButtonClassName =
  "px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#161616] border border-[#d66d14] transition-colors";

export const getPadLoopToggleButtonClassName = (isEnabled: boolean): string => {
  if (isEnabled) {
    return `${padLoopButtonBaseClassName} border-[#cc6e20] bg-[#ff8c2b] text-[#161616]`;
  }

  return `${padLoopButtonBaseClassName} border-[#a8aba5] bg-[#d4d4ce] text-[#515a6a] hover:bg-[#c4c6bf]`;
};
