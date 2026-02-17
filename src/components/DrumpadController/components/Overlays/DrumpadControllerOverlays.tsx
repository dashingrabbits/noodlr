import { useCallback, useState } from "react";
import PadSampleAssignModal from "../../../PadSampleAssignModal";
import PadSampleEditorModal from "../../../PadSampleEditorModal";
import {
  countdownOverlayClassName,
  countdownTextClassName,
  statusModalOverlayClassName,
} from "./DrumpadControllerOverlays.styles";
import type { DrumpadControllerOverlaysProps } from "./DrumpadControllerOverlays.types";

const DrumpadControllerOverlays = ({
  clearProjectLoadFeedback,
  countInBeatsRemaining,
  defaultPadSampleSettings,
  defaultPadVolume,
  defaultSamplePolyphony,
  editingPad,
  editingPadSampleBuffer,
  editingPadSampleId,
  effectiveSampleAssets,
  handleAssignSampleToSelectedPad,
  handleClosePadSampleAssignModal,
  handleCloseSaveProjectModal,
  handleOpenSampleRootPromptKitImport,
  handleOpenSampleRootPromptProjectImport,
  handlePadLoopToggle,
  handlePadNameChange,
  handlePadPolyphonyChange,
  handlePadSampleClear,
  handlePadSampleEditorOpenChange,
  handlePadSampleSettingsChange,
  handlePadVolumeChange,
  handlePreviewSample,
  handleResetPadSampleSettings,
  handleSampleRootPromptKitFileChange,
  handleSampleRootPromptProjectFileChange,
  handleSavePadEditorSettingsToSavedKits,
  handleSubmitOverwriteProject,
  handleSubmitSampleRootDirPrompt,
  handleSubmitSaveProjectAsNew,
  handleUseDemoKit,
  isEditingPadSampleBufferLoading,
  isImportingDemoKit,
  isSampleRootDirPromptOpen,
  isSaveProjectModalOpen,
  isSelectingSampleDirectory,
  kitArchiveAccept,
  missingProjectSamples,
  padAssignedSamples,
  padEditorSaveMessage,
  padLoopEnabled,
  padNames,
  padPolyphony,
  padSampleSettings,
  padVolumes,
  projectArchiveAccept,
  projectLoadStatusMessage,
  projectNameDraft,
  projectNameMaxLength,
  sampleAssignPad,
  sampleError,
  sampleRootDir,
  sampleRootDirDraft,
  sampleRootPromptKitInputRef,
  sampleRootPromptProjectInputRef,
  selectedProject,
  setProjectNameDraft,
  setSampleError,
  setSampleRootDirDraft,
  sessionConnectionStatus,
  sessionError,
  songModeStatusMessage,
  supportsDirectoryPicker,
  onClearSessionError,
  onClearSongModeStatusMessage,
  onJoinSessionFromPrompt,
}: DrumpadControllerOverlaysProps) => {
  const [isJoinPromptExpanded, setIsJoinPromptExpanded] = useState(false);
  const [joinSessionIdDraft, setJoinSessionIdDraft] = useState("");
  const [joinUsernameDraft, setJoinUsernameDraft] = useState("");
  const [isJoinSessionPending, setIsJoinSessionPending] = useState(false);

  const runPromptJoinAction = useCallback(async () => {
    const normalizedSessionId = joinSessionIdDraft.trim();
    const normalizedUserName = joinUsernameDraft.trim();
    if (!normalizedSessionId || !normalizedUserName) {
      return;
    }

    setIsJoinSessionPending(true);
    onClearSessionError();
    try {
      await onJoinSessionFromPrompt({
        sessionId: normalizedSessionId,
        username: normalizedUserName,
      });
    } catch {
      // Session error state is set in the collaboration hook.
    } finally {
      setIsJoinSessionPending(false);
    }
  }, [joinSessionIdDraft, joinUsernameDraft, onClearSessionError, onJoinSessionFromPrompt]);

  return (
    <>
      {countInBeatsRemaining !== null ? (
        <div className={countdownOverlayClassName}>
          <div className="relative flex flex-col items-center gap-3">
            <div className={countdownTextClassName}>
              {countInBeatsRemaining}
            </div>
          </div>
        </div>
      ) : null}
      <PadSampleAssignModal
        isOpen={Boolean(sampleAssignPad)}
        padName={sampleAssignPad ? padNames[sampleAssignPad.id] ?? sampleAssignPad.label : ""}
        samples={effectiveSampleAssets}
        onClose={handleClosePadSampleAssignModal}
        onPreviewSample={handlePreviewSample}
        onAssignSample={handleAssignSampleToSelectedPad}
      />
      <PadSampleEditorModal
        isOpen={Boolean(editingPad)}
        padName={editingPad ? padNames[editingPad.id] ?? editingPad.label : ""}
        sampleName={editingPad ? padAssignedSamples[editingPad.id]?.name ?? "" : ""}
        sampleBuffer={editingPadSampleBuffer}
        isSampleBufferLoading={isEditingPadSampleBufferLoading}
        padVolume={editingPad ? padVolumes[editingPad.id] ?? defaultPadVolume : defaultPadVolume}
        padPolyphony={
          editingPad ? padPolyphony[editingPad.id] ?? defaultSamplePolyphony : defaultSamplePolyphony
        }
        isLoopEnabled={editingPad ? padLoopEnabled[editingPad.id] ?? false : false}
        settings={
          editingPad
            ? padSampleSettings[editingPad.id] ?? defaultPadSampleSettings
            : defaultPadSampleSettings
        }
        saveToKitsDisabled={!editingPadSampleId}
        saveToKitsMessage={padEditorSaveMessage}
        onOpenChange={handlePadSampleEditorOpenChange}
        onPadNameChange={(nextName) => {
          if (!editingPad) {
            return;
          }

          handlePadNameChange(editingPad.id, nextName);
        }}
        onPadVolumeChange={(nextVolume) => {
          if (!editingPad) {
            return;
          }

          handlePadVolumeChange(editingPad.id, nextVolume);
        }}
        onPadPolyphonyChange={(nextPolyphony) => {
          if (!editingPad) {
            return;
          }

          handlePadPolyphonyChange(editingPad.id, nextPolyphony);
        }}
        onPadLoopToggle={() => {
          if (!editingPad) {
            return;
          }

          handlePadLoopToggle(editingPad.id);
        }}
        onPadSampleClear={() => {
          if (!editingPad) {
            return;
          }

          handlePadSampleClear(editingPad.id);
        }}
        onChange={(nextSettings) => {
          if (!editingPad) {
            return;
          }

          handlePadSampleSettingsChange(editingPad.id, nextSettings);
        }}
        onReset={() => {
          if (!editingPad) {
            return;
          }

          handleResetPadSampleSettings(editingPad.id);
        }}
        onSaveToKits={handleSavePadEditorSettingsToSavedKits}
      />
      <input
        ref={sampleRootPromptProjectInputRef}
        type="file"
        accept={projectArchiveAccept}
        className="hidden"
        onChange={handleSampleRootPromptProjectFileChange}
      />
      <input
        ref={sampleRootPromptKitInputRef}
        type="file"
        accept={kitArchiveAccept}
        className="hidden"
        onChange={handleSampleRootPromptKitFileChange}
      />
      {songModeStatusMessage ? (
        <div className={statusModalOverlayClassName}>
          <div className="w-full max-w-sm rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-4 shadow-2xl">
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Song Status</h4>
            <p className="text-sm text-[#575757]">{songModeStatusMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors"
                onClick={onClearSongModeStatusMessage}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {projectLoadStatusMessage ? (
        <div className="fixed inset-0 z-[4000] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-4 shadow-2xl">
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Missing Samples</h4>
            <p className="text-sm text-[#575757]">{projectLoadStatusMessage}</p>
            {missingProjectSamples.length > 0 ? (
              <ul className="mt-3 max-h-56 overflow-y-auto rounded-md border border-[#b8b5aa] bg-[#fbfaf6] p-2 text-xs text-[#575757]">
                {missingProjectSamples.map((sampleLabel) => (
                  <li key={sampleLabel} className="px-1 py-0.5">
                    {sampleLabel}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors"
                onClick={clearProjectLoadFeedback}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isSaveProjectModalOpen ? (
        <div className="fixed inset-0 z-[4000] bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-4 shadow-2xl">
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Save Project</h4>
            <p className="text-xs text-[#666] mb-3">
              {selectedProject
                ? `Overwrite "${selectedProject.name}" or save this as a new project.`
                : "Enter a name for this project."}
            </p>
            <input
              autoFocus
              type="text"
              maxLength={projectNameMaxLength}
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (selectedProject) {
                    handleSubmitOverwriteProject();
                  } else {
                    handleSubmitSaveProjectAsNew();
                  }
                }

                if (event.key === "Escape") {
                  handleCloseSaveProjectModal();
                }
              }}
              className="w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
              placeholder={selectedProject?.name || "My Project"}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleCloseSaveProjectModal}
              >
                Cancel
              </button>
              {selectedProject ? (
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-xs font-bold bg-[#8f9bb0] hover:bg-[#7e8ba2] text-[#515a6a] border border-[#778299] transition-colors"
                  onClick={handleSubmitOverwriteProject}
                >
                  Overwrite
                </button>
              ) : null}
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors"
                onClick={handleSubmitSaveProjectAsNew}
              >
                {selectedProject ? "Save As New" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isSampleRootDirPromptOpen ? (
        <div className="fixed inset-0 z-[7000] bg-[#111]/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#a8aba5] bg-[#f6f5ef] p-5 shadow-2xl">
            <h4 className="text-[#515a6a] text-lg font-bold">Set Sample Folder</h4>
            <p className="text-xs text-[#666] mt-1">
              {supportsDirectoryPicker
                ? "Choose a local sample folder, or import a project/kit without selecting one."
                : "Enter a local sample folder path, or import a project/kit without setting a folder."}
            </p>
            {supportsDirectoryPicker ? (
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-[#515a6a]">SELECTED FOLDER</label>
                <input
                  type="text"
                  value={sampleRootDir || "No folder selected"}
                  readOnly
                  className="mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5]"
                />
              </div>
            ) : (
              <>
                <label className="mt-4 block text-[11px] font-bold text-[#515a6a]">
                  SAMPLE FOLDER PATH
                </label>
                <input
                  autoFocus
                  type="text"
                  value={sampleRootDirDraft}
                  onChange={(event) => {
                    setSampleRootDirDraft(event.target.value);
                    if (sampleError) {
                      setSampleError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSubmitSampleRootDirPrompt();
                    }
                  }}
                  placeholder="/path/to/samples"
                  className="mt-1 w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
                />
              </>
            )}
            {sampleError ? <p className="mt-2 text-xs text-[#a6382f]">{sampleError}</p> : null}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleOpenSampleRootPromptProjectImport}
              >
                Import Project
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors"
                onClick={handleOpenSampleRootPromptKitImport}
              >
                Import Kit
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleUseDemoKit}
                disabled={isImportingDemoKit || isSelectingSampleDirectory}
              >
                {isImportingDemoKit ? "Loading Demo..." : "Use Demo Kit"}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-xs font-bold bg-[#d4d4ce] hover:bg-[#c4c6bf] text-[#515a6a] border border-[#a8aba5] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSubmitSampleRootDirPrompt}
                disabled={isSelectingSampleDirectory || isImportingDemoKit}
              >
                {supportsDirectoryPicker
                  ? isSelectingSampleDirectory
                    ? "Opening..."
                    : "Choose Folder"
                  : "Load Samples"}
              </button>
            </div>
            <div className="mt-3 rounded-md border border-[#b8b5aa] bg-[#ecebe6] p-3">
              <button
                type="button"
                className="w-full px-4 py-2 rounded-md text-xs font-bold bg-[#515a6a] hover:bg-[#454d5b] text-[#f7f7f5] border border-[#3f4653] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => {
                  setIsJoinPromptExpanded((previous) => !previous);
                }}
                disabled={isJoinSessionPending || sessionConnectionStatus === "connecting"}
              >
                Join Session
              </button>
              {isJoinPromptExpanded ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={joinSessionIdDraft}
                    onChange={(event) => {
                      setJoinSessionIdDraft(event.target.value);
                      if (sessionError) {
                        onClearSessionError();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();
                      void runPromptJoinAction();
                    }}
                    placeholder="Paste session ID"
                    className="w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
                  />
                  <input
                    type="text"
                    value={joinUsernameDraft}
                    onChange={(event) => {
                      setJoinUsernameDraft(event.target.value);
                      if (sessionError) {
                        onClearSessionError();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      event.preventDefault();
                      void runPromptJoinAction();
                    }}
                    placeholder="Enter username"
                    className="w-full rounded-md bg-[#fbfaf6] text-[#515a6a] text-sm px-3 py-2 border border-[#a8aba5] focus:outline-none focus:ring-2 focus:ring-[#ff8c2b]"
                  />
                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-md text-xs font-bold bg-[#ff8c2b] hover:bg-[#ed7d1f] text-[#515a6a] border border-[#d66d14] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      void runPromptJoinAction();
                    }}
                    disabled={isJoinSessionPending}
                  >
                    Join Session
                  </button>
                </div>
              ) : null}
              {sessionError ? <p className="mt-2 text-xs text-[#a6382f]">{sessionError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DrumpadControllerOverlays;
