import { type Dispatch,type SetStateAction } from "react";
import type {
SampleMetadataOverrides
} from "../../../../integrations/samples/sample.types";

export type UseSampleMetadataHandlersInput = {
  setSampleMetadataOverrides: Dispatch<SetStateAction<SampleMetadataOverrides>>;
};
