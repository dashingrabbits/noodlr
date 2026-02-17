import { ChevronDown, Download, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KitManagerProps } from "./KitManager.types";
import {
  containerClassName,
  kitListClassName,
  modalContainerClassName,
  modalInputClassName,
  modalOverlayClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./KitManager.styles";
import { KIT_NAME_MAX_LENGTH, sanitizeKitName } from "./KitManager.utilities";

const KitManager = ({
  kits,
  onSaveKit,
  onLoadKit,
  onExportKit,
  onImportKit,
  embedded = false,
}: KitManagerProps) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [kitNameDraft, setKitNameDraft] = useState("");
  const [isTransferBusy, setIsTransferBusy] = useState(false);
  const [isTransferMenuOpen, setIsTransferMenuOpen] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const transferMenuRef = useRef<HTMLDivElement | null>(null);

  const hasKits = kits.length > 0;
  const sortedKits = useMemo(() => {
    return [...kits].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [kits]);

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
          : "Kit transfer failed.";
      setTransferMessage(message);
    } finally {
      setIsTransferBusy(false);
    }
  };

  useEffect(() => {
    if (!isTransferMenuOpen) {
      return;
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node | null;
      if (!transferMenuRef.current || !targetNode) {
        return;
      }

      if (!transferMenuRef.current.contains(targetNode)) {
        setIsTransferMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleWindowMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleWindowMouseDown);
    };
  }, [isTransferMenuOpen]);

  return (
    <>
      <div className={embedded ? "min-w-0" : containerClassName}>
        <div
          className={
            embedded
              ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              : "flex items-center justify-between gap-3"
          }
        >
          <div>
            <h3 className="text-[#515a6a] text-sm font-extrabold tracking-wide">KITS</h3>
            <p className="text-xs text-[#575757]">
              {hasKits ? `${kits.length} saved` : "No saved kits yet"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div ref={transferMenuRef} className="relative z-[2100]">
              <button
                type="button"
                className={secondaryButtonClassName}
                disabled={isTransferBusy}
                onClick={() => setIsTransferMenuOpen((previous) => !previous)}
              >
                <span className="inline-flex items-center gap-1">
                  <Download size={14} />
                  Transfer
                  <ChevronDown size={14} />
                </span>
              </button>
              {isTransferMenuOpen ? (
                <div className="absolute right-0 mt-2 z-[2200] min-w-[160px] rounded-md border border-[#a8aba5] bg-[#f6f5ef] shadow-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferMenuOpen(false);
                      importInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                  >
                    <Upload size={14} />
                    Import Kit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferMenuOpen(false);
                      void runTransferTask(onExportKit, "Kit exported.");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs font-bold text-[#515a6a] hover:bg-[#e8e7e1] transition-colors"
                  >
                    <Download size={14} />
                    Export Kit
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={primaryButtonClassName}
              disabled={isTransferBusy}
              onClick={() => setIsSaveModalOpen(true)}
            >
              Save Kit
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              disabled={isTransferBusy}
              onClick={() => setIsLoadModalOpen(true)}
            >
              Load Kit
            </button>
          </div>
        </div>
        {transferMessage ? (
          <p className="mt-2 text-xs text-[#555]">{transferMessage}</p>
        ) : null}
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.noodlr-kit.zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) {
            return;
          }

          void runTransferTask(() => onImportKit(file), "Kit imported.");
        }}
      />

      {isSaveModalOpen ? (
        <div className={modalOverlayClassName} role="dialog" aria-modal="true" aria-label="Save kit">
          <div className={modalContainerClassName}>
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Save Kit</h4>
            <p className="text-xs text-[#666] mb-3">Enter a name for this kit.</p>
            <input
              autoFocus
              type="text"
              maxLength={KIT_NAME_MAX_LENGTH}
              value={kitNameDraft}
              onChange={(event) => setKitNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const kitName = sanitizeKitName(kitNameDraft);
                  if (!kitName) {
                    return;
                  }
                  onSaveKit(kitName);
                  setKitNameDraft("");
                  setIsSaveModalOpen(false);
                }

                if (event.key === "Escape") {
                  setIsSaveModalOpen(false);
                }
              }}
              className={modalInputClassName}
              placeholder="My Kit"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={() => {
                  const kitName = sanitizeKitName(kitNameDraft);
                  if (!kitName) {
                    return;
                  }
                  onSaveKit(kitName);
                  setKitNameDraft("");
                  setIsSaveModalOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoadModalOpen ? (
        <div className={modalOverlayClassName} role="dialog" aria-modal="true" aria-label="Load kit">
          <div className={modalContainerClassName}>
            <h4 className="text-[#515a6a] text-base font-bold mb-2">Load Kit</h4>
            <p className="text-xs text-[#666] mb-3">Select a saved kit.</p>
            {sortedKits.length > 0 ? (
              <div className={kitListClassName}>
                {sortedKits.map((kit) => (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => {
                      onLoadKit(kit.id);
                      setIsLoadModalOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#dde0dd] transition-colors"
                  >
                    <div className="text-sm text-[#515a6a] font-bold truncate">{kit.name}</div>
                    <div className="text-[11px] text-[#666]">
                      {new Date(kit.updatedAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#aaa79d] bg-[#fbfaf6] p-4 text-xs text-[#666]">
                No kits saved in this session.
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => setIsLoadModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default KitManager;
