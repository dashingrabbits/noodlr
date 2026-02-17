import type { KitManagerProps, SavedDrumKit } from "../../../KitManager/KitManager.types";
import type { PadGroupId } from "../../DrumpadController.types";

export type DrumpadControllerKitPadGroupCardProps = {
  activePadGroupId: PadGroupId;
  heldTransposeOctaveOffsetLabel: string;
  heldTransposeSemitoneOffset: number;
  keyboardHintText: string;
  kits: SavedDrumKit[];
  onExportKit: KitManagerProps["onExportKit"];
  onImportKit: KitManagerProps["onImportKit"];
  onLoadKit: KitManagerProps["onLoadKit"];
  onSaveKit: KitManagerProps["onSaveKit"];
  onSelectPadGroup: (groupId: PadGroupId) => void;
};
