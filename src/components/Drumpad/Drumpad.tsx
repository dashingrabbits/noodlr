import { memo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { DrumpadProps } from "./Drumpad.types";
import { resolvePadDisplayName } from "./Drumpad.utilities";
import { SAMPLE_DRAG_DATA_MIME_TYPE } from "../SampleLibrarySidebar/SampleLibrarySidebar.utilities";
import {
  containerClassName,
  dropHintClassName,
  getPadButtonClassName,
  editSampleButtonClassName,
  padSummaryClassName,
} from "./Drumpad.styles";

const Drumpad = memo(({
  pad,
  volume,
  polyphony,
  name,
  assignedSampleName,
  onPadButtonMount,
  onPadPress,
  onPadSampleDrop,
  onOpenPadSampleEditor,
}: DrumpadProps) => {
  const [isDropTarget, setIsDropTarget] = useState(false);

  return (
    <div className={containerClassName}>
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenPadSampleEditor(pad.id)}
          className={editSampleButtonClassName}
          title="Edit pad settings, envelope, and FX"
          aria-label="Edit pad sample"
        >
          <SlidersHorizontal size={14} />
        </button>
        <button
          ref={(buttonElement) => onPadButtonMount(pad.id, buttonElement)}
          onPointerDown={(event) => {
            event.preventDefault();
            onPadPress(pad.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragEnter={() => setIsDropTarget(true)}
          onDragLeave={() => setIsDropTarget(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDropTarget(false);

            const sampleId =
              event.dataTransfer.getData(SAMPLE_DRAG_DATA_MIME_TYPE) ||
              event.dataTransfer.getData("text/plain");

            if (sampleId.trim()) {
              onPadSampleDrop(pad.id, sampleId.trim());
            }
          }}
          className={getPadButtonClassName(pad.color)}
        >
          <div className="text-base sm:text-2xl mb-0 sm:mb-1">{resolvePadDisplayName(pad.label, name)}</div>
          <div className="text-[10px] sm:text-sm opacity-80">{pad.key}</div>
          <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 sm:hidden text-[8px] font-semibold">
            <span className="truncate text-[#515a6a]/90">{assignedSampleName || "No sample"}</span>
            <span className="shrink-0 text-[#515a6a]/90">P{polyphony}</span>
          </div>
        </button>
      </div>
      {isDropTarget ? <div className={dropHintClassName}>Drop sample to assign</div> : null}

      <div className={padSummaryClassName}>
        <div className="min-w-0">
          <div className="text-[10px] text-[#666] font-bold">SAMPLE</div>
          <div className="truncate text-xs text-[#515a6a]">{assignedSampleName || "No sample assigned"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-[#666] font-bold">VOL/POLY</div>
          <div className="text-xs text-[#515a6a] font-bold">{volume}% / {polyphony}</div>
        </div>
      </div>
    </div>
  );
});

export default Drumpad;
