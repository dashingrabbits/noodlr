import { DRUMPAD_CONTROLLER_PANEL_MODE_OPTIONS } from "./DrumpadControllerPanelModeTabs.constants";
import {
  getPanelModeTabButtonClassName,
  panelModeTabsContainerClassName,
  panelModeTabsGridClassName,
} from "./DrumpadControllerPanelModeTabs.styles";
import type { DrumpadControllerPanelModeTabsProps } from "./DrumpadControllerPanelModeTabs.types";

const DrumpadControllerPanelModeTabs = ({
  sequencerPanelMode,
  onSelectSequencerPanelMode,
}: DrumpadControllerPanelModeTabsProps) => {
  return (
    <div className={panelModeTabsContainerClassName}>
      <div className={panelModeTabsGridClassName}>
        {DRUMPAD_CONTROLLER_PANEL_MODE_OPTIONS.map((option) => {
          const isActive = sequencerPanelMode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              className={getPanelModeTabButtonClassName(
                isActive,
                option.mode === "song"
              )}
              onClick={() => onSelectSequencerPanelMode(option.mode)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DrumpadControllerPanelModeTabs;
