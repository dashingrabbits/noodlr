import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";

export type UseEditingPadSampleBufferEffectInput = {
  editingPad: { id: number } | null;
  editingPadSample: SampleAsset | null;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  setEditingPadSampleBuffer: Dispatch<SetStateAction<AudioBuffer | null>>;
  setIsEditingPadSampleBufferLoading: Dispatch<SetStateAction<boolean>>;
};
