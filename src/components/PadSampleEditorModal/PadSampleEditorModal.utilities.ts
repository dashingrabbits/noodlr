import type { CSSProperties } from "react";

export const toPercent = (value: number): string => `${Math.round(value * 100)}%`;
export const toMilliseconds = (value: number): string => `${Math.round(value)} ms`;
export const toVolumePercent = (value: number): string => `${Math.round(value)}%`;

export const createVolumeSliderBackgroundStyle = (value: number): CSSProperties => {
  return {
    background: `linear-gradient(to right, #ff8c2b 0%, #ff8c2b ${value}%, #9ca3af ${value}%, #9ca3af 100%)`,
  };
};

export const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
};

export const roundToStep = (value: number, step: number): number => {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }

  return Math.round(value / step) * step;
};

export const normalizeToUnit = (value: number, min: number, max: number): number => {
  if (max <= min) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
};

export const denormalizeFromUnit = (value: number, min: number, max: number): number => {
  if (max <= min) {
    return min;
  }

  return min + clamp(value, 0, 1) * (max - min);
};
