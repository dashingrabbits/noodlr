import type { SampleAsset, SampleCategory } from "../../integrations/samples/sample.types";
import {
  buildSearchTextForSampleAsset,
  getSampleCategoryLabel,
  SAMPLE_CATEGORY_ORDER,
} from "../../integrations/samples/sample.utilities";

export type SampleCategoryFilter = "all" | SampleCategory;

export const DEFAULT_VISIBLE_SAMPLE_COUNT = 120;
export const LOAD_MORE_SAMPLE_COUNT = 80;
export const LOAD_MORE_SCROLL_THRESHOLD_PX = 96;

export const getSampleCategoryFilterOptions = (): Array<{
  value: SampleCategoryFilter;
  label: string;
}> => {
  return [
    {
      value: "all",
      label: "All Categories",
    },
    ...SAMPLE_CATEGORY_ORDER.map((category) => ({
      value: category,
      label: getSampleCategoryLabel(category),
    })),
  ];
};

export const filterAssignableSamples = (
  samples: SampleAsset[],
  query: string,
  category: SampleCategoryFilter
): SampleAsset[] => {
  const normalizedQuery = query.trim().toLowerCase();

  return samples.filter((sample) => {
    if (category !== "all" && sample.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return buildSearchTextForSampleAsset(sample).includes(normalizedQuery);
  });
};
