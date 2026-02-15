import type { SampleAsset } from "../../integrations/samples/sample.types";

export interface PadSampleAssignModalProps {
  isOpen: boolean;
  padName: string;
  samples: SampleAsset[];
  onClose: () => void;
  onAssignSample: (sampleId: string) => void;
}
