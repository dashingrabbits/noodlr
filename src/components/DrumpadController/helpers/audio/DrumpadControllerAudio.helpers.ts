import { MIN_PAD_SAMPLE_TRIM_RANGE } from "../../DrumpadController.utilities";
import type { PadSampleSettings } from "../../DrumpadController.types";
import type {
  CreateOfflineRenderVoiceGainNode,
  SamplePlaybackBounds,
} from "./DrumpadControllerAudio.types";

const gcd = (left: number, right: number): number => {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
};

export const lcm = (left: number, right: number): number => {
  const normalizedLeft = Math.max(1, Math.round(Math.abs(left)));
  const normalizedRight = Math.max(1, Math.round(Math.abs(right)));
  return Math.max(1, (normalizedLeft * normalizedRight) / gcd(normalizedLeft, normalizedRight));
};

export const getSamplePlaybackBounds = (
  sampleBuffer: AudioBuffer,
  sampleSettings: PadSampleSettings
): SamplePlaybackBounds => {
  const bufferDurationSeconds = Math.max(0, sampleBuffer.duration);
  const maxStartRatio = Math.max(0, 1 - MIN_PAD_SAMPLE_TRIM_RANGE);
  const normalizedSampleStart = Math.max(
    0,
    Math.min(maxStartRatio, Number(sampleSettings.sampleStart ?? 0))
  );
  const normalizedSampleEnd = Math.max(
    normalizedSampleStart + MIN_PAD_SAMPLE_TRIM_RANGE,
    Math.min(1, Number(sampleSettings.sampleEnd ?? 1))
  );
  const offsetSeconds = bufferDurationSeconds * normalizedSampleStart;
  const endOffsetSeconds = bufferDurationSeconds * normalizedSampleEnd;
  const minDurationSeconds = sampleBuffer.sampleRate > 0 ? 1 / sampleBuffer.sampleRate : 0.001;

  return {
    offsetSeconds,
    endOffsetSeconds,
    durationSeconds: Math.max(minDurationSeconds, endOffsetSeconds - offsetSeconds),
  };
};

export const createOfflineRenderOutputCompressor = (
  offlineContext: OfflineAudioContext
): DynamicsCompressorNode => {
  const outputCompressor = offlineContext.createDynamicsCompressor();
  outputCompressor.threshold.value = -10;
  outputCompressor.knee.value = 10;
  outputCompressor.ratio.value = 12;
  outputCompressor.attack.value = 0.003;
  outputCompressor.release.value = 0.08;
  outputCompressor.connect(offlineContext.destination);
  return outputCompressor;
};

const createOfflineReverbImpulseBuffer = (
  offlineContext: OfflineAudioContext
): AudioBuffer => {
  const durationSeconds = 1.8;
  const length = Math.floor(offlineContext.sampleRate * durationSeconds);
  const impulseBuffer = offlineContext.createBuffer(2, length, offlineContext.sampleRate);

  for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
    const channelData = impulseBuffer.getChannelData(channel);
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      const decay = Math.pow(1 - sampleIndex / length, 3);
      channelData[sampleIndex] = (Math.random() * 2 - 1) * decay;
    }
  }

  return impulseBuffer;
};

export const createOfflineRenderVoiceGainNodeFactory = (
  offlineContext: OfflineAudioContext,
  outputNode: AudioNode
): CreateOfflineRenderVoiceGainNode => {
  const reverbImpulseBuffer = createOfflineReverbImpulseBuffer(offlineContext);

  return (sampleSettings: PadSampleSettings): GainNode => {
    const voiceGainNode = offlineContext.createGain();
    const reverbMix = Math.max(0, Math.min(1, sampleSettings.reverbMix));
    const delayMix = Math.max(0, Math.min(1, sampleSettings.delayMix));
    const dryMix = Math.max(0, 1 - Math.min(1, reverbMix + delayMix));

    const dryGainNode = offlineContext.createGain();
    dryGainNode.gain.value = dryMix;
    voiceGainNode.connect(dryGainNode);
    dryGainNode.connect(outputNode);

    if (reverbMix > 0.001) {
      const reverbSendGainNode = offlineContext.createGain();
      reverbSendGainNode.gain.value = reverbMix;
      const convolverNode = offlineContext.createConvolver();
      convolverNode.buffer = reverbImpulseBuffer;

      voiceGainNode.connect(reverbSendGainNode);
      reverbSendGainNode.connect(convolverNode);
      convolverNode.connect(outputNode);
    }

    if (delayMix > 0.001) {
      const delaySendGainNode = offlineContext.createGain();
      delaySendGainNode.gain.value = delayMix;

      const delayNode = offlineContext.createDelay(1.0);
      delayNode.delayTime.value = Math.max(
        0.001,
        Math.min(1, sampleSettings.delayTimeMs / 1000)
      );

      const feedbackGainNode = offlineContext.createGain();
      feedbackGainNode.gain.value = Math.max(0, Math.min(0.95, sampleSettings.delayFeedback));

      voiceGainNode.connect(delaySendGainNode);
      delaySendGainNode.connect(delayNode);
      delayNode.connect(feedbackGainNode);
      feedbackGainNode.connect(delayNode);
      delayNode.connect(outputNode);
    }

    return voiceGainNode;
  };
};
