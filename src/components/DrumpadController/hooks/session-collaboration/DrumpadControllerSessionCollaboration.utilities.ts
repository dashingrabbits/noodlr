import type {
  SampleAsset,
  SampleMetadataOverrides,
} from "../../../../integrations/samples/sample.types";
import type { ProjectState } from "../../../ProjectManager/ProjectManager.types";
import { PAD_GROUP_IDS } from "../../constants";
import {
  SESSION_DEFAULT_SERVER_URL,
  SESSION_ID_PATTERN,
  SESSION_SERVER_URL_ENV_KEY,
} from "./DrumpadControllerSessionCollaboration.constants";
import type { SharedSessionSample } from "./DrumpadControllerSessionCollaboration.types";

const AUDIO_MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  wav: "audio/wav",
  wave: "audio/wave",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  webm: "audio/webm",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/aac",
};

const SESSION_CLIENT_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const getSessionServerUrl = (): string => {
  const envValue = (import.meta.env[SESSION_SERVER_URL_ENV_KEY] as string | undefined)?.trim();
  if (!envValue) {
    return SESSION_DEFAULT_SERVER_URL;
  }

  return envValue;
};

export const normalizeSessionIdInput = (value: string): string => {
  return value.trim();
};

export const isValidSessionId = (value: string): boolean => {
  return SESSION_ID_PATTERN.test(value);
};

export const createSessionClientId = (): string => {
  const randomBytes = new Uint8Array(20);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let index = 0; index < randomBytes.length; index += 1) {
      randomBytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(randomBytes, (value) => {
    return SESSION_CLIENT_ID_ALPHABET[value % SESSION_CLIENT_ID_ALPHABET.length];
  }).join("");
};

export const inferAudioMimeType = (
  responseContentType: string | null,
  sampleName: string,
  previewUrl: string
): string => {
  const normalizedResponseType = responseContentType?.split(";")[0]?.trim().toLowerCase();
  if (normalizedResponseType?.startsWith("audio/")) {
    return normalizedResponseType;
  }

  const extensionMatch = (sampleName || previewUrl)
    .toLowerCase()
    .match(/\.([a-z0-9]+)(?:$|\?|#)/i);
  const extension = extensionMatch?.[1];
  if (extension && AUDIO_MIME_TYPE_BY_EXTENSION[extension]) {
    return AUDIO_MIME_TYPE_BY_EXTENSION[extension];
  }

  return "audio/wav";
};

export const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read sample audio payload."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to encode sample audio payload."));
        return;
      }

      const splitResult = reader.result.split(",");
      if (splitResult.length !== 2 || !splitResult[1]) {
        reject(new Error("Failed to encode sample audio payload."));
        return;
      }

      resolve(splitResult[1]);
    };
    reader.readAsDataURL(blob);
  });
};

export const base64ToBlob = (dataBase64: string, mimeType: string): Blob => {
  const binaryPayload = atob(dataBase64);
  const byteLength = binaryPayload.length;
  const byteArray = new Uint8Array(byteLength);

  for (let index = 0; index < byteLength; index += 1) {
    byteArray[index] = binaryPayload.charCodeAt(index);
  }

  return new Blob([byteArray], { type: mimeType });
};

export const createSampleAssetFromSharedSample = (
  sample: SharedSessionSample,
  previewUrl: string
): SampleAsset => {
  return {
    id: sample.id,
    name: sample.name,
    previewUrl,
    category: sample.category,
    tags: sample.tags,
    relativePath: sample.relativePath,
    bpm: sample.bpm,
    musicalKey: sample.musicalKey,
  };
};

