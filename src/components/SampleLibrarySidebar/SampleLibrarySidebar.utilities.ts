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
