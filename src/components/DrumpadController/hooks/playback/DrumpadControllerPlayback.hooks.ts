import { useCallback } from "react";
import type { SampleAsset } from "../../../../integrations/samples/sample.types";
import {
OCTAVE_TRANSPOSE_SEMITONES,
} from "../../../KeyboardTranspose/KeyboardTranspose.utilities";
import { VOICE_STOP_FADE_SECONDS } from "../../constants";
import type {
PadGroupId,
PadGroupState,
PadSampleSettings
} from "../../DrumpadController.types";
import {
DEFAULT_PAD_SAMPLE_SETTINGS,
DEFAULT_PAD_VOLUME,
DEFAULT_SAMPLE_POLYPHONY,
} from "../../DrumpadController.utilities";
import { getSamplePlaybackBounds } from "../../helpers/audio";
import { getNormalizedStepOctaveSemitoneOffset } from "../../helpers/pattern";

import type {
UsePlaybackEngineInput
} from "./DrumpadControllerPlayback.types";

export const usePlaybackEngine = ({
  activeBufferSourcesByPadRef,
  activeLoopBufferSourcesByPadRef,
  activeMetronomeSourcesRef,
  audioContextRef,
  audioContextResumePendingRef,
  masterVolume,
  outputCompressorContextRef,
  outputCompressorRef,
  padAssignedSamples,
  padLoopEnabled,
  padLoopEnabledRef,
  padPolyphony,
  padSampleIdsRef,
  padSampleSettings,
  padSampleSettingsRef,
  padVolumes,
  playAssignedSampleRef,
  reverbImpulseBufferContextRef,
  reverbImpulseBufferRef,
  sampleAssetsById,
  sampleBufferCacheRef,
  sampleBufferPendingRef,
}: UsePlaybackEngineInput) => {
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      const maybeWindow = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextConstructor = globalThis.AudioContext || maybeWindow.webkitAudioContext;
      if (!AudioContextConstructor) {
        return null;
      }
      audioContextRef.current = new AudioContextConstructor();
    }

    return audioContextRef.current;
  }, [audioContextRef]);

  const ensureAudioContextReady = useCallback(async (): Promise<AudioContext | null> => {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  }, [getAudioContext]);

  const resumeAudioContextIfNeeded = useCallback(
    (context: AudioContext) => {
      if (context.state === "running") {
        return;
      }

      if (audioContextResumePendingRef.current) {
        return;
      }

      audioContextResumePendingRef.current = context
        .resume()
        .catch(() => {
          // Ignore resume failures; next interaction can retry.
        })
        .then(() => undefined)
        .finally(() => {
          audioContextResumePendingRef.current = null;
        });
    },
    [audioContextResumePendingRef]
  );

  const getOutputNode = useCallback(
    (context: AudioContext): AudioNode => {
      if (
        outputCompressorRef.current &&
        outputCompressorContextRef.current === context
      ) {
        return outputCompressorRef.current;
      }

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 10;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.08;
      compressor.connect(context.destination);

      outputCompressorRef.current = compressor;
      outputCompressorContextRef.current = context;

      return compressor;
    },
    [outputCompressorContextRef, outputCompressorRef]
  );

  const getReverbImpulseBuffer = useCallback(
    (context: AudioContext): AudioBuffer => {
      if (
        reverbImpulseBufferRef.current &&
        reverbImpulseBufferContextRef.current === context
      ) {
        return reverbImpulseBufferRef.current;
      }

      const durationSeconds = 1.8;
      const length = Math.floor(context.sampleRate * durationSeconds);
      const impulseBuffer = context.createBuffer(2, length, context.sampleRate);

      for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
        const channelData = impulseBuffer.getChannelData(channel);
        for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
          const decay = Math.pow(1 - sampleIndex / length, 3);
          channelData[sampleIndex] = (Math.random() * 2 - 1) * decay;
        }
      }

      reverbImpulseBufferRef.current = impulseBuffer;
      reverbImpulseBufferContextRef.current = context;
      return impulseBuffer;
    },
    [reverbImpulseBufferContextRef, reverbImpulseBufferRef]
  );

  const createVoiceGainNode = useCallback(
    (context: AudioContext, sampleSettings: PadSampleSettings): GainNode => {
      const outputNode = getOutputNode(context);
      const voiceGainNode = context.createGain();
      const reverbMix = Math.max(0, Math.min(1, sampleSettings.reverbMix));
      const delayMix = Math.max(0, Math.min(1, sampleSettings.delayMix));
      const dryMix = Math.max(0, 1 - Math.min(1, reverbMix + delayMix));

      const dryGainNode = context.createGain();
      dryGainNode.gain.value = dryMix;
      voiceGainNode.connect(dryGainNode);
      dryGainNode.connect(outputNode);

      if (reverbMix > 0.001) {
        const reverbSendGainNode = context.createGain();
        reverbSendGainNode.gain.value = reverbMix;
        const convolverNode = context.createConvolver();
        convolverNode.buffer = getReverbImpulseBuffer(context);

        voiceGainNode.connect(reverbSendGainNode);
        reverbSendGainNode.connect(convolverNode);
        convolverNode.connect(outputNode);
      }

      if (delayMix > 0.001) {
        const delaySendGainNode = context.createGain();
        delaySendGainNode.gain.value = delayMix;

        const delayNode = context.createDelay(1.0);
        delayNode.delayTime.value = Math.max(
          0.001,
          Math.min(1, sampleSettings.delayTimeMs / 1000)
        );

        const feedbackGainNode = context.createGain();
        feedbackGainNode.gain.value = Math.max(
          0,
          Math.min(0.95, sampleSettings.delayFeedback)
        );

        voiceGainNode.connect(delaySendGainNode);
        delaySendGainNode.connect(delayNode);
        delayNode.connect(feedbackGainNode);
        feedbackGainNode.connect(delayNode);
        delayNode.connect(outputNode);
      }

      return voiceGainNode;
    },
    [getOutputNode, getReverbImpulseBuffer]
  );

  const ensureSampleBuffer = useCallback(
    async (sample: SampleAsset): Promise<AudioBuffer | null> => {
      const cachedBuffer = sampleBufferCacheRef.current.get(sample.id);
      if (cachedBuffer) {
        return cachedBuffer;
      }

      const pendingBuffer = sampleBufferPendingRef.current.get(sample.id);
      if (pendingBuffer) {
        return pendingBuffer;
      }

      const pendingPromise = (async () => {
        const context = await ensureAudioContextReady();
        if (!context) {
          return null;
        }

        const response = await fetch(sample.previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to load sample audio: ${sample.name}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
        sampleBufferCacheRef.current.set(sample.id, decodedBuffer);
        return decodedBuffer;
      })();

      sampleBufferPendingRef.current.set(sample.id, pendingPromise);

      try {
        return await pendingPromise;
      } finally {
        sampleBufferPendingRef.current.delete(sample.id);
      }
    },
    [ensureAudioContextReady, sampleBufferCacheRef, sampleBufferPendingRef]
  );

  const playBufferSource = useCallback(
    (
      context: AudioContext,
      sampleBuffer: AudioBuffer,
      padId: number,
      maxVoices: number,
      sampleSettings: PadSampleSettings,
      outputGain: number,
      startTime?: number,
      transposeSemitoneOffset = 0
    ) => {
      const activeVoices = activeBufferSourcesByPadRef.current.get(padId) ?? [];
      while (activeVoices.length >= maxVoices) {
        const oldestVoice = activeVoices.shift();
        if (!oldestVoice) {
          continue;
        }

        try {
          const fadeStartTime = context.currentTime;
          oldestVoice.gainNode.gain.cancelScheduledValues(fadeStartTime);
          oldestVoice.gainNode.gain.setValueAtTime(
            oldestVoice.gainNode.gain.value,
            fadeStartTime
          );
          oldestVoice.gainNode.gain.linearRampToValueAtTime(
            0,
            fadeStartTime + VOICE_STOP_FADE_SECONDS
          );
          oldestVoice.source.stop(fadeStartTime + VOICE_STOP_FADE_SECONDS + 0.001);
        } catch {
          oldestVoice.source.stop();
        }
      }

      const source = context.createBufferSource();
      source.buffer = sampleBuffer;
      const playbackRate = Math.pow(
        2,
        getNormalizedStepOctaveSemitoneOffset(transposeSemitoneOffset) / OCTAVE_TRANSPOSE_SEMITONES
      );
      source.playbackRate.value = playbackRate;
      const playbackBounds = getSamplePlaybackBounds(sampleBuffer, sampleSettings);

      const gainNode = createVoiceGainNode(context, sampleSettings);
      const scheduledStartTime = startTime ?? context.currentTime;
      const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
      const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
      const releaseSeconds = Math.max(0, sampleSettings.releaseMs / 1000);
      const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
      const sustainGain = outputGain * sustainLevel;
      const attackEndTime = scheduledStartTime + attackSeconds;
      const decayEndTime = attackEndTime + decaySeconds;
      const naturalEndTime = scheduledStartTime + playbackBounds.durationSeconds / playbackRate;

      gainNode.gain.cancelScheduledValues(scheduledStartTime);
      if (attackSeconds > 0) {
        gainNode.gain.setValueAtTime(0, scheduledStartTime);
        gainNode.gain.linearRampToValueAtTime(outputGain, attackEndTime);
      } else {
        gainNode.gain.setValueAtTime(outputGain, scheduledStartTime);
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

      activeVoices.push({ source, gainNode });
      activeBufferSourcesByPadRef.current.set(padId, activeVoices);

      source.onended = () => {
        const currentVoices = activeBufferSourcesByPadRef.current.get(padId) ?? [];
        activeBufferSourcesByPadRef.current.set(
          padId,
          currentVoices.filter((currentVoice) => currentVoice.source !== source)
        );
      };

      source.start(
        scheduledStartTime,
        playbackBounds.offsetSeconds,
        playbackBounds.durationSeconds
      );
    },
    [activeBufferSourcesByPadRef, createVoiceGainNode]
  );

  const stopLoopBufferSourceForPad = useCallback(
    (padId: number) => {
      const activeLoopVoice = activeLoopBufferSourcesByPadRef.current.get(padId);
      if (!activeLoopVoice) {
        return;
      }

      try {
        const context = audioContextRef.current;
        const stopStartTime = context?.currentTime;
        const stopFadeSeconds = Math.max(
          VOICE_STOP_FADE_SECONDS,
          activeLoopVoice.releaseSeconds
        );
        if (typeof stopStartTime === "number") {
          activeLoopVoice.gainNode.gain.cancelScheduledValues(stopStartTime);
          activeLoopVoice.gainNode.gain.setValueAtTime(
            activeLoopVoice.gainNode.gain.value,
            stopStartTime
          );
          activeLoopVoice.gainNode.gain.linearRampToValueAtTime(
            0,
            stopStartTime + stopFadeSeconds
          );
          activeLoopVoice.source.stop(stopStartTime + stopFadeSeconds + 0.001);
        } else {
          activeLoopVoice.source.stop();
        }
      } catch {
        // Ignore stop errors if loop already ended.
      }

      activeLoopBufferSourcesByPadRef.current.delete(padId);
    },
    [activeLoopBufferSourcesByPadRef, audioContextRef]
  );

  const stopAllLoopBufferSources = useCallback(() => {
    const context = audioContextRef.current;
    const stopStartTime = context?.currentTime;
    activeLoopBufferSourcesByPadRef.current.forEach((loopVoice, padId) => {
      try {
        const stopFadeSeconds = Math.max(
          VOICE_STOP_FADE_SECONDS,
          loopVoice.releaseSeconds
        );
        if (typeof stopStartTime === "number") {
          loopVoice.gainNode.gain.cancelScheduledValues(stopStartTime);
          loopVoice.gainNode.gain.setValueAtTime(
            loopVoice.gainNode.gain.value,
            stopStartTime
          );
          loopVoice.gainNode.gain.linearRampToValueAtTime(
            0,
            stopStartTime + stopFadeSeconds
          );
          loopVoice.source.stop(stopStartTime + stopFadeSeconds + 0.001);
        } else {
          loopVoice.source.stop();
        }
      } catch {
        // Ignore source stop errors during teardown.
      }
      activeLoopBufferSourcesByPadRef.current.delete(padId);
    });
  }, [activeLoopBufferSourcesByPadRef, audioContextRef]);

  const stopAllOneShotBufferSources = useCallback(() => {
    const context = audioContextRef.current;
    const fadeStartTime = context?.currentTime;

    activeBufferSourcesByPadRef.current.forEach((voices) => {
      voices.forEach((voice) => {
        try {
          if (typeof fadeStartTime === "number") {
            voice.gainNode.gain.cancelScheduledValues(fadeStartTime);
            voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, fadeStartTime);
            voice.gainNode.gain.linearRampToValueAtTime(
              0,
              fadeStartTime + VOICE_STOP_FADE_SECONDS
            );
            voice.source.stop(fadeStartTime + VOICE_STOP_FADE_SECONDS + 0.001);
          } else {
            voice.source.stop();
          }
        } catch {
          // Ignore source stop errors during transport stop.
        }
      });
    });

    activeBufferSourcesByPadRef.current.clear();
  }, [activeBufferSourcesByPadRef, audioContextRef]);

  const stopAllMetronomeSources = useCallback(() => {
    const context = audioContextRef.current;
    const stopTime = context?.currentTime;

    activeMetronomeSourcesRef.current.forEach((source) => {
      try {
        source.stop(typeof stopTime === "number" ? stopTime : undefined);
      } catch {
        // Ignore stop errors if source already ended.
      }
    });
    activeMetronomeSourcesRef.current.clear();
  }, [activeMetronomeSourcesRef, audioContextRef]);

  const scheduleMetronomeTone = useCallback(
    (
      context: AudioContext,
      scheduledTime: number,
      isAccent: boolean,
      metronomeGainLevel: number
    ) => {
      const source = context.createOscillator();
      const gainNode = context.createGain();
      const outputNode = getOutputNode(context);
      const toneDurationSeconds = isAccent ? 0.07 : 0.05;

      source.type = "triangle";
      source.frequency.setValueAtTime(isAccent ? 1680 : 1220, scheduledTime);

      gainNode.gain.setValueAtTime(0.0001, scheduledTime);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, metronomeGainLevel),
        scheduledTime + 0.002
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        scheduledTime + toneDurationSeconds
      );

      source.connect(gainNode);
      gainNode.connect(outputNode);

      activeMetronomeSourcesRef.current.add(source);
      source.onended = () => {
        activeMetronomeSourcesRef.current.delete(source);
      };

      source.start(scheduledTime);
      source.stop(scheduledTime + toneDurationSeconds + 0.001);
    },
    [activeMetronomeSourcesRef, getOutputNode]
  );

  const playLoopBufferSource = useCallback(
    (
      context: AudioContext,
      sampleBuffer: AudioBuffer,
      padId: number,
      sampleSettings: PadSampleSettings,
      outputGain: number,
      startTime?: number,
      transposeSemitoneOffset = 0
    ) => {
      stopLoopBufferSourceForPad(padId);

      const source = context.createBufferSource();
      source.buffer = sampleBuffer;
      source.loop = true;
      source.playbackRate.value = Math.pow(
        2,
        getNormalizedStepOctaveSemitoneOffset(transposeSemitoneOffset) / OCTAVE_TRANSPOSE_SEMITONES
      );
      const playbackBounds = getSamplePlaybackBounds(sampleBuffer, sampleSettings);
      source.loopStart = playbackBounds.offsetSeconds;
      source.loopEnd = playbackBounds.endOffsetSeconds;

      const gainNode = createVoiceGainNode(context, sampleSettings);
      const scheduledStartTime = startTime ?? context.currentTime;
      const attackSeconds = Math.max(0, sampleSettings.attackMs / 1000);
      const decaySeconds = Math.max(0, sampleSettings.decayMs / 1000);
      const sustainLevel = Math.max(0, Math.min(1, sampleSettings.sustain));
      const sustainGain = outputGain * sustainLevel;

      gainNode.gain.cancelScheduledValues(scheduledStartTime);
      if (attackSeconds > 0) {
        gainNode.gain.setValueAtTime(0, scheduledStartTime);
        gainNode.gain.linearRampToValueAtTime(outputGain, scheduledStartTime + attackSeconds);
      } else {
        gainNode.gain.setValueAtTime(outputGain, scheduledStartTime);
      }
      if (decaySeconds > 0) {
        gainNode.gain.linearRampToValueAtTime(
          sustainGain,
          scheduledStartTime + attackSeconds + decaySeconds
        );
      } else {
        gainNode.gain.setValueAtTime(sustainGain, scheduledStartTime + attackSeconds);
      }

      source.connect(gainNode);

      source.onended = () => {
        const activeLoopVoice = activeLoopBufferSourcesByPadRef.current.get(padId);
        if (activeLoopVoice?.source === source) {
          activeLoopBufferSourcesByPadRef.current.delete(padId);
        }
      };

      activeLoopBufferSourcesByPadRef.current.set(padId, {
        source,
        gainNode,
        releaseSeconds: Math.max(0, sampleSettings.releaseMs / 1000),
      });
      source.start(scheduledStartTime, playbackBounds.offsetSeconds);
    },
    [
      activeLoopBufferSourcesByPadRef,
      createVoiceGainNode,
      stopLoopBufferSourceForPad,
    ]
  );

  const playAssignedSample = useCallback(
    (padId: number, scheduledTime?: number, transposeSemitoneOffset = 0) => {
      const assignedSample = padAssignedSamples[padId];
      if (!assignedSample) {
        stopLoopBufferSourceForPad(padId);
        return;
      }

      const padVolume = padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
      const outputGain = Math.max(0, Math.min(1, (masterVolume / 100) * (padVolume / 100)));
      const sampleSettings = padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
      const context = getAudioContext();
      if (!context) {
        return;
      }

      const cachedBuffer = sampleBufferCacheRef.current.get(assignedSample.id);
      const isLoopEnabled = padLoopEnabled[padId] ?? false;

      if (isLoopEnabled) {
        if (context.state === "running" && cachedBuffer) {
          playLoopBufferSource(
            context,
            cachedBuffer,
            padId,
            sampleSettings,
            outputGain,
            scheduledTime,
            transposeSemitoneOffset
          );
          return;
        }

        if (context.state !== "running") {
          resumeAudioContextIfNeeded(context);
        }

        void ensureSampleBuffer(assignedSample)
          .then((sampleBuffer) => {
            if (!sampleBuffer) {
              return;
            }

            if (!padLoopEnabledRef.current[padId]) {
              return;
            }

            if (padSampleIdsRef.current[padId] !== assignedSample.id) {
              return;
            }

            const activeContext = getAudioContext();
            if (!activeContext || activeContext.state !== "running") {
              return;
            }

            const activeSampleSettings =
              padSampleSettingsRef.current[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
            playLoopBufferSource(
              activeContext,
              sampleBuffer,
              padId,
              activeSampleSettings,
              outputGain,
              scheduledTime,
              transposeSemitoneOffset
            );
          })
          .catch(() => {
            // Ignore warmup errors.
          });
        return;
      }

      stopLoopBufferSourceForPad(padId);

      const maxVoices = padPolyphony[padId] ?? DEFAULT_SAMPLE_POLYPHONY;

      // Hot path: if context + decoded buffer are ready, playback starts immediately.
      if (context.state === "running" && cachedBuffer) {
        playBufferSource(
          context,
          cachedBuffer,
          padId,
          maxVoices,
          sampleSettings,
          outputGain,
          scheduledTime,
          transposeSemitoneOffset
        );
        return;
      }

      // Never queue delayed hits: resume/warm in background and wait for the next press.
      if (context.state !== "running") {
        resumeAudioContextIfNeeded(context);
      }

      void ensureSampleBuffer(assignedSample).catch(() => {
        // Ignore warmup errors.
      });
    },
    [
      ensureSampleBuffer,
      getAudioContext,
      masterVolume,
      padAssignedSamples,
      padLoopEnabled,
      padPolyphony,
      padSampleIdsRef,
      padSampleSettings,
      padSampleSettingsRef,
      padVolumes,
      playBufferSource,
      playLoopBufferSource,
      resumeAudioContextIfNeeded,
      sampleBufferCacheRef,
      stopLoopBufferSourceForPad,
      padLoopEnabledRef,
    ]
  );

  playAssignedSampleRef.current = playAssignedSample;

  const playSceneAssignedSample = useCallback(
    (
      groupId: PadGroupId,
      groupState: PadGroupState,
      padId: number,
      scheduledTime?: number,
      transposeSemitoneOffset = 0
    ) => {
      const assignedSampleId = (groupState.padSampleIds[padId] ?? "").trim();
      const syntheticPadId = groupId * 100 + padId;
      if (!assignedSampleId) {
        stopLoopBufferSourceForPad(syntheticPadId);
        return;
      }

      const assignedSample = sampleAssetsById.get(assignedSampleId);
      if (!assignedSample) {
        stopLoopBufferSourceForPad(syntheticPadId);
        return;
      }

      const padVolume = groupState.padVolumes[padId] ?? DEFAULT_PAD_VOLUME;
      const outputGain = Math.max(0, Math.min(1, (masterVolume / 100) * (padVolume / 100)));
      const sampleSettings = groupState.padSampleSettings[padId] ?? DEFAULT_PAD_SAMPLE_SETTINGS;
      const context = getAudioContext();
      if (!context) {
        return;
      }

      const cachedBuffer = sampleBufferCacheRef.current.get(assignedSample.id);
      const isLoopEnabled = groupState.padLoopEnabled[padId] ?? false;

      if (isLoopEnabled) {
        if (context.state === "running" && cachedBuffer) {
          playLoopBufferSource(
            context,
            cachedBuffer,
            syntheticPadId,
            sampleSettings,
            outputGain,
            scheduledTime,
            transposeSemitoneOffset
          );
          return;
        }

        if (context.state !== "running") {
          resumeAudioContextIfNeeded(context);
        }

        void ensureSampleBuffer(assignedSample)
          .then((sampleBuffer) => {
            if (!sampleBuffer) {
              return;
            }

            const activeContext = getAudioContext();
            if (!activeContext || activeContext.state !== "running") {
              return;
            }

            playLoopBufferSource(
              activeContext,
              sampleBuffer,
              syntheticPadId,
              sampleSettings,
              outputGain,
              scheduledTime,
              transposeSemitoneOffset
            );
          })
          .catch(() => {
            // Ignore warmup errors.
          });
        return;
      }

      stopLoopBufferSourceForPad(syntheticPadId);

      const maxVoices = groupState.padPolyphony[padId] ?? DEFAULT_SAMPLE_POLYPHONY;
      if (context.state === "running" && cachedBuffer) {
        playBufferSource(
          context,
          cachedBuffer,
          syntheticPadId,
          maxVoices,
          sampleSettings,
          outputGain,
          scheduledTime,
          transposeSemitoneOffset
        );
        return;
      }

      if (context.state !== "running") {
        resumeAudioContextIfNeeded(context);
      }

      void ensureSampleBuffer(assignedSample).catch(() => {
        // Ignore warmup errors.
      });
    },
    [
      ensureSampleBuffer,
      getAudioContext,
      masterVolume,
      playBufferSource,
      playLoopBufferSource,
      resumeAudioContextIfNeeded,
      sampleAssetsById,
      sampleBufferCacheRef,
      stopLoopBufferSourceForPad,
    ]
  );

  const resetAudioGraphCaches = useCallback(() => {
    outputCompressorRef.current = null;
    outputCompressorContextRef.current = null;
    reverbImpulseBufferRef.current = null;
    reverbImpulseBufferContextRef.current = null;
  }, [
    outputCompressorContextRef,
    outputCompressorRef,
    reverbImpulseBufferContextRef,
    reverbImpulseBufferRef,
  ]);

  return {
    ensureAudioContextReady,
    ensureSampleBuffer,
    getAudioContext,
    getOutputNode,
    playAssignedSample,
    playSceneAssignedSample,
    resetAudioGraphCaches,
    scheduleMetronomeTone,
    stopAllLoopBufferSources,
    stopAllMetronomeSources,
    stopAllOneShotBufferSources,
    stopLoopBufferSourceForPad,
  };
};

