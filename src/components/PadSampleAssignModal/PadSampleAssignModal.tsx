import { useEffect, useMemo, useState } from "react";
import { Play, Search, X } from "lucide-react";
import type { PadSampleAssignModalProps } from "./PadSampleAssignModal.types";
import {
  DEFAULT_VISIBLE_SAMPLE_COUNT,
  filterAssignableSamples,
  getSampleCategoryFilterOptions,
  LOAD_MORE_SAMPLE_COUNT,
  LOAD_MORE_SCROLL_THRESHOLD_PX,
  type SampleCategoryFilter,
} from "./PadSampleAssignModal.utilities";
import {
  categoryBadgeClassName,
  inputClassName,
  modalClassName,
  overlayClassName,
  sampleListClassName,
  sampleRowClassName,
} from "./PadSampleAssignModal.styles";

const PadSampleAssignModal = ({
  isOpen,
  padName,
  samples,
  onClose,
  onPreviewSample,
  onAssignSample,
}: PadSampleAssignModalProps) => {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SampleCategoryFilter>("all");
  const [visibleSampleCount, setVisibleSampleCount] = useState(DEFAULT_VISIBLE_SAMPLE_COUNT);
  const categoryOptions = useMemo(() => getSampleCategoryFilterOptions(), []);

  const filteredSamples = useMemo(() => {
    return filterAssignableSamples(samples, query, categoryFilter);
  }, [categoryFilter, query, samples]);

  const visibleSamples = useMemo(() => {
    return filteredSamples.slice(0, visibleSampleCount);
  }, [filteredSamples, visibleSampleCount]);

  const hasMoreSamples = visibleSampleCount < filteredSamples.length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setCategoryFilter("all");
    setVisibleSampleCount(DEFAULT_VISIBLE_SAMPLE_COUNT);
  }, [isOpen]);

  useEffect(() => {
    setVisibleSampleCount(DEFAULT_VISIBLE_SAMPLE_COUNT);
  }, [query, categoryFilter, samples]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      aria-label="Assign sample to pad"
      onClick={onClose}
    >
      <div className={modalClassName} onClick={(event) => event.stopPropagation()}>
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#c5c4bc] bg-[#efeee8] flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[#515a6a] text-base sm:text-lg font-bold">Assign Sample</h3>
            <p className="text-xs text-[#666] mt-0.5">
              Choose a sample for <span className="font-bold text-[#515a6a]">{padName}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#a8aba5] bg-[#f6f5ef] text-[#515a6a] hover:bg-[#e9e8e2] transition-colors"
            aria-label="Close sample assignment modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8f96]"
              />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, category, tags, or file path"
                className={`${inputClassName} pl-8`}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as SampleCategoryFilter)}
              className={inputClassName}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px] text-[#666]">
            {filteredSamples.length} result{filteredSamples.length === 1 ? "" : "s"}
          </div>
          <p className="mt-1 text-[11px] text-[#666]">
            Click a sample row to assign it, or use the play button to preview.
          </p>

          <div
            className={sampleListClassName}
            onScroll={(event) => {
              if (!hasMoreSamples) {
                return;
              }

              const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
              const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
              if (distanceToBottom <= LOAD_MORE_SCROLL_THRESHOLD_PX) {
                setVisibleSampleCount((previous) =>
                  Math.min(filteredSamples.length, previous + LOAD_MORE_SAMPLE_COUNT)
                );
              }
            }}
          >
            {visibleSamples.length > 0 ? (
              visibleSamples.map((sample) => (
                <div key={sample.id} className={sampleRowClassName}>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onAssignSample(sample.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-sm font-bold text-[#515a6a] truncate">{sample.name}</div>
                      <div className="mt-1 text-[11px] text-[#666] truncate">
                        {sample.relativePath || sample.id}
                      </div>
                    </button>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className={categoryBadgeClassName}>{sample.category}</span>
                      <button
                        type="button"
                        onClick={() => onPreviewSample(sample.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#a8aba5] bg-[#ecebe6] text-[#515a6a] hover:bg-[#e2e0da] transition-colors"
                        aria-label={`Preview ${sample.name}`}
                        title="Preview sample"
                      >
                        <Play size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[#b8b5aa] bg-[#f6f5ef] px-3 py-4 text-center text-xs text-[#666]">
                No samples match your search.
              </div>
            )}
            {hasMoreSamples ? (
              <div className="pt-2 text-center text-[11px] text-[#666]">
                Scroll to load more ({visibleSamples.length}/{filteredSamples.length})
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PadSampleAssignModal;
