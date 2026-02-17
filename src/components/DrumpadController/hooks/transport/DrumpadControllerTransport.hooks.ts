import { useCallback,useEffect } from "react";
import {
BASE_SEQUENCER_STEP_LENGTH,
clampSequencerBpm,
createEmptyStepSequence,
DEFAULT_ROW_STEP_LENGTH,
getSequencerStepDurationMs,
getStepLengthTickMultiplier,
STEPS_IN_SEQUENCE
} from "../../../StepSequencer/StepSequencer.utilities";
import {
EMPTY_STEP_OCTAVE_SEQUENCE,
PAD_GROUP_IDS,
RECORD_COUNT_IN_BEATS,
TRANSPORT_SCHEDULE_AHEAD_TIME_SECONDS,
TRANSPORT_SCHEDULER_INTERVAL_MS,
} from "../../constants";
import type {
SceneDefinition
} from "../../DrumpadController.types";
import { DRUM_PADS } from "../../DrumpadController.utilities";
import { getNormalizedStepOctaveSemitoneOffset } from "../../helpers/pattern";

import type {
UseTransportOrchestrationInput
} from "./DrumpadControllerTransport.types";

export const useTransportOrchestration = ({
  activePadGroupIdRef,
  activeSceneDurationTicksRef,
  activeSceneRef,
  basePatternLoopTicks,
  clearScheduledTickVisualTimeouts,
  countInTimeoutsRef,
  currentTickRef,
  flashPadVisual,
  getAudioContext,
  isCountInActiveRef,
  isMetronomeEnabledRef,
  isPlaying,
  isPlayingRef,
  isRecording,
  isRecordingRef,
  livePadGroupsStateRef,
  masterVolume,
  masterVolumeRef,
  padRowMutedRef,
  padSampleIdsRef,
  padStepLengthRef,
  padStepOctavesRef,
  padStepSequenceRef,
  playAssignedSampleRef,
  playbackSessionId,
  playSceneAssignedSample,
  sceneDefinitionsByIdRef,
  scheduleMetronomeTone,
  scheduledTickVisualTimeoutsRef,
  sequencerBpm,
  sequencerClockStepLength,
  sequencerEngineStepLength,
  sequencerPanelModeRef,
  setCountInBeatsRemaining,
  setCurrentSongEntryIndex,
  setCurrentSongEntryProgress,
  setCurrentStep,
  setIsPlaying,
  setPlaybackSessionId,
  songArrangementTimingRef,
  stopAllLoopBufferSources,
  stopAllMetronomeSources,
  stopAllOneShotBufferSources,
  stopPreviewBufferSource,
}: UseTransportOrchestrationInput) => {
  const clearCountInTimeouts = useCallback(() => {
    countInTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    countInTimeoutsRef.current = [];
  }, [countInTimeoutsRef]);

  const cancelCountIn = useCallback(() => {
    isCountInActiveRef.current = false;
    clearCountInTimeouts();
    stopAllMetronomeSources();
    setCountInBeatsRemaining(null);
  }, [
    clearCountInTimeouts,
    isCountInActiveRef,
    setCountInBeatsRemaining,
    stopAllMetronomeSources,
  ]);

  const startRecordCountIn = useCallback(() => {
    if (isCountInActiveRef.current || isPlayingRef.current) {
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    const startCountInScheduler = () => {
      if (isCountInActiveRef.current || isPlayingRef.current || !isRecordingRef.current) {
        return;
      }

      clearCountInTimeouts();
      stopAllMetronomeSources();
      currentTickRef.current = 0;
      setCurrentStep(0);
      isCountInActiveRef.current = true;
      setCountInBeatsRemaining(RECORD_COUNT_IN_BEATS);

      const beatDurationSeconds = 60 / clampSequencerBpm(sequencerBpm);
      const startTimeSeconds = context.currentTime + 0.04;
      const metronomeGainLevel = Math.max(0.02, (masterVolume / 100) * 0.24);

      for (let beatIndex = 0; beatIndex < RECORD_COUNT_IN_BEATS; beatIndex += 1) {
        const beatTimeSeconds = startTimeSeconds + beatIndex * beatDurationSeconds;
        scheduleMetronomeTone(
          context,
          beatTimeSeconds,
          beatIndex === 0,
          beatIndex === 0 ? metronomeGainLevel : metronomeGainLevel * 0.8
        );

        const displayCountdownValue = RECORD_COUNT_IN_BEATS - beatIndex;
        const updateTimeoutId = window.setTimeout(
          () => {
            if (!isCountInActiveRef.current) {
              return;
            }
            setCountInBeatsRemaining(displayCountdownValue);
          },
          Math.max(0, (beatTimeSeconds - context.currentTime) * 1000)
        );
        countInTimeoutsRef.current.push(updateTimeoutId);
      }

      const startPlaybackTimeoutId = window.setTimeout(
        () => {
          if (!isCountInActiveRef.current || !isRecordingRef.current) {
            return;
          }

          isCountInActiveRef.current = false;
          clearCountInTimeouts();
          stopAllMetronomeSources();
          setCountInBeatsRemaining(null);
          currentTickRef.current = 0;
          setCurrentStep(0);
          setIsPlaying(true);
        },
        Math.max(
          0,
          (startTimeSeconds + RECORD_COUNT_IN_BEATS * beatDurationSeconds - context.currentTime) *
            1000
        )
      );
      countInTimeoutsRef.current.push(startPlaybackTimeoutId);
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(() => {
          startCountInScheduler();
        })
        .catch(() => {
          // Ignore resume failures; next interaction can retry.
        });
      return;
    }

    startCountInScheduler();
  }, [
    clearCountInTimeouts,
    countInTimeoutsRef,
    currentTickRef,
    getAudioContext,
    isCountInActiveRef,
    isPlayingRef,
    isRecordingRef,
    masterVolume,
    scheduleMetronomeTone,
    sequencerBpm,
    setCountInBeatsRemaining,
    setCurrentStep,
    setIsPlaying,
    stopAllMetronomeSources,
  ]);

  const stopTransportPlayback = useCallback(() => {
    if (isCountInActiveRef.current) {
      cancelCountIn();
    }

    setIsPlaying(false);
    stopAllLoopBufferSources();
    stopAllOneShotBufferSources();
    stopAllMetronomeSources();
    stopPreviewBufferSource();
    clearScheduledTickVisualTimeouts();
    currentTickRef.current = 0;
    setCurrentStep(0);
    setCurrentSongEntryIndex(null);
    setCurrentSongEntryProgress(null);
  }, [
    cancelCountIn,
    clearScheduledTickVisualTimeouts,
    currentTickRef,
    isCountInActiveRef,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    setIsPlaying,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  ]);

  const handleTogglePlayback = useCallback(() => {
    if (isCountInActiveRef.current) {
      stopTransportPlayback();
      return;
    }

    if (isPlayingRef.current) {
      stopTransportPlayback();
      return;
    }

    if (isMetronomeEnabledRef.current && isRecordingRef.current) {
      startRecordCountIn();
      return;
    }

    currentTickRef.current = 0;
    setCurrentStep(0);
    setIsPlaying(true);
  }, [
    currentTickRef,
    isCountInActiveRef,
    isMetronomeEnabledRef,
    isPlayingRef,
    isRecordingRef,
    setCurrentStep,
    setIsPlaying,
    startRecordCountIn,
    stopTransportPlayback,
  ]);

  const restartTransportFromStart = useCallback(() => {
    cancelCountIn();
    stopAllLoopBufferSources();
    stopAllOneShotBufferSources();
    stopAllMetronomeSources();
    stopPreviewBufferSource();
    clearScheduledTickVisualTimeouts();
    currentTickRef.current = 0;
    setCurrentStep(0);
    setCurrentSongEntryIndex(null);
    setPlaybackSessionId((previous) => previous + 1);
  }, [
    cancelCountIn,
    clearScheduledTickVisualTimeouts,
    currentTickRef,
    setCurrentSongEntryIndex,
    setCurrentStep,
    setPlaybackSessionId,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopPreviewBufferSource,
  ]);

  useEffect(() => {
    if (!isPlaying) {
      clearScheduledTickVisualTimeouts();
      setCurrentSongEntryIndex(null);
      setCurrentSongEntryProgress(null);
      return;
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    let cancelled = false;
    let schedulerIntervalId: number | null = null;
    let nextTick = 0;
    let nextTickTimeSeconds = 0;
    const clockRateMultiplier = getStepLengthTickMultiplier(
      sequencerClockStepLength,
      BASE_SEQUENCER_STEP_LENGTH
    );
    const metronomeTicksPerBeat = getStepLengthTickMultiplier("1/4", sequencerClockStepLength);
    const metronomeTicksPerBar = metronomeTicksPerBeat * 4;
    const secondsPerTick =
      (getSequencerStepDurationMs(sequencerBpm, sequencerEngineStepLength) / 1000) *
      clockRateMultiplier;

    const resolveScenePlaybackContext = (tick: number) => {
      const panelMode = sequencerPanelModeRef.current;
      const currentActiveScene = activeSceneRef.current;
      const currentSongArrangementTiming = songArrangementTimingRef.current;
      const currentSceneDefinitionsById = sceneDefinitionsByIdRef.current;
      const currentActiveSceneDurationTicks = activeSceneDurationTicksRef.current;

      if (panelMode === "sequencer") {
        return {
          sceneDefinition: null as SceneDefinition | null,
          songEntryIndex: null as number | null,
          sceneTick: tick,
          sceneDurationTicks: basePatternLoopTicks,
        };
      }

      if (!currentActiveScene) {
        return {
          sceneDefinition: null as SceneDefinition | null,
          songEntryIndex: null as number | null,
          sceneTick: tick,
          sceneDurationTicks: basePatternLoopTicks,
        };
      }

      if (panelMode === "song" && currentSongArrangementTiming.entryDurations.length > 0) {
        const safeSongTick = tick % Math.max(1, currentSongArrangementTiming.totalTicks);
        const songEntryIndex = currentSongArrangementTiming.entryDurations.findIndex(
          (songEntryTiming) =>
            safeSongTick >= songEntryTiming.startTick && safeSongTick < songEntryTiming.endTick
        );
        const fallbackSongEntryTiming = currentSongArrangementTiming.entryDurations[0];
        const targetSongEntryTiming =
          currentSongArrangementTiming.entryDurations[songEntryIndex] ?? fallbackSongEntryTiming;
        const targetSongEntryIndex = songEntryIndex >= 0 ? songEntryIndex : 0;
        const songScene =
          currentSceneDefinitionsById.get(targetSongEntryTiming.sceneId) ?? currentActiveScene;
        return {
          sceneDefinition: songScene,
          songEntryIndex: targetSongEntryIndex,
          sceneTick: safeSongTick - targetSongEntryTiming.startTick,
          sceneDurationTicks: targetSongEntryTiming.durationTicks,
        };
      }

      return {
        sceneDefinition: currentActiveScene,
        songEntryIndex: null as number | null,
        sceneTick: tick % Math.max(1, currentActiveSceneDurationTicks),
        sceneDurationTicks: Math.max(1, currentActiveSceneDurationTicks),
      };
    };

    const scheduleTickPlayback = (tick: number, tickTimeSeconds: number) => {
      const panelMode = sequencerPanelModeRef.current;
      if (isMetronomeEnabledRef.current && tick % metronomeTicksPerBeat === 0) {
        const isAccentTick = tick % metronomeTicksPerBar === 0;
        const metronomeGainLevel = Math.max(0.02, (masterVolumeRef.current / 100) * 0.24);
        scheduleMetronomeTone(
          context,
          tickTimeSeconds,
          isAccentTick,
          isAccentTick ? metronomeGainLevel : metronomeGainLevel * 0.8
        );
      }

      const triggeredPadIds: number[] = [];
      const playbackContext = resolveScenePlaybackContext(tick);
      if (panelMode === "sequencer" || !playbackContext.sceneDefinition) {
        Object.entries(padStepSequenceRef.current).forEach(([padIdRaw, steps]) => {
          const padId = Number(padIdRaw);
          if (padRowMutedRef.current[padId]) {
            return;
          }
          const rowStepLength = padStepLengthRef.current[padId] ?? DEFAULT_ROW_STEP_LENGTH;
          const rowStepTickMultiplier = getStepLengthTickMultiplier(
            rowStepLength,
            sequencerEngineStepLength
          );
          if (tick % rowStepTickMultiplier !== 0) {
            return;
          }

          const rowStepIndex = Math.floor(tick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
          if (!steps[rowStepIndex]) {
            return;
          }
          const rowStepOctaves = padStepOctavesRef.current[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
          const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
            rowStepOctaves[rowStepIndex]
          );

          const assignedSampleId = padSampleIdsRef.current[padId] ?? "";
          if (!assignedSampleId) {
            return;
          }

          playAssignedSampleRef.current(padId, tickTimeSeconds, transposeSemitoneOffset);
          triggeredPadIds.push(padId);
        });
      } else {
        const currentLivePadGroupsState = livePadGroupsStateRef.current;
        PAD_GROUP_IDS.forEach((groupId) => {
          const groupState = currentLivePadGroupsState[groupId];
          const selectedPatternId = playbackContext.sceneDefinition?.selectedPatternIdsByGroup[groupId];
          if (!selectedPatternId) {
            return;
          }
          const selectedPattern = groupState.sequencerPatterns.find(
            (pattern) => pattern.id === selectedPatternId
          );
          if (!selectedPattern) {
            return;
          }

          DRUM_PADS.forEach((pad) => {
            const padId = pad.id;
            if (groupState.padRowMuted[padId]) {
              return;
            }

            const rowStepLength = selectedPattern.padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
            const rowStepTickMultiplier = getStepLengthTickMultiplier(
              rowStepLength,
              sequencerEngineStepLength
            );
            if (playbackContext.sceneTick % rowStepTickMultiplier !== 0) {
              return;
            }

            const rowStepIndex =
              Math.floor(playbackContext.sceneTick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
            const rowSteps =
              selectedPattern.padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
            if (!rowSteps[rowStepIndex]) {
              return;
            }

            const rowStepOctaves =
              selectedPattern.padStepOctaves[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
            const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
              rowStepOctaves[rowStepIndex]
            );
            playSceneAssignedSample(
              groupId,
              groupState,
              padId,
              tickTimeSeconds,
              transposeSemitoneOffset
            );
            if (groupId === activePadGroupIdRef.current) {
              triggeredPadIds.push(padId);
            }
          });
        });
      }

      const visualDelayMs = Math.max(0, (tickTimeSeconds - context.currentTime) * 1000);
      const timeoutId = window.setTimeout(() => {
        if (cancelled || !isPlayingRef.current) {
          return;
        }

        triggeredPadIds.forEach((padId) => {
          flashPadVisual(padId);
        });
        const visualTick = panelMode === "sequencer" ? tick : playbackContext.sceneTick;
        currentTickRef.current = visualTick;
        setCurrentStep(visualTick);
        setCurrentSongEntryIndex(playbackContext.songEntryIndex);
        if (panelMode === "song" && playbackContext.songEntryIndex !== null) {
          setCurrentSongEntryProgress(
            Math.max(
              0,
              Math.min(1, playbackContext.sceneTick / Math.max(1, playbackContext.sceneDurationTicks))
            )
          );
        } else {
          setCurrentSongEntryProgress(null);
        }
      }, visualDelayMs);

      scheduledTickVisualTimeoutsRef.current.push(timeoutId);
    };

    const runScheduler = () => {
      if (cancelled) {
        return;
      }

      while (nextTickTimeSeconds < context.currentTime + TRANSPORT_SCHEDULE_AHEAD_TIME_SECONDS) {
        scheduleTickPlayback(nextTick, nextTickTimeSeconds);
        nextTick += 1;
        nextTickTimeSeconds += secondsPerTick;
      }
    };

    const startScheduler = () => {
      if (cancelled) {
        return;
      }

      const resumeTick = Math.max(0, currentTickRef.current);
      clearScheduledTickVisualTimeouts();
      setCurrentStep(resumeTick);
      nextTick = resumeTick;
      nextTickTimeSeconds = context.currentTime + 0.02;
      runScheduler();
      schedulerIntervalId = window.setInterval(runScheduler, TRANSPORT_SCHEDULER_INTERVAL_MS);
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(() => {
          startScheduler();
        })
        .catch(() => {
          // Ignore resume failures; next interaction can retry.
        });
    } else {
      startScheduler();
    }

    return () => {
      cancelled = true;
      if (schedulerIntervalId) {
        window.clearInterval(schedulerIntervalId);
      }
      stopAllMetronomeSources();
      clearScheduledTickVisualTimeouts();
    };
  }, [
    activePadGroupIdRef,
    activeSceneDurationTicksRef,
    activeSceneRef,
    basePatternLoopTicks,
    clearScheduledTickVisualTimeouts,
    currentTickRef,
    flashPadVisual,
    getAudioContext,
    isMetronomeEnabledRef,
    isPlaying,
    isPlayingRef,
    livePadGroupsStateRef,
    masterVolumeRef,
    padRowMutedRef,
    padSampleIdsRef,
    padStepLengthRef,
    padStepOctavesRef,
    padStepSequenceRef,
    playAssignedSampleRef,
    playbackSessionId,
    playSceneAssignedSample,
    sceneDefinitionsByIdRef,
    scheduleMetronomeTone,
    scheduledTickVisualTimeoutsRef,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerEngineStepLength,
    sequencerPanelModeRef,
    setCurrentSongEntryIndex,
    setCurrentSongEntryProgress,
    setCurrentStep,
    songArrangementTimingRef,
    stopAllMetronomeSources,
  ]);

  useEffect(() => {
    if (!isRecording && isCountInActiveRef.current) {
      cancelCountIn();
    }
  }, [cancelCountIn, isCountInActiveRef, isRecording]);

  return {
    cancelCountIn,
    clearCountInTimeouts,
    handleTogglePlayback,
    restartTransportFromStart,
    stopTransportPlayback,
  };
};

