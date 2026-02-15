import {
  getSampleCategoryLabel,
  parseSampleTagsInput,
  SAMPLE_CATEGORY_ORDER,
} from "../../integrations/samples/sample.utilities";
import type { SampleCategory } from "../../integrations/samples/sample.types";

export const SAMPLE_DRAG_DATA_MIME_TYPE = "application/x-noodlr-sample-id";

export const buildSampleCountLabel = (filteredCount: number, totalCount: number): string => {
  if (totalCount === 0) {
    return "No local samples found.";
  }
  if (filteredCount === totalCount) {
    return `${totalCount} samples`;
  }
  return `${filteredCount} of ${totalCount} samples`;
};

export const parseSidebarTagsInput = (value: string): string[] => {
  return parseSampleTagsInput(value);
};

export const getCategoryOptions = (): Array<{ value: SampleCategory; label: string }> => {
  return SAMPLE_CATEGORY_ORDER.map((category) => ({
    value: category,
    label: getSampleCategoryLabel(category),
  }));
};
