import type { PadVolumes } from "../DrumpadController/DrumpadController.types";

export const resolvePadVolume = (
  padId: number,
  padVolumes: PadVolumes,
  defaultPadVolume: number
): number => {
  return padVolumes[padId] ?? defaultPadVolume;
};
