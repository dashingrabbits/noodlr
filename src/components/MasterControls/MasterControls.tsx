import { ChevronDown, Download, FilePlus2, Play, RotateCcw, Save, Square, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MasterControlsProps } from "./MasterControls.types";
import {
  MASTER_VOLUME_MAX,
  MASTER_VOLUME_MIN,
  SEQUENCER_STEPS_TOTAL,
} from "./MasterControls.utilities";
import {
  clearButtonClassName,
  containerClassName,
  createMasterSliderBackgroundStyle,
  masterSliderClassName,
  volumeControlContainerClassName,
  volumePopoverClassName,
  volumeToggleButtonClassName,
} from "./MasterControls.styles";

const MasterControls = ({
  isPlaying,
  masterVolume,
  bpm,
  baseStepLength,
  currentStep,
  projectOptions,
  selectedProjectId,
  onTogglePlayback,
  onClearSequence,
  onOpenSaveProjectModal,
  onCreateNewProject,
  onProjectSelect,
  onDeleteProject,
  onExportProject,
  onImportProject,
  onMasterVolumeChange,
}: MasterControlsProps) => {
  const [isTransferBusy, setIsTransferBusy] = useState(false);
  const [isTransportMenuOpen, setIsTransportMenuOpen] = useState(false);
  const [isTransferMenuOpen, setIsTransferMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const transportMenuRef = useRef<HTMLDivElement | null>(null);
  const transferMenuRef = useRef<HTMLDivElement | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);
  const volumeMenuRef = useRef<HTMLDivElement | null>(null);
  const visibleStep = (currentStep % SEQUENCER_STEPS_TOTAL) + 1;
  const selectedProjectName =
    projectOptions.find((projectOption) => projectOption.id === selectedProjectId)?.name ?? "";

  const runTransferTask = async (
    task: () => Promise<void> | void,
    successMessage: string
  ): Promise<void> => {
    setIsTransferBusy(true);
    setTransferMessage("");

    try {
      await task();
      setTransferMessage(successMessage);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Project transfer failed.";
      setTransferMessage(message);
    } finally {
      setIsTransferBusy(false);
    }
  };

  useEffect(() => {
    if (!isTransportMenuOpen && !isTransferMenuOpen && !isProjectMenuOpen && !isVolumeMenuOpen) {
      return;
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) {
        return;
      }

      if (transportMenuRef.current && !transportMenuRef.current.contains(targetNode)) {
        setIsTransportMenuOpen(false);
      }

      if (transferMenuRef.current && !transferMenuRef.current.contains(targetNode)) {
        setIsTransferMenuOpen(false);
      }

      if (projectMenuRef.current && !projectMenuRef.current.contains(targetNode)) {
        setIsProjectMenuOpen(false);
      }

      if (volumeMenuRef.current && !volumeMenuRef.current.contains(targetNode)) {
        setIsVolumeMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleWindowMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleWindowMouseDown);
    };
  }, [isProjectMenuOpen, isTransportMenuOpen, isTransferMenuOpen, isVolumeMenuOpen]);

  return (
    <div className={containerClassName}>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div
          ref={transportMenuRef}
          className={`relative min-w-0 ${isTransportMenuOpen ? "z-[2300]" : "z-[2100]"}`}
        >
            <button
              onClick={() => setIsTransportMenuOpen((previous) => !previous)}
              className={`${clearButtonClassName} w-full justify-between sm:w-auto sm:justify-center`}
            >
              {isPlaying ? <Square size={20} /> : <Play size={20} />}
              TRANSPORT
              <ChevronDown size={14} />
            </button>
            {isTransportMenuOpen ? (
              <div className="absolute left-0 right-0 mt-2 z-[2200] min-w-[180px] rounded-md border border-[#a8aba5] bg-[#f6f5ef] shadow-xl p-1 sm:right-auto sm:w-[220px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransportMenuOpen(false);
                    onTogglePlayback();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                >
                  {isPlaying ? <Square size={14} /> : <Play size={14} />}
                  {isPlaying ? "Stop Playback" : "Start Playback"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransportMenuOpen(false);
                    onClearSequence();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                  disabled={isTransferBusy}
                >
                  <RotateCcw size={14} />
                  Clear Project
                </button>
              </div>
            ) : null}
        </div>

        <div
          ref={transferMenuRef}
          className={`relative min-w-0 ${isTransferMenuOpen ? "z-[2300]" : "z-[2100]"}`}
        >
            <button
              onClick={() => setIsTransferMenuOpen((previous) => !previous)}
              className={`${clearButtonClassName} w-full justify-between sm:w-auto sm:justify-center`}
              disabled={isTransferBusy}
            >
              <Download size={20} />
              TRANSFER
              <ChevronDown size={14} />
            </button>
            {isTransferMenuOpen ? (
              <div className="absolute left-0 right-0 mt-2 z-[2200] min-w-[180px] rounded-md border border-[#a8aba5] bg-[#f6f5ef] shadow-xl p-1 sm:left-auto sm:right-0 sm:w-[220px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferMenuOpen(false);
                    importInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                >
                  <Upload size={14} />
                  Import Project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferMenuOpen(false);
                    void runTransferTask(onExportProject, "Project exported.");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                >
                  <Download size={14} />
                  Export Project
                </button>
              </div>
            ) : null}
        </div>

        <div
          ref={projectMenuRef}
          className={`relative min-w-0 ${isProjectMenuOpen ? "z-[2300]" : "z-[2100]"}`}
        >
            <button
              onClick={() => setIsProjectMenuOpen((previous) => !previous)}
              className={`${clearButtonClassName} w-full justify-between sm:w-auto sm:justify-center`}
              disabled={isTransferBusy}
            >
              <span className="truncate sm:max-w-[180px]">
                {selectedProjectName ? `PROJECT: ${selectedProjectName}` : "PROJECTS"}
              </span>
              <ChevronDown size={14} />
            </button>
            {isProjectMenuOpen ? (
              <div className="absolute left-0 right-0 mt-2 z-[2200] min-w-[180px] rounded-md border border-[#a8aba5] bg-[#f6f5ef] shadow-xl p-1 sm:left-auto sm:right-0 sm:min-w-[280px] sm:max-w-[360px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenSaveProjectModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors border-b border-[#bdbab0] mb-1"
                >
                  <Save size={14} />
                  Save Project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onCreateNewProject();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors border-b border-[#bdbab0] mb-1"
                >
                  <FilePlus2 size={14} />
                  New Project
                </button>
                {projectOptions.length > 0 ? (
                  projectOptions.map((projectOption) => {
                    const isActive = projectOption.id === selectedProjectId;
                    return (
                      <div key={projectOption.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectMenuOpen(false);
                            onProjectSelect(projectOption.id);
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded text-xs font-semibold transition-colors ${
                            isActive
                              ? "bg-[#515a6a] text-[#f7f7f5]"
                              : "text-[#515a6a] hover:bg-[#e8e7e1]"
                          }`}
                        >
                          {projectOption.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete project "${projectOption.name}"?`)) {
                              return;
                            }
                            onDeleteProject(projectOption.id);
                          }}
                          className="inline-flex items-center justify-center rounded px-2 py-2 text-[#6a6a6a] hover:bg-[#f0d7d3] hover:text-[#8f3f35] transition-colors"
                          aria-label={`Delete ${projectOption.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-[#6a6a6a]">No saved projects.</div>
                )}
              </div>
            ) : null}
        </div>

        <div
          ref={volumeMenuRef}
          className={`${volumeControlContainerClassName} ${isVolumeMenuOpen ? "z-[2300]" : "z-[2100]"} sm:ml-auto`}
        >
          <button
            type="button"
            onClick={() => setIsVolumeMenuOpen((previous) => !previous)}
            className={`${volumeToggleButtonClassName} w-full justify-center sm:w-auto`}
            aria-label="Toggle master volume"
            aria-expanded={isVolumeMenuOpen}
          >
            {masterVolume <= MASTER_VOLUME_MIN ? (
              <VolumeX size={20} className="text-[#ff8c2b]" />
            ) : (
              <Volume2 size={20} className="text-[#ff8c2b]" />
            )}
            <span className="hidden sm:inline text-[#515a6a]">MASTER</span>
            <span className="text-xs font-bold">{masterVolume}%</span>
          </button>
          {isVolumeMenuOpen ? (
            <div className={volumePopoverClassName}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide text-[#3b3f48]">MASTER VOLUME</span>
                <span className="text-xs font-bold text-[#515a6a]">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min={MASTER_VOLUME_MIN}
                max={MASTER_VOLUME_MAX}
                value={masterVolume}
                onChange={(event) => onMasterVolumeChange(Number(event.target.value))}
                style={createMasterSliderBackgroundStyle(masterVolume)}
                className={`${masterSliderClassName} w-full`}
              />
            </div>
          ) : null}
        </div>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.noodlr-project.zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) {
            return;
          }

          void runTransferTask(() => onImportProject(file), "Project imported.");
        }}
      />
      {transferMessage ? (
        <p className="text-xs text-[#505050] mb-3">{transferMessage}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-[#f6f5ef] rounded-lg p-3 border border-[#b8b5aa]">
          <div className="text-[#5c6270] text-sm font-bold">BPM</div>
          <div className="text-[#515a6a] text-2xl font-extrabold">{bpm}</div>
        </div>
        <div className="bg-[#f6f5ef] rounded-lg p-3 border border-[#b8b5aa]">
          <div className="text-[#5c6270] text-sm font-bold">CLOCK</div>
          <div className="text-[#515a6a] text-2xl font-extrabold">{baseStepLength}</div>
        </div>
        <div className="bg-[#f6f5ef] rounded-lg p-3 border border-[#b8b5aa]">
          <div className="text-[#5c6270] text-sm font-bold">STEP</div>
          <div className="text-[#515a6a] text-2xl font-extrabold">{visibleStep}/{SEQUENCER_STEPS_TOTAL}</div>
        </div>
      </div>
    </div>
  );
};

export default MasterControls;
