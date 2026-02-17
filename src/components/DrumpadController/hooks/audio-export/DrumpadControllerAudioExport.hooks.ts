import { useCallback } from "react";
import { OCTAVE_TRANSPOSE_SEMITONES } from "../../../KeyboardTranspose/KeyboardTranspose.utilities";
import { encodeAudioBufferToWav } from "../../../KitManager/KitManager.utilities";
import { sanitizeProjectName } from "../../../ProjectManager/ProjectManager.utilities";
import {
BASE_SEQUENCER_STEP_LENGTH,
createEmptyStepSequence,
DEFAULT_ROW_STEP_LENGTH,
getSequencerStepDurationMs,
getStepLengthTickMultiplier,
STEPS_IN_SEQUENCE
} from "../../../StepSequencer/StepSequencer.utilities";
import {
EMPTY_STEP_OCTAVE_SEQUENCE,
PAD_GROUP_IDS,
VOICE_STOP_FADE_SECONDS,
} from "../../constants";
import type {
PadGroupId,
PadGroupState,
SequencerPattern
} from "../../DrumpadController.types";
import {
DEFAULT_PAD_SAMPLE_SETTINGS,
DEFAULT_PAD_VOLUME,
DRUM_PADS,
} from "../../DrumpadController.utilities";
import {
createOfflineRenderOutputCompressor,
createOfflineRenderVoiceGainNodeFactory,
getSamplePlaybackBounds,
lcm,
} from "../../helpers/audio";
import { getNormalizedStepOctaveSemitoneOffset } from "../../helpers/pattern";

import type {
UseDrumpadAudioExportHandlersInput
} from "./DrumpadControllerAudioExport.types";

