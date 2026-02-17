import { Play, Square } from "lucide-react";
import { PAD_GROUP_IDS } from "../../constants";
import {
  getSceneActionButtonClassName,
  getScenePlayStopButtonClassName,
  sceneModePanelContainerClassName,
} from "./SceneModePanel.styles";
import type { SceneModePanelProps } from "./SceneModePanel.types";

const SceneModePanel = ({
  activeScene,
  isPlaying,
  livePadGroupsState,
  maxSceneNameLength,
  sceneDefinitions,
  onAddScene,
  onAddSceneToSong,
  onDeleteActiveScene,
  onSceneNameChange,
  onSceneNameCommit,
  onScenePlayStopToggle,
  onSelectSceneDefinition,
  onSelectScenePattern,
}: SceneModePanelProps) => {
  return (
    <div className={sceneModePanelContainerClassName}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[#515a6a] text-lg font-extrabold tracking-wide">SCENE MODE</h3>
          <p className="text-xs text-[#575757]">
            Choose one pattern per group. All selected group patterns play together.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={getSceneActionButtonClassName("default")}
            onClick={onAddScene}
          >
            Add Scene
          </button>
          <button
            type="button"
            className={getSceneActionButtonClassName("song")}
            disabled={!activeScene}
            onClick={() => {
              if (activeScene) {
                onAddSceneToSong(activeScene.id);
              }
            }}
          >
            Add Scene To Song
          </button>
          <button
            type="button"
            className={getSceneActionButtonClassName("delete")}
            disabled={sceneDefinitions.length <= 1 || !activeScene}
            onClick={onDeleteActiveScene}
          >
            Delete Scene
          </button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {sceneDefinitions.map((sceneDefinition, sceneIndex) => {
          const isActiveScene = activeScene?.id === sceneDefinition.id;
          const isScenePlaying = isPlaying && isActiveScene;
          return (
            <div
              key={sceneDefinition.id}
              className="inline-flex overflow-hidden rounded-md border border-[#a8aba5]"
            >
              {isActiveScene ? (
                <input
                  type="text"
                  value={sceneDefinition.name}
                  maxLength={maxSceneNameLength}
                  onChange={(event) =>
                    onSceneNameChange(sceneDefinition.id, event.target.value)
                  }
                  onBlur={() => onSceneNameCommit(sceneDefinition.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === "Escape") {
                      event.preventDefault();
                      (event.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  placeholder={`Scene ${sceneIndex + 1}`}
                  aria-label={`Rename scene ${sceneIndex + 1}`}
                  className="min-w-[104px] bg-[#fbfaf6] text-[#cc6e20] px-3 py-1.5 text-xs font-bold border-y-0 border-l-0 border-r border-[#a8aba5] focus:outline-none focus:bg-[#ffffff]"
                />
              ) : (
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-bold border-y-0 border-l-0 border-r border-[#a8aba5] transition-colors bg-[#d7d9d3] text-[#515a6a] hover:bg-[#c8cbc2]"
                  onClick={() => onSelectSceneDefinition(sceneDefinition.id)}
                >
                  {sceneDefinition.name || `Scene ${sceneIndex + 1}`}
                </button>
              )}
              <button
                type="button"
                className={getScenePlayStopButtonClassName(isScenePlaying)}
                onClick={() => onScenePlayStopToggle(sceneDefinition.id)}
                aria-label={isScenePlaying ? "Stop scene" : "Play scene"}
                title={isScenePlaying ? "Stop scene" : "Play scene"}
              >
                {isScenePlaying ? <Square size={12} /> : <Play size={12} />}
              </button>
            </div>
          );
        })}
      </div>
      {activeScene ? (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
          {PAD_GROUP_IDS.map((groupId) => {
            const groupState = livePadGroupsState[groupId];
            const selectedPatternId = activeScene.selectedPatternIdsByGroup[groupId];
            return (
              <div
                key={groupId}
                className="rounded-lg border border-[#b8b5aa] bg-[#f7f6f2] px-3 py-2"
              >
                <div className="mb-1 text-[11px] font-bold tracking-wide text-[#515a6a]">
                  Group {groupId}
                </div>
                <div className="flex flex-col gap-2">
                  {groupState.sequencerPatterns.map((pattern) => {
                    const isSelectedPattern = selectedPatternId === pattern.id;
                    return (
                      <button
                        key={pattern.id}
                        type="button"
                        className={`w-full px-3 py-1 rounded-md text-left text-[11px] font-bold border transition-colors ${
                          isSelectedPattern
                            ? "border-[#cc6e20] bg-[#ee8d3d] text-white"
                            : "border-[#a8aba5] bg-[#d7d9d3] text-[#515a6a] hover:bg-[#c8cbc2]"
                        }`}
                        onClick={() => onSelectScenePattern(groupId, pattern.id)}
                      >
                        {pattern.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default SceneModePanel;
