import type { SampleAsset } from "../../integrations/samples/sample.types";

export interface PadSampleAssignModalProps {
  isOpen: boolean;
  padName: string;
  samples: SampleAsset[];
  onClose: () => void;
  onPreviewSample: (sampleId: string) => void;
  onAssignSample: (sampleId: string) => void;
}