export const createSessionStateHash = (
  projectState: Partial<ProjectState>,
  sampleMetadataOverrides: SampleMetadataOverrides
): string => {
  const toCanonicalValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => toCanonicalValue(item));
    }

    if (value && typeof value === "object") {
      const recordValue = value as Record<string, unknown>;
      const canonicalRecord: Record<string, unknown> = {};

      Object.keys(recordValue)
        .sort((left, right) => left.localeCompare(right))
        .forEach((key) => {
          const nestedValue = recordValue[key];
          if (nestedValue === undefined) {
            return;
          }

          canonicalRecord[key] = toCanonicalValue(nestedValue);
        });

      return canonicalRecord;
    }

    return value;
  };

  return JSON.stringify(
    toCanonicalValue({
      projectState,
      sampleMetadataOverrides,
    })
  );
};

export const createCollaborativeProjectState = (
  projectState: Partial<ProjectState>
): Partial<ProjectState> => {
  // Keep collaboration payload limited to shared model data.
  // Local view state (active group/pattern/panel) and top-level active-group mirrors
  // are intentionally excluded so collaborators can work in different UI contexts
  // without stomping each other's step edits.
  const {
    activePadGroupId: _activePadGroupId,
    activePatternId: _activePatternId,
    activeSceneId: _activeSceneId,
    padLoopEnabled: _padLoopEnabled,
    padNames: _padNames,
    padPolyphony: _padPolyphony,
    padRowMuted: _padRowMuted,
    padSampleIds: _padSampleIds,
    padSampleSettings: _padSampleSettings,
    padStepLength: _padStepLength,
    padStepOctaves: _padStepOctaves,
    padStepSequence: _padStepSequence,
    padVolumes: _padVolumes,
    sampleSourceType: _sampleSourceType,
    sampleRootDir: _sampleRootDir,
    sampleReferences: _sampleReferences,
    sequencerPatterns: _sequencerPatterns,
    sequencerPanelMode: _sequencerPanelMode,
    ...collaborativeState
  } = projectState;

  if (collaborativeState.padGroups) {
    const collaborativePadGroups: Record<string, unknown> = {};
    PAD_GROUP_IDS.forEach((groupId) => {
      const groupState = collaborativeState.padGroups?.[groupId];
      if (!groupState || typeof groupState !== "object") {
        collaborativePadGroups[groupId] = groupState;
        return;
      }

      const { activePatternId: _groupActivePatternId, ...groupStateWithoutView } = groupState;
      collaborativePadGroups[groupId] = groupStateWithoutView;
    });

    collaborativeState.padGroups = collaborativePadGroups as unknown as ProjectState["padGroups"];
  }

  return collaborativeState;
};

export const mergeCollaborativeProjectStateWithLocalView = (
  collaborativeProjectState: Partial<ProjectState>,
  localProjectState: Partial<ProjectState>
): Partial<ProjectState> => {
  const mergedProjectState: Partial<ProjectState> = {
    ...collaborativeProjectState,
    activePadGroupId: localProjectState.activePadGroupId,
    activePatternId: localProjectState.activePatternId,
    activeSceneId: localProjectState.activeSceneId,
    sequencerPanelMode: localProjectState.sequencerPanelMode,
  };

  if (collaborativeProjectState.padGroups && localProjectState.padGroups) {
    const collaborativePadGroups = { ...collaborativeProjectState.padGroups };
    const localPadGroups = localProjectState.padGroups;

    PAD_GROUP_IDS.forEach((groupId) => {
      const groupState = collaborativePadGroups[groupId];
      if (!groupState || typeof groupState !== "object") {
        return;
      }

      const localGroupState = localPadGroups[groupId];
      collaborativePadGroups[groupId] = {
        ...groupState,
        activePatternId: localGroupState.activePatternId,
      };
    });

    mergedProjectState.padGroups = collaborativePadGroups;
  }

  return mergedProjectState;
};

export const parseSessionServerMessage = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.type !== "string") {
    return null;
  }

  return value;
};

export const isSessionSyncDebugEnabled = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem("noodlr.sessionDebug") === "1";
  } catch {
    return false;
  }
};

export const readWebSocketMessageText = async (data: unknown): Promise<string> => {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Blob) {
    return data.text();
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }

  throw new Error("Unsupported websocket payload type.");
};
