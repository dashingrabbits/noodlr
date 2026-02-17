import { DRUM_PADS } from "../../DrumpadController.utilities";
import {
  clonePadGroupsState,
  clonePadStepLength,
  clonePadStepOctaves,
  clonePadStepSequence,
  cloneSequencerPatterns,
} from "../pattern";
import { cloneSceneDefinitions, cloneSongArrangement } from "../scene";
import { collectProjectReferencedSampleIds } from "../project";
import type {
  PadSampleSettingsMap,
} from "../../DrumpadController.types";
import type { DrumKitState } from "../../../KitManager/KitManager.types";
import type { ProjectSampleSourceType, ProjectState } from "../../../ProjectManager/ProjectManager.types";
import type {
  DrumKitSnapshotInput,
  NormalizePadSampleSettingsFn,
  PadGroupSnapshotInput,
  ProjectSnapshotInput,
} from "./DrumpadControllerSnapshot.types";

export const createNormalizedPadSampleSettingsMap = (
  padSampleSettings: PadSampleSettingsMap,
  normalizePadSampleSettings: NormalizePadSampleSettingsFn
): PadSampleSettingsMap => {
  return Object.fromEntries(
    DRUM_PADS.map((pad) => [pad.id, normalizePadSampleSettings(padSampleSettings[pad.id])])
  ) as PadSampleSettingsMap;
};

export const createDrumKitStateSnapshot = ({
  normalizePadSampleSettings,
  padLoopEnabled,
  padNames,
  padPolyphony,
  padSampleIds,
  padSampleSettings,
  padVolumes,
}: DrumKitSnapshotInput): DrumKitState => {
  return {
    padVolumes: { ...padVolumes },
    padNames: { ...padNames },
    padPolyphony: { ...padPolyphony },
    padLoopEnabled: { ...padLoopEnabled },
    padSampleIds: { ...padSampleIds },
    padSampleSettings: createNormalizedPadSampleSettingsMap(
      padSampleSettings,
      normalizePadSampleSettings
    ),
  };
};

export const createPadGroupStateSnapshot = ({
  activePatternId,
  normalizePadSampleSettings,
  padLoopEnabled,
  padNames,
  padPolyphony,
  padRowMuted,
  padSampleIds,
  padSampleSettings,
  padStepLength,
  padStepOctaves,
  padStepSequence,
  padVolumes,
  sequencerPatterns,
}: PadGroupSnapshotInput) => {
  return {
    padVolumes: { ...padVolumes },
    padNames: { ...padNames },
    padPolyphony: { ...padPolyphony },
    padLoopEnabled: { ...padLoopEnabled },
    padRowMuted: { ...padRowMuted },
    padSampleIds: { ...padSampleIds },
    padSampleSettings: createNormalizedPadSampleSettingsMap(
      padSampleSettings,
      normalizePadSampleSettings
    ),
    padStepSequence: clonePadStepSequence(padStepSequence),
    padStepOctaves: clonePadStepOctaves(padStepOctaves),
    padStepLength: clonePadStepLength(padStepLength),
    sequencerPatterns: cloneSequencerPatterns(sequencerPatterns),
    activePatternId,
  };
};

export const createProjectStateSnapshot = ({
  activePadGroupId,
  activeSceneId,
  isMetronomeEnabled,
  livePadGroupsState,
  masterVolume,
  normalizePadSampleSettings,
  sampleAssetsById,
  sampleDirectoryHandle,
  sampleRootDir,
  sceneDefinitions,
  sequencerBpm,
  sequencerClockStepLength,
  sequencerPanelMode,
  songArrangement,
}: ProjectSnapshotInput): ProjectState => {
  const nextPadGroups = clonePadGroupsState(livePadGroupsState);
  const activePadGroupState = nextPadGroups[activePadGroupId];
  const sampleSourceType: ProjectSampleSourceType = sampleDirectoryHandle
    ? "directory-handle"
    : sampleRootDir.trim()
      ? "path"
      : "imported";
  const sampleRootDirValue = sampleRootDir.trim();

  const snapshot: ProjectState = {
    masterVolume,
    sampleSourceType,
    sampleRootDir: sampleRootDirValue || undefined,
    sequencerPanelMode,
    sceneDefinitions: cloneSceneDefinitions(sceneDefinitions),
    activeSceneId,
    songArrangement: cloneSongArrangement(songArrangement),
    activePadGroupId,
    padGroups: nextPadGroups,
    padVolumes: { ...activePadGroupState.padVolumes },
    padNames: { ...activePadGroupState.padNames },
    padPolyphony: { ...activePadGroupState.padPolyphony },
    padLoopEnabled: { ...activePadGroupState.padLoopEnabled },
    padRowMuted: { ...activePadGroupState.padRowMuted },
    padSampleIds: { ...activePadGroupState.padSampleIds },
    padSampleSettings: createNormalizedPadSampleSettingsMap(
      activePadGroupState.padSampleSettings,
      normalizePadSampleSettings
    ),
    padStepSequence: clonePadStepSequence(activePadGroupState.padStepSequence),
    padStepOctaves: clonePadStepOctaves(activePadGroupState.padStepOctaves),
    padStepLength: clonePadStepLength(activePadGroupState.padStepLength),
    sequencerPatterns: cloneSequencerPatterns(activePadGroupState.sequencerPatterns),
    activePatternId: activePadGroupState.activePatternId,
    sequencerBpm,
    sequencerClockStepLength,
    isMetronomeEnabled,
  };

  const referencedSampleIds = collectProjectReferencedSampleIds(snapshot);
  snapshot.sampleReferences = referencedSampleIds.map((sampleId) => {
    const sample = sampleAssetsById.get(sampleId);
    return {
      sampleId,
      name: sample?.name || sampleId,
      relativePath: sample?.relativePath,
    };
  });

  return snapshot;
};
