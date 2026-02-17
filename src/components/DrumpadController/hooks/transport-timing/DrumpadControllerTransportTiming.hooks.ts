import { useCallback,useMemo } from "react";
import {
createEmptyStepSequence,
DEFAULT_ROW_STEP_LENGTH,
getStepLengthTickMultiplier,
STEPS_IN_SEQUENCE
} from "../../../StepSequencer/StepSequencer.utilities";
import { PAD_GROUP_IDS } from "../../constants";
import type {
PadGroupState,
SequencerPattern
} from "../../DrumpadController.types";
import { DRUM_PADS } from "../../DrumpadController.utilities";
import { lcm } from "../../helpers/audio";

import type {
SongArrangementTiming,
UseTransportTimingInput,
} from "./DrumpadControllerTransportTiming.types";

export const useTransportTiming = ({
  activeScene,
  basePatternLoopTicks,
  livePadGroupsState,
  sceneDefinitions,
  sequencerEngineStepLength,
  songArrangement,
}: UseTransportTimingInput) => {
  const getPatternLoopTicksForGroup = useCallback(
    (groupState: PadGroupState, pattern: SequencerPattern): number => {
      const rowLoopTicks = DRUM_PADS.map((pad) => {
        const padId = pad.id;
        const assignedSampleId = (groupState.padSampleIds[padId] ?? "").trim();
        const rowSteps = pattern.padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
        const hasActiveSteps = rowSteps.some((stepEnabled) => Boolean(stepEnabled));
        if (!assignedSampleId || !hasActiveSteps) {
          return null;
        }

        const rowStepLength = pattern.padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
        const rowStepTickMultiplier = getStepLengthTickMultiplier(
          rowStepLength,
          sequencerEngineStepLength
        );
        return rowStepTickMultiplier * STEPS_IN_SEQUENCE;
      }).filter((ticks): ticks is number => typeof ticks === "number" && ticks > 0);

      if (!rowLoopTicks.length) {
        return basePatternLoopTicks;
      }

      return rowLoopTicks.reduce((accumulator, ticks) => lcm(accumulator, ticks), rowLoopTicks[0]);
    },
    [basePatternLoopTicks, sequencerEngineStepLength]
  );

  const sceneDurationTicksById = useMemo(() => {
    const durationMap = new Map<string, number>();

    sceneDefinitions.forEach((sceneDefinition) => {
      const selectedPatternLoopTicks = PAD_GROUP_IDS.map((groupId) => {
        const selectedPatternId = sceneDefinition.selectedPatternIdsByGroup[groupId];
        if (!selectedPatternId) {
          return null;
        }

        const groupState = livePadGroupsState[groupId];
        const selectedPattern = groupState.sequencerPatterns.find(
          (pattern) => pattern.id === selectedPatternId
        );
        if (!selectedPattern) {
          return null;
        }

        return getPatternLoopTicksForGroup(groupState, selectedPattern);
      }).filter((ticks): ticks is number => typeof ticks === "number" && ticks > 0);

      const sceneLoopTicks = selectedPatternLoopTicks.length
        ? selectedPatternLoopTicks.reduce(
            (accumulator, ticks) => lcm(accumulator, ticks),
            selectedPatternLoopTicks[0]
          )
        : basePatternLoopTicks;
      durationMap.set(sceneDefinition.id, Math.max(1, sceneLoopTicks));
    });

    return durationMap;
  }, [basePatternLoopTicks, getPatternLoopTicksForGroup, livePadGroupsState, sceneDefinitions]);

  const activeSceneDurationTicks = useMemo(() => {
    if (!activeScene) {
      return basePatternLoopTicks;
    }

    return sceneDurationTicksById.get(activeScene.id) ?? basePatternLoopTicks;
  }, [activeScene, basePatternLoopTicks, sceneDurationTicksById]);

  const songArrangementTiming = useMemo<SongArrangementTiming>(() => {
    if (!songArrangement.length) {
      return {
        totalTicks: basePatternLoopTicks,
        entryDurations: [] as Array<{
          sceneId: string;
          durationTicks: number;
          startTick: number;
          endTick: number;
        }>,
      };
    }

    let cursorTick = 0;
    const entryDurations = songArrangement.map((songEntry) => {
      const durationTicks =
        sceneDurationTicksById.get(songEntry.sceneId) ?? activeSceneDurationTicks;
      const nextDurationTicks = Math.max(1, durationTicks);
      const entry = {
        sceneId: songEntry.sceneId,
        durationTicks: nextDurationTicks,
        startTick: cursorTick,
        endTick: cursorTick + nextDurationTicks,
      };
      cursorTick += nextDurationTicks;
      return entry;
    });

    return {
      totalTicks: Math.max(1, cursorTick),
      entryDurations,
    };
  }, [activeSceneDurationTicks, basePatternLoopTicks, sceneDurationTicksById, songArrangement]);

  return {
    activeSceneDurationTicks,
    sceneDurationTicksById,
    songArrangementTiming,
  };
};

