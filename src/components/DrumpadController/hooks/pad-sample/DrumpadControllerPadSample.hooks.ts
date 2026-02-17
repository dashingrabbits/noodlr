import { useCallback } from "react";
import { sanitizePadName } from "../../../Drumpad/Drumpad.utilities";
import { writeSavedKitsToSession } from "../../../KitManager/KitManager.utilities";
import type {
PadSampleSettings
} from "../../DrumpadController.types";
import {
clampPadPolyphony,
DEFAULT_PAD_SAMPLE_SETTINGS,
normalizePadSampleSettings,
} from "../../DrumpadController.utilities";

import type {
UsePadSampleHandlersInput,
} from "./DrumpadControllerPadSample.types";

export const usePadSampleHandlers = ({
  editingPadId,
  editingPadSampleId,
  ensureSampleBuffer,
  padSampleSettings,
  sampleAssetsById,
  sampleAssignPadId,
  setEditingPadId,
  setEditingPadSampleBuffer,
  setIsEditingPadSampleBufferLoading,
  setPadEditorSaveMessage,
  setPadLoopEnabled,
  setPadNames,
  setPadPolyphony,
  setPadSampleIds,
  setPadSampleSettings,
  setPadVolumes,
  setSampleAssignPadId,
  setSavedKits,
  stopLoopBufferSourceForPad,
}: UsePadSampleHandlersInput) => {
  const handlePadVolumeChange = useCallback(
    (padId: number, volume: number) => {
      setPadVolumes((previous) => ({
        ...previous,
        [padId]: volume,
      }));
    },
    [setPadVolumes]
  );

  const handlePadPolyphonyChange = useCallback(
    (padId: number, polyphony: number) => {
      setPadPolyphony((previous) => ({
        ...previous,
        [padId]: clampPadPolyphony(polyphony),
      }));
    },
    [setPadPolyphony]
  );

  const handlePadNameChange = useCallback(
    (padId: number, name: string) => {
      setPadNames((previous) => ({
        ...previous,
        [padId]: sanitizePadName(name),
      }));
    },
    [setPadNames]
  );

  const handleOpenPadSampleEditor = useCallback(
    (padId: number) => {
      setPadEditorSaveMessage("");
      setEditingPadId(padId);
    },
    [setEditingPadId, setPadEditorSaveMessage]
  );

  const handleOpenPadSampleAssignModal = useCallback(
    (padId: number) => {
      setSampleAssignPadId(padId);
    },
    [setSampleAssignPadId]
  );

  const handleClosePadSampleAssignModal = useCallback(() => {
    setSampleAssignPadId(null);
  }, [setSampleAssignPadId]);

  const handlePadSampleEditorOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setPadEditorSaveMessage("");
        setEditingPadId(null);
        setEditingPadSampleBuffer(null);
        setIsEditingPadSampleBufferLoading(false);
      }
    },
    [
      setEditingPadId,
      setEditingPadSampleBuffer,
      setIsEditingPadSampleBufferLoading,
      setPadEditorSaveMessage,
    ]
  );

  const handlePadSampleSettingsChange = useCallback(
    (padId: number, nextSettings: Partial<PadSampleSettings>) => {
      setPadSampleSettings((previous) => ({
        ...previous,
        [padId]: normalizePadSampleSettings({
          ...previous[padId],
          ...nextSettings,
        }),
      }));
    },
    [setPadSampleSettings]
  );

  const handleResetPadSampleSettings = useCallback(
    (padId: number) => {
      setPadSampleSettings((previous) => ({
        ...previous,
        [padId]: { ...DEFAULT_PAD_SAMPLE_SETTINGS },
      }));
    },
    [setPadSampleSettings]
  );

  const handleSavePadEditorSettingsToSavedKits = useCallback(() => {
    if (editingPadId === null || !editingPadSampleId) {
      setPadEditorSaveMessage("Assign a sample first.");
      return;
    }

    const currentPadSettings = padSampleSettings[editingPadId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
    const normalizedSettings = normalizePadSampleSettings(currentPadSettings);
    const nowIso = new Date().toISOString();

    setSavedKits((previous) => {
      let updatedKitCount = 0;
      const nextKits = previous.map((kit) => {
        const kitSampleId = kit.state.padSampleIds?.[editingPadId] ?? "";
        if (kitSampleId !== editingPadSampleId) {
          return kit;
        }

        updatedKitCount += 1;
        return {
          ...kit,
          updatedAt: nowIso,
          state: {
            ...kit.state,
            padSampleSettings: {
              ...(kit.state.padSampleSettings ?? {}),
              [editingPadId]: normalizedSettings,
            },
          },
        };
      });

      if (updatedKitCount === 0) {
        setPadEditorSaveMessage("No saved kits currently use this pad sample.");
        return previous;
      }

      const sortedKits = [...nextKits].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
      writeSavedKitsToSession(sortedKits);
      setPadEditorSaveMessage(`Saved to ${updatedKitCount} kit${updatedKitCount > 1 ? "s" : ""}.`);
      return sortedKits;
    });
  }, [
    editingPadId,
    editingPadSampleId,
    padSampleSettings,
    setPadEditorSaveMessage,
    setSavedKits,
  ]);

  const handlePadSampleDrop = useCallback(
    (padId: number, sampleId: string) => {
      const selectedSample = sampleAssetsById.get(sampleId);
      if (!selectedSample) {
        return;
      }

      stopLoopBufferSourceForPad(padId);
      setPadSampleIds((previous) => ({
        ...previous,
        [padId]: sampleId,
      }));

      void ensureSampleBuffer(selectedSample).catch(() => {
        // Buffer warmup failures should not block assignment.
      });
    },
    [ensureSampleBuffer, sampleAssetsById, setPadSampleIds, stopLoopBufferSourceForPad]
  );

  const handleAssignSampleToSelectedPad = useCallback(
    (sampleId: string) => {
      if (sampleAssignPadId === null) {
        return;
      }

      handlePadSampleDrop(sampleAssignPadId, sampleId);
      setSampleAssignPadId(null);
    },
    [handlePadSampleDrop, sampleAssignPadId, setSampleAssignPadId]
  );

  const handlePadSampleClear = useCallback(
    (padId: number) => {
      stopLoopBufferSourceForPad(padId);
      setPadEditorSaveMessage("");
      setPadSampleIds((previous) => ({
        ...previous,
        [padId]: "",
      }));
    },
    [setPadEditorSaveMessage, setPadSampleIds, stopLoopBufferSourceForPad]
  );

  const handlePadLoopToggle = useCallback(
    (padId: number) => {
      setPadLoopEnabled((previous) => {
        const nextEnabled = !(previous[padId] ?? false);
        const nextLoopEnabled = {
          ...previous,
          [padId]: nextEnabled,
        };

        if (!nextEnabled) {
          stopLoopBufferSourceForPad(padId);
        }

        return nextLoopEnabled;
      });
    },
    [setPadLoopEnabled, stopLoopBufferSourceForPad]
  );

  return {
    handleAssignSampleToSelectedPad,
    handleClosePadSampleAssignModal,
    handleOpenPadSampleAssignModal,
    handleOpenPadSampleEditor,
    handlePadLoopToggle,
    handlePadNameChange,
    handlePadPolyphonyChange,
    handlePadSampleClear,
    handlePadSampleDrop,
    handlePadSampleEditorOpenChange,
    handlePadSampleSettingsChange,
    handlePadVolumeChange,
    handleResetPadSampleSettings,
    handleSavePadEditorSettingsToSavedKits,
  };
};

