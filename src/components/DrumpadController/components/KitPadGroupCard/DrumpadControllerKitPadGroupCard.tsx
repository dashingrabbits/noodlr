import KitManager from "../../../KitManager";
import { PAD_GROUP_IDS } from "../../constants";
import {
  getHeldTransposeClassName,
  getPadGroupButtonClassName,
  kitPadGroupCardContainerClassName,
  kitPadGroupCardGlowClassName,
} from "./DrumpadControllerKitPadGroupCard.styles";
import type { DrumpadControllerKitPadGroupCardProps } from "./DrumpadControllerKitPadGroupCard.types";

const DrumpadControllerKitPadGroupCard = ({
  activePadGroupId,
  heldTransposeOctaveOffsetLabel,
  heldTransposeSemitoneOffset,
  keyboardHintText,
  kits,
  onExportKit,
  onImportKit,
  onLoadKit,
  onSaveKit,
  onSelectPadGroup,
}: DrumpadControllerKitPadGroupCardProps) => {
  return (
    <div className={kitPadGroupCardContainerClassName}>
      <div className={kitPadGroupCardGlowClassName} />
      <div className="relative">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] lg:items-center lg:gap-6">
          <KitManager
            kits={kits}
            onSaveKit={onSaveKit}
            onLoadKit={onLoadKit}
            onExportKit={onExportKit}
            onImportKit={onImportKit}
            embedded
          />
          <div className="hidden h-16 bg-[#c2beb3] lg:block" />
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[#515a6a] text-sm font-extrabold tracking-wide">PAD GROUP</h3>
                <p className="text-xs text-[#575757]">Group {activePadGroupId} active</p>
              </div>
              <div className="flex items-center gap-2">
                {PAD_GROUP_IDS.map((groupId) => {
                  const isActiveGroup = activePadGroupId === groupId;
                  return (
                    <button
                      key={groupId}
                      type="button"
                      className={getPadGroupButtonClassName(isActiveGroup)}
                      onClick={() => onSelectPadGroup(groupId)}
                    >
                      Group {groupId}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-[#c2beb3] pt-4 text-center">
          <div className="text-[#5c6270] text-xs font-semibold">{keyboardHintText}</div>
          <div className="text-[#5c6270] text-[11px] font-medium mt-2">
            Hold `1-9` + pad key for +0.25..+2.25 octaves, hold `Shift` + `1-9` + pad key for
            -0.25..-2.25 octaves.
          </div>
          <div className="text-[#5c6270] text-[11px] font-medium mb-2">
            Click toggles steps. Hold `1-9` and click a step to set transpose. Hold `Shift` + `1-9`
            and click for negative transpose.
          </div>
          <div
            className={getHeldTransposeClassName(heldTransposeSemitoneOffset === 0)}
          >
            Held Transpose: {heldTransposeOctaveOffsetLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumpadControllerKitPadGroupCard;
