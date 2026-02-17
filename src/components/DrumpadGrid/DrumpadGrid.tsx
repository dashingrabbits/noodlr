import Drumpad from "../Drumpad";
import type { DrumpadGridProps } from "./DrumpadGrid.types";
import { resolvePadVolume } from "./DrumpadGrid.utilities";
import { gridClassName } from "./DrumpadGrid.styles";

const DrumpadGrid = ({
  pads,
  padVolumes,
  padNames,
  padPolyphony,
  padAssignedSamples,
  defaultPadVolume,
  onPadButtonMount,
  onPadPress,
  onPadSampleDrop,
  onOpenPadSampleAssignModal,
  onOpenPadSampleEditor,
}: DrumpadGridProps) => {
  return (
    <div className={gridClassName}>
      {pads.map((pad) => (
        <Drumpad
          key={pad.id}
          pad={pad}
          volume={resolvePadVolume(pad.id, padVolumes, defaultPadVolume)}
          polyphony={padPolyphony[pad.id] ?? 1}
          name={padNames[pad.id] ?? ""}
          assignedSampleName={padAssignedSamples[pad.id]?.name ?? ""}
          onPadButtonMount={onPadButtonMount}
          onPadPress={onPadPress}
          onPadSampleDrop={onPadSampleDrop}
          onOpenPadSampleAssignModal={onOpenPadSampleAssignModal}
          onOpenPadSampleEditor={onOpenPadSampleEditor}
        />
      ))}
    </div>
  );
};

export default DrumpadGrid;
