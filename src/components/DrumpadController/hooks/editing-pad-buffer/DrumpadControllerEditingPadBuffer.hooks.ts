import { useEffect } from "react";

import type {
UseEditingPadSampleBufferEffectInput,
} from "./DrumpadControllerEditingPadBuffer.types";

export const useEditingPadSampleBufferEffect = ({
  editingPad,
  editingPadSample,
  ensureSampleBuffer,
  sampleBufferCacheRef,
  setEditingPadSampleBuffer,
  setIsEditingPadSampleBufferLoading,
}: UseEditingPadSampleBufferEffectInput) => {
  useEffect(() => {
    let didCancel = false;

    if (!editingPad || !editingPadSample) {
      setEditingPadSampleBuffer(null);
      setIsEditingPadSampleBufferLoading(false);
      return () => {
        didCancel = true;
      };
    }

    const cachedBuffer = sampleBufferCacheRef.current.get(editingPadSample.id);
    if (cachedBuffer) {
      setEditingPadSampleBuffer(cachedBuffer);
      setIsEditingPadSampleBufferLoading(false);
      return () => {
        didCancel = true;
      };
    }

    setEditingPadSampleBuffer(null);
    setIsEditingPadSampleBufferLoading(true);
    void ensureSampleBuffer(editingPadSample)
      .then((sampleBuffer) => {
        if (didCancel) {
          return;
        }
        setEditingPadSampleBuffer(sampleBuffer);
        setIsEditingPadSampleBufferLoading(false);
      })
      .catch(() => {
        if (didCancel) {
          return;
        }
        setEditingPadSampleBuffer(null);
        setIsEditingPadSampleBufferLoading(false);
      });

    return () => {
      didCancel = true;
    };
  }, [
    editingPad,
    editingPadSample,
    ensureSampleBuffer,
    sampleBufferCacheRef,
    setEditingPadSampleBuffer,
    setIsEditingPadSampleBufferLoading,
  ]);
};

