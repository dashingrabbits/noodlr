import { useCallback } from "react";
import type {
SampleMetadataOverride
} from "../../../../integrations/samples/sample.types";
import { writeSampleMetadataOverrides } from "../../../../integrations/samples/sample.utilities";

import type {
UseSampleMetadataHandlersInput,
} from "./DrumpadControllerSampleMetadata.types";

export const useSampleMetadataHandlers = ({
  setSampleMetadataOverrides,
}: UseSampleMetadataHandlersInput) => {
  const buildNormalizedMetadataOverride = (
    metadata: SampleMetadataOverride
  ): SampleMetadataOverride => {
    const normalizedName = metadata.name?.trim();
    const normalizedTags = Array.isArray(metadata.tags)
      ? Array.from(
          new Set(
            metadata.tags
              .map((tag) => tag.trim().toLowerCase())
              .filter((tag) => Boolean(tag))
          )
        )
      : undefined;

    return {
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(metadata.category ? { category: metadata.category } : {}),
      ...(normalizedTags ? { tags: normalizedTags } : {}),
    };
  };

  const handleSaveSampleMetadata = useCallback(
    (sampleId: string, metadata: SampleMetadataOverride) => {
      setSampleMetadataOverrides((previous) => {
        const normalizedMetadata = buildNormalizedMetadataOverride(metadata);
        const hasOverrides = Object.keys(normalizedMetadata).length > 0;
        const nextOverrides = { ...previous };

        if (hasOverrides) {
          nextOverrides[sampleId] = normalizedMetadata;
        } else {
          delete nextOverrides[sampleId];
        }

        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });
    },
    [setSampleMetadataOverrides]
  );

  const handleResetSampleMetadata = useCallback(
    (sampleId: string) => {
      setSampleMetadataOverrides((previous) => {
        if (!(sampleId in previous)) {
          return previous;
        }

        const nextOverrides = { ...previous };
        delete nextOverrides[sampleId];
        writeSampleMetadataOverrides(nextOverrides);
        return nextOverrides;
      });
    },
    [setSampleMetadataOverrides]
  );

  return {
    handleResetSampleMetadata,
    handleSaveSampleMetadata,
  };
};