export const useDrumpadAudioExportHandlers = ({
  activePatternId,
  ensureSampleBuffer,
  isExportingSong,
  livePadGroupsState,
  masterVolume,
  padLoopEnabled,
  padNames,
  padRowMuted,
  padSampleIds,
  padSampleSettings,
  padStepLength,
  padStepOctaves,
  padStepSequence,
  padVolumes,
  patternOptions,
  sampleAssetsById,
  sampleBufferCacheRef,
  sceneDefinitionsById,
  selectedProject,
  sequencerBpm,
  sequencerClockStepLength,
  sequencerEngineStepLength,
  setIsExportingSong,
  setSongModeStatusMessage,
  songArrangementTiming,
}: UseDrumpadAudioExportHandlersInput) => {
  const renderSequencerSelectionToAudioBuffer = useCallback(
    async (padIds: number[], respectRowMute: boolean): Promise<AudioBuffer> => {
      const uniquePadIds = Array.from(new Set(padIds));
      const assignedPadIds = uniquePadIds.filter((padId) => {
        const assignedSampleId = (padSampleIds[padId] ?? "").trim();
        return Boolean(assignedSampleId);
      });

      if (!assignedPadIds.length) {
        throw new Error("No assigned samples available to export.");
      }

      const sequencePadIds = assignedPadIds.filter((padId) => {
        if (!respectRowMute) {
          const steps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
          return steps.some((stepEnabled) => stepEnabled);
        }

        const steps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
        if (!steps.some((stepEnabled) => stepEnabled)) {
          return false;
        }

        return !(padRowMuted[padId] ?? false);
      });

      if (!sequencePadIds.length) {
        if (respectRowMute) {
          throw new Error("All selected rows are muted or have no active steps.");
        }
        throw new Error("No active sequencer steps to export.");
      }

      const rowLoopTicksByPad = sequencePadIds.map((padId) => {
        const rowStepLength = padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
        const rowStepTickMultiplier = getStepLengthTickMultiplier(
          rowStepLength,
          sequencerEngineStepLength
        );
        return rowStepTickMultiplier * STEPS_IN_SEQUENCE;
      });
      const patternLoopTicks = rowLoopTicksByPad.reduce(
        (loopTickCount, rowLoopTicks) => lcm(loopTickCount, rowLoopTicks),
        1
      );

      const secondsPerTick =
        getSequencerStepDurationMs(sequencerBpm, sequencerEngineStepLength) / 1000;
      const patternDurationSeconds = patternLoopTicks * secondsPerTick;

      const maxReleaseSeconds = Math.max(
        0,
        ...sequencePadIds.map((padId) => {
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          return Math.max(0, sampleSettings.releaseMs / 1000);
        })
      );
      const maxDelayTailSeconds = Math.max(
        0,
        ...sequencePadIds.map((padId) => {
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          if (sampleSettings.delayMix <= 0.001) {
            return 0;
          }

          const safeFeedback = Math.max(0, Math.min(0.95, sampleSettings.delayFeedback));
          const feedbackMultiplier = Math.max(1, Math.min(12, 1 / (1 - safeFeedback)));
          return (sampleSettings.delayTimeMs / 1000) * feedbackMultiplier;
        })
      );
      const tailSeconds = Math.min(
        8,
        Math.max(0.2, maxReleaseSeconds + maxDelayTailSeconds + 0.05)
      );
      const totalDurationSeconds = patternDurationSeconds + tailSeconds + 0.05;

      const bufferedSamplesByPad = new Map<number, AudioBuffer>();

      for (const padId of sequencePadIds) {
        const assignedSampleId = (padSampleIds[padId] ?? "").trim();
        const assignedSample = sampleAssetsById.get(assignedSampleId);
        if (!assignedSample) {
          continue;
        }

        const sampleBuffer =
          sampleBufferCacheRef.current.get(assignedSample.id) ??
          (await ensureSampleBuffer(assignedSample));
        if (sampleBuffer) {
          bufferedSamplesByPad.set(padId, sampleBuffer);
        }
      }

      if (!bufferedSamplesByPad.size) {
        throw new Error("Unable to load sample audio for export.");
      }

      const sampleRate = 44100;
      const offlineContext = new OfflineAudioContext(
        2,
        Math.max(1, Math.ceil(totalDurationSeconds * sampleRate)),
        sampleRate
      );
      const outputCompressor = createOfflineRenderOutputCompressor(offlineContext);
      const createRenderVoiceGainNode = createOfflineRenderVoiceGainNodeFactory(
        offlineContext,
        outputCompressor
      );

      type RenderLoopVoice = {
        source: AudioBufferSourceNode;
        gainNode: GainNode;
        releaseSeconds: number;
      };

      const activeLoopVoices = new Map<number, RenderLoopVoice>();

      const stopLoopVoice = (voice: RenderLoopVoice, stopTime: number) => {
        const safeStopTime = Math.max(0, stopTime);
        const fadeSeconds = Math.max(VOICE_STOP_FADE_SECONDS, voice.releaseSeconds);
        voice.gainNode.gain.cancelScheduledValues(safeStopTime);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, safeStopTime);
        voice.gainNode.gain.linearRampToValueAtTime(0, safeStopTime + fadeSeconds);
        voice.source.stop(safeStopTime + fadeSeconds + 0.001);
      };

      for (let tick = 0; tick < patternLoopTicks; tick += 1) {
        for (const padId of sequencePadIds) {
          const sampleBuffer = bufferedSamplesByPad.get(padId);
          if (!sampleBuffer) {
            continue;
          }

          const rowStepLength = padStepLength[padId] ?? DEFAULT_ROW_STEP_LENGTH;
          const rowStepTickMultiplier = getStepLengthTickMultiplier(
            rowStepLength,
            sequencerEngineStepLength
          );
          if (tick % rowStepTickMultiplier !== 0) {
            continue;
          }

          const rowStepIndex = Math.floor(tick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
          const rowSteps = padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
          if (!rowSteps[rowStepIndex]) {
            continue;
          }
          const rowStepOctaves = padStepOctaves[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
          const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
            rowStepOctaves[rowStepIndex]
          );
          const playbackRate = Math.pow(
            2,
            transposeSemitoneOffset / OCTAVE_TRANSPOSE_SEMITONES
          );

          const eventTimeSeconds = tick * secondsPerTick;
          const padVolume = padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
          const outputGain = Math.max(
            0,
            Math.min(1, (masterVolume / 100) * (padVolume / 100))
          );
          const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          const isLoopEnabled = padLoopEnabled[padId] ?? false;

          if (isLoopEnabled) {
            const existingLoopVoice = activeLoopVoices.get(padId);
            if (existingLoopVoice) {
              stopLoopVoice(existingLoopVoice, eventTimeSeconds);
              activeLoopVoices.delete(padId);
            }

            const source = offlineContext.createBufferSource();
            source.buffer = sampleBuffer;
            source.loop = true;
            source.playbackRate.value = playbackRate;
            const playbackBounds = getSamplePlaybackBounds(sampleBuffer, sampleSettings);
            source.loopStart = playbackBounds.offsetSeconds;
            source.loopEnd = playbackBounds.endOffsetSeconds;

            const gainNode = createRenderVoiceGainNode(sampleSettings);
            const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
            const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
            const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
            const sustainGain = outputGain * sustainLevel;

            gainNode.gain.cancelScheduledValues(eventTimeSeconds);
            if (attackSeconds > 0) {
              gainNode.gain.setValueAtTime(0, eventTimeSeconds);
              gainNode.gain.linearRampToValueAtTime(outputGain, eventTimeSeconds + attackSeconds);
            } else {
              gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
            }
            if (decaySeconds > 0) {
              gainNode.gain.linearRampToValueAtTime(
                sustainGain,
                eventTimeSeconds + attackSeconds + decaySeconds
              );
            } else {
              gainNode.gain.setValueAtTime(sustainGain, eventTimeSeconds + attackSeconds);
            }

            source.connect(gainNode);
            source.start(eventTimeSeconds, playbackBounds.offsetSeconds);
            activeLoopVoices.set(padId, {
              source,
              gainNode,
              releaseSeconds: Math.max(0, sampleSettings.releaseMs / 1000),
            });
            continue;
          }

          const source = offlineContext.createBufferSource();
          source.buffer = sampleBuffer;
          source.playbackRate.value = playbackRate;
          const playbackBounds = getSamplePlaybackBounds(sampleBuffer, sampleSettings);

          const gainNode = createRenderVoiceGainNode(sampleSettings);
          const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
          const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
          const releaseSeconds = Math.max(0, sampleSettings.releaseMs / 1000);
          const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
          const sustainGain = outputGain * sustainLevel;
          const attackEndTime = eventTimeSeconds + attackSeconds;
          const decayEndTime = attackEndTime + decaySeconds;
          const naturalEndTime = eventTimeSeconds + playbackBounds.durationSeconds / playbackRate;

          gainNode.gain.cancelScheduledValues(eventTimeSeconds);
          if (attackSeconds > 0) {
            gainNode.gain.setValueAtTime(0, eventTimeSeconds);
            gainNode.gain.linearRampToValueAtTime(outputGain, attackEndTime);
          } else {
            gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
          }

          if (decaySeconds > 0) {
            gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
          } else {
            gainNode.gain.setValueAtTime(sustainGain, attackEndTime);
          }

          if (releaseSeconds > 0) {
            const releaseStartTime = Math.max(decayEndTime, naturalEndTime - releaseSeconds);
            gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
            gainNode.gain.linearRampToValueAtTime(0, naturalEndTime);
          }

          source.connect(gainNode);
          source.start(eventTimeSeconds, playbackBounds.offsetSeconds, playbackBounds.durationSeconds);
        }
      }

      activeLoopVoices.forEach((voice) => {
        stopLoopVoice(voice, patternDurationSeconds);
      });
      activeLoopVoices.clear();

      return offlineContext.startRendering();
    },
    [
      ensureSampleBuffer,
      masterVolume,
      padLoopEnabled,
      padRowMuted,
      padSampleIds,
      padSampleSettings,
      padStepLength,
      padStepOctaves,
      padStepSequence,
      padVolumes,
      sampleAssetsById,
      sampleBufferCacheRef,
      sequencerBpm,
      sequencerEngineStepLength,
    ]
  );

  const renderSongArrangementToAudioBuffer = useCallback(async (): Promise<AudioBuffer> => {
    if (!songArrangementTiming.entryDurations.length) {
      throw new Error("No scenes in song timeline to export.");
    }

    type SongRenderGroup = {
      groupId: PadGroupId;
      groupState: PadGroupState;
      selectedPattern: SequencerPattern;
    };

    type SongRenderEntry = {
      startTick: number;
      durationTicks: number;
      groups: SongRenderGroup[];
    };

    const songEntriesForRender: SongRenderEntry[] = songArrangementTiming.entryDurations.map(
      (entryTiming) => {
        const sceneDefinition = sceneDefinitionsById.get(entryTiming.sceneId);
        if (!sceneDefinition) {
          return {
            startTick: entryTiming.startTick,
            durationTicks: entryTiming.durationTicks,
            groups: [],
          };
        }

        const groups = PAD_GROUP_IDS.map((groupId) => {
          const groupState = livePadGroupsState[groupId];
          const selectedPatternId = sceneDefinition.selectedPatternIdsByGroup[groupId];
          if (!selectedPatternId) {
            return null;
          }

          const selectedPattern = groupState.sequencerPatterns.find(
            (pattern) => pattern.id === selectedPatternId
          );
          if (!selectedPattern) {
            return null;
          }

          return {
            groupId,
            groupState,
            selectedPattern,
          } satisfies SongRenderGroup;
        }).filter((group): group is SongRenderGroup => Boolean(group));

        return {
          startTick: entryTiming.startTick,
          durationTicks: entryTiming.durationTicks,
          groups,
        };
      }
    );

    const sampleIdsInSong = new Set<string>();
    let maxReleaseSeconds = 0;
    let maxDelayTailSeconds = 0;

    songEntriesForRender.forEach((entry) => {
      entry.groups.forEach(({ groupState, selectedPattern }) => {
        DRUM_PADS.forEach((pad) => {
          const padId = pad.id;
          if (groupState.padRowMuted[padId]) {
            return;
          }

          const rowSteps =
            selectedPattern.padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
          if (!rowSteps.some((stepEnabled) => stepEnabled)) {
            return;
          }

          const sampleId = (groupState.padSampleIds[padId] ?? "").trim();
          if (!sampleId) {
            return;
          }

          sampleIdsInSong.add(sampleId);
          const sampleSettings = groupState.padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
          maxReleaseSeconds = Math.max(maxReleaseSeconds, sampleSettings.releaseMs / 1000);

          if (sampleSettings.delayMix <= 0.001) {
            return;
          }

          const safeFeedback = Math.max(0, Math.min(0.95, sampleSettings.delayFeedback));
          const feedbackMultiplier = Math.max(1, Math.min(12, 1 / (1 - safeFeedback)));
          maxDelayTailSeconds = Math.max(
            maxDelayTailSeconds,
            (sampleSettings.delayTimeMs / 1000) * feedbackMultiplier
          );
        });
      });
    });

    if (!sampleIdsInSong.size) {
      throw new Error("No playable samples found in song arrangement.");
    }

    const sampleBuffersById = new Map<string, AudioBuffer>();
    for (const sampleId of sampleIdsInSong) {
      const sample = sampleAssetsById.get(sampleId);
      if (!sample) {
        continue;
      }

      const sampleBuffer =
        sampleBufferCacheRef.current.get(sample.id) ?? (await ensureSampleBuffer(sample));
      if (sampleBuffer) {
        sampleBuffersById.set(sample.id, sampleBuffer);
      }
    }

    if (!sampleBuffersById.size) {
      throw new Error("Unable to load sample audio for song export.");
    }

    const clockRateMultiplier = getStepLengthTickMultiplier(
      sequencerClockStepLength,
      BASE_SEQUENCER_STEP_LENGTH
    );
    const secondsPerTick =
      (getSequencerStepDurationMs(sequencerBpm, sequencerEngineStepLength) / 1000) *
      clockRateMultiplier;
    const songDurationTicks = Math.max(1, songArrangementTiming.totalTicks);
    const songDurationSeconds = songDurationTicks * secondsPerTick;
    const tailSeconds = Math.min(
      8,
      Math.max(0.2, maxReleaseSeconds + maxDelayTailSeconds + 0.05)
    );
    const totalDurationSeconds = songDurationSeconds + tailSeconds + 0.05;
    const sampleRate = 48000;

    const offlineContext = new OfflineAudioContext(
      2,
      Math.max(1, Math.ceil(totalDurationSeconds * sampleRate)),
      sampleRate
    );

    const outputCompressor = createOfflineRenderOutputCompressor(offlineContext);
    const createRenderVoiceGainNode = createOfflineRenderVoiceGainNodeFactory(
      offlineContext,
      outputCompressor
    );

    type RenderLoopVoice = {
      source: AudioBufferSourceNode;
      gainNode: GainNode;
      releaseSeconds: number;
    };

    const activeLoopVoices = new Map<number, RenderLoopVoice>();
    const stopLoopVoice = (
      voice: RenderLoopVoice,
      stopTime: number,
      allowReleaseTail = true
    ) => {
      const safeStopTime = Math.max(0, stopTime);
      const fadeSeconds = allowReleaseTail
        ? Math.max(VOICE_STOP_FADE_SECONDS, voice.releaseSeconds)
        : VOICE_STOP_FADE_SECONDS;
      voice.gainNode.gain.cancelScheduledValues(safeStopTime);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, safeStopTime);
      voice.gainNode.gain.linearRampToValueAtTime(0, safeStopTime + fadeSeconds);
      voice.source.stop(safeStopTime + fadeSeconds + 0.001);
    };

    songEntriesForRender.forEach((entry) => {
      const sceneEndTimeSeconds = (entry.startTick + entry.durationTicks) * secondsPerTick;
      for (let sceneTick = 0; sceneTick < entry.durationTicks; sceneTick += 1) {
        const absoluteTick = entry.startTick + sceneTick;
        const eventTimeSeconds = absoluteTick * secondsPerTick;

        entry.groups.forEach(({ groupId, groupState, selectedPattern }) => {
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
            if (sceneTick % rowStepTickMultiplier !== 0) {
              return;
            }

            const rowStepIndex = Math.floor(sceneTick / rowStepTickMultiplier) % STEPS_IN_SEQUENCE;
            const rowSteps =
              selectedPattern.padStepSequence[padId] ?? createEmptyStepSequence(STEPS_IN_SEQUENCE);
            if (!rowSteps[rowStepIndex]) {
              return;
            }

            const sampleId = (groupState.padSampleIds[padId] ?? "").trim();
            const sampleBuffer = sampleBuffersById.get(sampleId);
            if (!sampleBuffer) {
              return;
            }

            const rowStepOctaves =
              selectedPattern.padStepOctaves[padId] ?? EMPTY_STEP_OCTAVE_SEQUENCE;
            const transposeSemitoneOffset = getNormalizedStepOctaveSemitoneOffset(
              rowStepOctaves[rowStepIndex]
            );
            const playbackRate = Math.pow(
              2,
              transposeSemitoneOffset / OCTAVE_TRANSPOSE_SEMITONES
            );
            const sampleSettings = groupState.padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
            const padVolume = groupState.padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
            const outputGain = Math.max(
              0,
              Math.min(1, (masterVolume / 100) * (padVolume / 100))
            );
            const syntheticPadId = groupId * 100 + padId;
            const playbackBounds = getSamplePlaybackBounds(sampleBuffer, sampleSettings);
            const isLoopEnabled = groupState.padLoopEnabled[padId] ?? false;

            if (isLoopEnabled) {
              const existingLoopVoice = activeLoopVoices.get(syntheticPadId);
              if (existingLoopVoice) {
                stopLoopVoice(existingLoopVoice, eventTimeSeconds);
                activeLoopVoices.delete(syntheticPadId);
              }

              const source = offlineContext.createBufferSource();
              source.buffer = sampleBuffer;
              source.loop = true;
              source.loopStart = playbackBounds.offsetSeconds;
              source.loopEnd = playbackBounds.endOffsetSeconds;
              source.playbackRate.value = playbackRate;

              const gainNode = createRenderVoiceGainNode(sampleSettings);
              const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
              const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
              const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
              const sustainGain = outputGain * sustainLevel;

              gainNode.gain.cancelScheduledValues(eventTimeSeconds);
              if (attackSeconds > 0) {
                gainNode.gain.setValueAtTime(0, eventTimeSeconds);
                gainNode.gain.linearRampToValueAtTime(
                  outputGain,
                  eventTimeSeconds + attackSeconds
                );
              } else {
                gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
              }
              if (decaySeconds > 0) {
                gainNode.gain.linearRampToValueAtTime(
                  sustainGain,
                  eventTimeSeconds + attackSeconds + decaySeconds
                );
              } else {
                gainNode.gain.setValueAtTime(sustainGain, eventTimeSeconds + attackSeconds);
              }

              source.connect(gainNode);
              source.start(eventTimeSeconds, playbackBounds.offsetSeconds);
              activeLoopVoices.set(syntheticPadId, {
                source,
                gainNode,
                releaseSeconds: Math.max(0, sampleSettings.releaseMs / 1000),
              });
              return;
            }

            const source = offlineContext.createBufferSource();
            source.buffer = sampleBuffer;
            source.playbackRate.value = playbackRate;

            const gainNode = createRenderVoiceGainNode(sampleSettings);
            const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
            const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
            const releaseSeconds = Math.max(0, sampleSettings.releaseMs / 1000);
            const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
            const sustainGain = outputGain * sustainLevel;
            const attackEndTime = eventTimeSeconds + attackSeconds;
            const decayEndTime = attackEndTime + decaySeconds;
            const naturalEndTime = eventTimeSeconds + playbackBounds.durationSeconds / playbackRate;
            const cappedEndTime = Math.max(
              eventTimeSeconds + 0.001,
              Math.min(naturalEndTime, sceneEndTimeSeconds)
            );

            gainNode.gain.cancelScheduledValues(eventTimeSeconds);
            if (attackSeconds > 0) {
              gainNode.gain.setValueAtTime(0, eventTimeSeconds);
              gainNode.gain.linearRampToValueAtTime(outputGain, attackEndTime);
            } else {
              gainNode.gain.setValueAtTime(outputGain, eventTimeSeconds);
            }

            if (decaySeconds > 0) {
              gainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
            } else {
              gainNode.gain.setValueAtTime(sustainGain, attackEndTime);
            }

            if (releaseSeconds > 0 && cappedEndTime > decayEndTime) {
              const releaseStartTime = Math.max(decayEndTime, cappedEndTime - releaseSeconds);
              gainNode.gain.setValueAtTime(sustainGain, releaseStartTime);
              gainNode.gain.linearRampToValueAtTime(0, cappedEndTime);
            } else if (cappedEndTime < naturalEndTime) {
              gainNode.gain.setValueAtTime(0, cappedEndTime);
            }

            source.connect(gainNode);
            source.start(
              eventTimeSeconds,
              playbackBounds.offsetSeconds,
              playbackBounds.durationSeconds
            );
            source.stop(cappedEndTime + 0.001);
          });
        });
      }

      activeLoopVoices.forEach((voice) => {
        stopLoopVoice(voice, sceneEndTimeSeconds, false);
      });
      activeLoopVoices.clear();
    });

    activeLoopVoices.forEach((voice) => {
      stopLoopVoice(voice, songDurationSeconds, false);
    });
    activeLoopVoices.clear();

    return offlineContext.startRendering();
  }, [
    ensureSampleBuffer,
    livePadGroupsState,
    masterVolume,
    sampleAssetsById,
    sampleBufferCacheRef,
    sceneDefinitionsById,
    sequencerBpm,
    sequencerClockStepLength,
    sequencerEngineStepLength,
    songArrangementTiming,
  ]);

  const downloadRenderedAudioBuffer = useCallback(
    (audioBuffer: AudioBuffer, fileNameStem: string) => {
      const sanitizedStem =
        fileNameStem
          .trim()
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^\.+/, "")
          .replace(/\.+$/, "") || "sequence";
      const wavBuffer = encodeAudioBufferToWav(audioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      const downloadUrl = window.URL.createObjectURL(wavBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${sanitizedStem}.wav`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
    []
  );

  const handleExportSequencerPattern = useCallback(async () => {
    const padIds = DRUM_PADS.map((pad) => pad.id).filter((padId) =>
      Boolean((padSampleIds[padId] ?? "").trim())
    );
    const renderedBuffer = await renderSequencerSelectionToAudioBuffer(padIds, true);
    const activePatternName =
      patternOptions.find((pattern) => pattern.id === activePatternId)?.name ?? "Pattern";
    downloadRenderedAudioBuffer(renderedBuffer, `${activePatternName}-pattern`);
  }, [
    activePatternId,
    downloadRenderedAudioBuffer,
    padSampleIds,
    patternOptions,
    renderSequencerSelectionToAudioBuffer,
  ]);

  const handleExportSequencerRow = useCallback(
    async (padId: number) => {
      const assignedSampleId = (padSampleIds[padId] ?? "").trim();
      if (!assignedSampleId) {
        throw new Error("This row has no assigned sample.");
      }

      const renderedBuffer = await renderSequencerSelectionToAudioBuffer([padId], false);
      const rowLabel = padNames[padId] ?? `Pad-${padId}`;
      downloadRenderedAudioBuffer(renderedBuffer, `${rowLabel}-row`);
    },
    [
      downloadRenderedAudioBuffer,
      padNames,
      padSampleIds,
      renderSequencerSelectionToAudioBuffer,
    ]
  );

  const handleExportSong = useCallback(async () => {
    const renderedBuffer = await renderSongArrangementToAudioBuffer();
    const baseName = sanitizeProjectName(selectedProject?.name ?? "") || "Song";
    downloadRenderedAudioBuffer(renderedBuffer, `${baseName}-song`);
  }, [downloadRenderedAudioBuffer, renderSongArrangementToAudioBuffer, selectedProject]);

  const handleExportSongWithStatus = useCallback(() => {
    if (isExportingSong) {
      return;
    }

    setIsExportingSong(true);
    void (async () => {
      try {
        await handleExportSong();
        setSongModeStatusMessage("Song exported.");
      } catch (error) {
        setSongModeStatusMessage(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Song export failed."
        );
      } finally {
        setIsExportingSong(false);
      }
    })();
  }, [handleExportSong, isExportingSong, setIsExportingSong, setSongModeStatusMessage]);

  return {
    handleExportSequencerPattern,
    handleExportSequencerRow,
    handleExportSongWithStatus,
  };
};

