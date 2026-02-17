import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { SampleCategory } from "../../integrations/samples/sample.types";
import SessionSharing from "../SessionSharing";
import type { SampleLibrarySidebarProps } from "./SampleLibrarySidebar.types";
import {
  buildSampleCountLabel,
  getCategoryOptions,
  parseSidebarTagsInput,
  SAMPLE_DRAG_DATA_MIME_TYPE,
} from "./SampleLibrarySidebar.utilities";
import {
  badgeClassName,
  buttonClassName,
  inputClassName,
  labelClassName,
  metaTextClassName,
  sampleListClassName,
  sampleRowActiveClassName,
  sampleRowBaseClassName,
  sidebarClassName,
  tagBadgeClassName,
} from "./SampleLibrarySidebar.styles";

const SAMPLES_PAGE_SIZE = 100;
const SCROLL_LOAD_THRESHOLD_PX = 96;

const SampleLibrarySidebar = ({
  sessionSharingProps,
  rootDir,
  supportsDirectoryPicker,
  search,
  isLoading,
  error,
  totalSampleCount,
  filteredSampleCount,
  samples,
  onRootDirChange,
  onPickDirectory,
  onSearchChange,
  onRefreshSamples,
  onPreviewSample,
  onSaveSampleMetadata,
  onResetSampleMetadata,
}: SampleLibrarySidebarProps) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [editorName, setEditorName] = useState("");
  const [editorCategory, setEditorCategory] = useState<SampleCategory>("uncategorized");
  const [editorTags, setEditorTags] = useState("");
  const [visibleSampleCount, setVisibleSampleCount] = useState(SAMPLES_PAGE_SIZE);
  const [rootDirDraft, setRootDirDraft] = useState(rootDir);

  const categoryOptions = useMemo(() => getCategoryOptions(), []);
  const visibleSamples = useMemo(
    () => samples.slice(0, visibleSampleCount),
    [samples, visibleSampleCount]
  );
  const hasMoreSamples = visibleSampleCount < samples.length;

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.id === selectedSampleId) || null,
    [samples, selectedSampleId]
  );

  const loadMoreSamples = useCallback(() => {
    setVisibleSampleCount((previous) =>
      Math.min(samples.length, previous + SAMPLES_PAGE_SIZE)
    );
  }, [samples.length]);

  useEffect(() => {
    if (!samples.length) {
      setSelectedSampleId("");
      return;
    }

    const selectionStillExists = samples.some((sample) => sample.id === selectedSampleId);
    if (!selectionStillExists) {
      setSelectedSampleId(samples[0].id);
    }
  }, [samples, selectedSampleId]);

  useEffect(() => {
    setVisibleSampleCount(SAMPLES_PAGE_SIZE);
  }, [samples]);

  useEffect(() => {
    setRootDirDraft(rootDir);
  }, [rootDir]);

  useEffect(() => {
    if (!selectedSample) {
      setEditorName("");
      setEditorCategory("uncategorized");
      setEditorTags("");
      return;
    }

    setEditorName(selectedSample.name);
    setEditorCategory(selectedSample.category);
    setEditorTags(selectedSample.tags.join(", "));
  }, [selectedSample]);

  const commitRootDirDraft = useCallback(() => {
    const normalizedRootDir = rootDirDraft.trim();
    if (!normalizedRootDir || normalizedRootDir === rootDir) {
      return;
    }

    onRootDirChange(normalizedRootDir);
    onRefreshSamples();
  }, [onRefreshSamples, onRootDirChange, rootDir, rootDirDraft]);

  return (
    <aside className={sidebarClassName}>
      <SessionSharing {...sessionSharingProps} />

      {supportsDirectoryPicker ? (
        <div className="mb-3">
          <label className={labelClassName}>LOCAL SAMPLE FOLDER</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rootDir || "No folder selected"}
              readOnly
              className={`${inputClassName} flex-1`}
            />
            <button onClick={onPickDirectory} className={buttonClassName}>
              Choose
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <label className={labelClassName}>LOCAL SAMPLE FOLDER</label>
          <input
            type="text"
            value={rootDirDraft}
            onChange={(event) => setRootDirDraft(event.target.value)}
            onBlur={commitRootDirDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitRootDirDraft();
              }
            }}
            placeholder="/path/to/samples"
            className={inputClassName}
          />
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className={labelClassName}>SEARCH</label>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, category, tags..."
            className={inputClassName}
          />
        </div>
        <button
          onClick={() => {
            if (supportsDirectoryPicker) {
              onRefreshSamples();
              return;
            }

            const normalizedRootDir = rootDirDraft.trim();
            onRootDirChange(normalizedRootDir || rootDir);
            onRefreshSamples();
          }}
          className={`${buttonClassName} self-end`}
        >
          Refresh
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-[#575757]">
          {isLoading ? "Scanning local folder..." : buildSampleCountLabel(filteredSampleCount, totalSampleCount)}
        </p>
        {error ? <p className="text-[11px] text-[#a6382f] truncate max-w-[180px]">{error}</p> : null}
      </div>

      <div
        className={sampleListClassName}
        onScroll={(event) => {
          if (!hasMoreSamples) {
            return;
          }

          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
          const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
          if (distanceToBottom <= SCROLL_LOAD_THRESHOLD_PX) {
            loadMoreSamples();
          }
        }}
      >
        {visibleSamples.map((sample) => {
          const isSelected = sample.id === selectedSampleId;
          return (
            <button
              key={sample.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(SAMPLE_DRAG_DATA_MIME_TYPE, sample.id);
                event.dataTransfer.setData("text/plain", sample.id);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                setSelectedSampleId(sample.id);
                onPreviewSample(sample.id);
              }}
              className={`${sampleRowBaseClassName} ${isSelected ? sampleRowActiveClassName : ""}`}
            >
              <div className="text-xs text-[#515a6a] font-bold truncate">{sample.name}</div>
              <div className="mt-1 flex gap-1 flex-wrap">
                <span className={badgeClassName}>{sample.category}</span>
                {sample.tags.map((tag) => (
                  <span key={`${sample.id}-${tag}`} className={tagBadgeClassName}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className={`${metaTextClassName} mt-1 truncate`}>{sample.relativePath || sample.id}</div>
            </button>
          );
        })}
        {hasMoreSamples ? (
          <div className="px-2 py-2 text-[11px] text-[#666] text-center">
            Scroll to load more samples ({visibleSamples.length}/{samples.length})
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-md border border-[#b8b5aa] bg-[#ecebe6] p-3">
        <div className="text-xs font-bold text-[#515a6a] mb-2">Sample Editor</div>
        {selectedSample ? (
          <>
            <label className={labelClassName}>NAME</label>
            <input
              type="text"
              value={editorName}
              onChange={(event) => setEditorName(event.target.value)}
              className={`${inputClassName} mb-2`}
            />

            <label className={labelClassName}>CATEGORY</label>
            <select
              value={editorCategory}
              onChange={(event) => setEditorCategory(event.target.value as SampleCategory)}
              className={`${inputClassName} mb-2`}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className={labelClassName}>TAGS (comma-separated)</label>
            <input
              type="text"
              value={editorTags}
              onChange={(event) => setEditorTags(event.target.value)}
              className={`${inputClassName} mb-3`}
            />

            <div className="flex gap-2">
              <button
                onClick={() =>
                  onSaveSampleMetadata(selectedSample.id, {
                    name: editorName.trim(),
                    category: editorCategory,
                    tags: parseSidebarTagsInput(editorTags),
                  })
                }
                className={buttonClassName}
              >
                Save
              </button>
              <button
                onClick={() => onResetSampleMetadata(selectedSample.id)}
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-[#666]">Select a sample to edit metadata.</p>
        )}
      </div>
    </aside>
  );
};

export default memo(SampleLibrarySidebar);
