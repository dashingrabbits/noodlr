import { useState } from "react";
import {
  addToSongButtonClassName,
  exportSongButtonClassName,
  getSongPlayButtonClassName,
  songModePanelContainerClassName,
} from "./SongModePanel.styles";
import type { SongModePanelProps } from "./SongModePanel.types";

const SongModePanel = ({
  currentSongEntryIndex,
  currentSongEntryProgress,
  isExportingSong,
  isPlaying,
  sceneDefinitions,
  sceneDefinitionsById,
  songArrangement,
  songSceneDraftId,
  onAddSceneToSong,
  onDeleteSongEntry,
  onExportSongWithStatus,
  onMoveSongEntry,
  onSongSceneDraftIdChange,
  onTogglePlayback,
}: SongModePanelProps) => {
  const [draggingSongEntryId, setDraggingSongEntryId] = useState<string | null>(null);

  return (
    <div className={songModePanelContainerClassName}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[#515a6a] text-lg font-extrabold tracking-wide">SONG MODE</h3>
          <p className="text-xs text-[#575757]">
            Arrange scenes into a song timeline. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={songSceneDraftId}
            onChange={(event) => onSongSceneDraftIdChange(event.target.value)}
            className="rounded-md bg-[#fbfaf6] text-[#515a6a] text-xs px-2 py-1 border border-[#a8aba5] focus:outline-none focus:ring-1 focus:ring-[#ff8c2b]"
          >
            {sceneDefinitions.map((sceneDefinition, sceneIndex) => (
              <option key={sceneDefinition.id} value={sceneDefinition.id}>
                {sceneDefinition.name || `Scene ${sceneIndex + 1}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={addToSongButtonClassName}
            onClick={() => onAddSceneToSong(songSceneDraftId)}
          >
            Add To Song
          </button>
          <button
            type="button"
            className={getSongPlayButtonClassName(isPlaying)}
            disabled={!songArrangement.length}
            onClick={onTogglePlayback}
          >
            {isPlaying ? "Stop Song" : "Play Song"}
          </button>
          <button
            type="button"
            className={exportSongButtonClassName}
            disabled={!songArrangement.length || isExportingSong}
            onClick={onExportSongWithStatus}
          >
            {isExportingSong ? "Exporting..." : "Export Song (.wav)"}
          </button>
        </div>
      </div>
      {songArrangement.length ? (
        <div className="space-y-2">
          {songArrangement.map((songEntry, songEntryIndex) => {
            const songScene = sceneDefinitionsById.get(songEntry.sceneId);
            const isCurrentlyPlayingEntry =
              isPlaying &&
              currentSongEntryIndex !== null &&
              currentSongEntryIndex === songEntryIndex;
            const isDraggingEntry = draggingSongEntryId === songEntry.id;
            return (
              <div
                key={songEntry.id}
                draggable
                onDragStart={() => setDraggingSongEntryId(songEntry.id)}
                onDragEnd={() => setDraggingSongEntryId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggingSongEntryId) {
                    return;
                  }
                  onMoveSongEntry(draggingSongEntryId, songEntry.id);
                  setDraggingSongEntryId(null);
                }}
                className={`relative overflow-hidden rounded-lg border px-3 py-2 flex items-center justify-between gap-3 cursor-move transition-colors ${
                  isCurrentlyPlayingEntry
                    ? "border-[#cc6e20] bg-[#ffe4c7]"
                    : "border-[#b8b5aa] bg-[#f7f6f2]"
                } ${isDraggingEntry ? "opacity-70" : ""}`}
              >
                {isCurrentlyPlayingEntry ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-[rgba(238,141,61,0.28)]"
                    style={{
                      width: `${Math.round((currentSongEntryProgress ?? 0) * 100)}%`,
                    }}
                  />
                ) : null}
                <div className="relative z-10 min-w-0">
                  <div className="text-[11px] font-extrabold tracking-wide text-[#515a6a]">
                    {songEntryIndex + 1}. {songScene?.name ?? "Scene"}
                  </div>
                  <div className="text-[10px] text-[#666]">
                    {isCurrentlyPlayingEntry ? "Currently playing" : "Drag to reorder"}
                  </div>
                </div>
                <button
                  type="button"
                  className="relative z-10 px-2 py-1 rounded-md text-[11px] font-bold border border-[#bf5950] bg-[#d96d64] text-white hover:bg-[#c75d54] transition-colors"
                  onClick={() => onDeleteSongEntry(songEntry.id)}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-[#b8b5aa] bg-[#f7f6f2] px-3 py-3 text-xs text-[#575757]">
          No scenes in song timeline yet. Add scenes to build a song.
        </div>
      )}
    </div>
  );
};

export default SongModePanel;
