import { type Dispatch,type MutableRefObject,type SetStateAction } from "react";
import type { SampleAsset,SampleMetadataOverrides } from "../../../../integrations/samples/sample.types";
import type {
DrumKitState
} from "../../../KitManager/KitManager.types";

export type UseKitArchiveHandlersInput = {
  applyDrumKitState: (candidateKitState: Partial<DrumKitState>) => void;
  buildDrumKitStateSnapshot: () => DrumKitState;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  importedSampleObjectUrlsRef: MutableRefObject<Set<string>>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleBufferCacheRef: MutableRefObject<Map<string, AudioBuffer>>;
  sampleMetadataOverrides: SampleMetadataOverrides;
  setImportedSampleAssets: Dispatch<SetStateAction<SampleAsset[]>>;
  setIsImportingDemoKit: Dispatch<SetStateAction<boolean>>;
  setSampleError: Dispatch<SetStateAction<string | null>>;
  setSampleMetadataOverrides: Dispatch<SetStateAction<SampleMetadataOverrides>>;
};
