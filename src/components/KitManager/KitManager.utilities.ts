import type { SavedDrumKit, KitArchiveManifest } from "./KitManager.types";

export const SAVED_KITS_STORAGE_KEY = "noodlr.savedKits.session";
export const KIT_NAME_MAX_LENGTH = 48;
export const KIT_ARCHIVE_MANIFEST_FILE_NAME = "kit.json";
export const KIT_ARCHIVE_EXTENSION = ".noodlr-kit.zip";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const sanitizeKitName = (value: string): string => {
  return value.trim().slice(0, KIT_NAME_MAX_LENGTH);
};

export const readSavedKitsFromSession = (): SavedDrumKit[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(SAVED_KITS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((item): item is SavedDrumKit => {
        if (!isRecord(item)) {
          return false;
        }

        return (
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.createdAt === "string" &&
          typeof item.updatedAt === "string" &&
          isRecord(item.state)
        );
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
  } catch {
    return [];
  }
};

export const writeSavedKitsToSession = (kits: SavedDrumKit[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SAVED_KITS_STORAGE_KEY, JSON.stringify(kits));
};

export const createSavedKitId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sanitizeFileNamePart = (value: string): string => {
  const cleanedValue = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  return cleanedValue || "kit";
};

export const createKitArchiveFileName = (kitName: string): string => {
  const safeKitName = sanitizeFileNamePart(kitName).slice(0, 80);
  return `${safeKitName}${KIT_ARCHIVE_EXTENSION}`;
};

export const createKitArchiveSampleFileName = (
  sampleName: string,
  usedFileNames: Set<string>
): string => {
  const safeBaseName = sanitizeFileNamePart(sampleName).slice(0, 80) || "sample";
  let candidate = `${safeBaseName}.wav`;
  let suffix = 2;

  while (usedFileNames.has(candidate)) {
    candidate = `${safeBaseName}-${suffix}.wav`;
    suffix += 1;
  }

  usedFileNames.add(candidate);
  return candidate;
};

const clampSampleValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
};

export const encodeAudioBufferToWav = (audioBuffer: AudioBuffer): ArrayBuffer => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const channelLength = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const pcmDataLength = channelLength * blockAlign;
  const outputBuffer = new ArrayBuffer(44 + pcmDataLength);
  const view = new DataView(outputBuffer);

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + pcmDataLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, pcmDataLength, true);

  const channelData = Array.from({ length: numberOfChannels }, (_, index) =>
    audioBuffer.getChannelData(index)
  );

  let offset = 44;
  for (let sampleIndex = 0; sampleIndex < channelLength; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const sample = clampSampleValue(channelData[channelIndex][sampleIndex]);
      const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(pcmSample), true);
      offset += bytesPerSample;
    }
  }

  return outputBuffer;
};

const isKitArchiveSampleEntry = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sampleId === "string" &&
    typeof value.name === "string" &&
    typeof value.filePath === "string"
  );
};

export const isKitArchiveManifest = (value: unknown): value is KitArchiveManifest => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.format === "noodlr-kit" &&
    value.version === 1 &&
    typeof value.name === "string" &&
    typeof value.exportedAt === "string" &&
    isRecord(value.state) &&
    isRecord(value.sampleMetadataOverrides) &&
    Array.isArray(value.samples) &&
    value.samples.every(isKitArchiveSampleEntry)
  );
};
