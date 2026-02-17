import {
  DEMO_KIT_AUTOLOAD_STORAGE_KEY,
  DEMO_KIT_IMPORTED_ID_PREFIX,
  IMPORTED_SAMPLE_ID_PREFIX,
  PAD_GROUP_IDS,
} from "../../constants";
import type { PadSampleIds } from "../../DrumpadController.types";
import type {
  ProjectSampleReference,
  ProjectSampleSourceType,
  ProjectState,
} from "../../../ProjectManager/ProjectManager.types";

export const isDemoKitImportedSampleId = (sampleId: string): boolean => {
  return sampleId.startsWith(`${IMPORTED_SAMPLE_ID_PREFIX}:${DEMO_KIT_IMPORTED_ID_PREFIX}:`);
};

const collectSampleIdsFromPadSampleIds = (padSampleIds: PadSampleIds | undefined): string[] => {
  if (!padSampleIds) {
    return [];
  }

  return Object.values(padSampleIds)
    .map((sampleId) => sampleId.trim())
    .filter((sampleId) => Boolean(sampleId));
};

export const collectProjectReferencedSampleIds = (projectState: Partial<ProjectState>): string[] => {
  const sampleIds = new Set<string>();

  if (projectState.padGroups) {
    PAD_GROUP_IDS.forEach((groupId) => {
      const groupState = projectState.padGroups?.[groupId];
      collectSampleIdsFromPadSampleIds(groupState?.padSampleIds).forEach((sampleId) =>
        sampleIds.add(sampleId)
      );
    });
  }

  collectSampleIdsFromPadSampleIds(projectState.padSampleIds).forEach((sampleId) =>
    sampleIds.add(sampleId)
  );

  return Array.from(sampleIds);
};

const normalizeProjectSampleReference = (value: unknown): ProjectSampleReference | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const sampleId = typeof record.sampleId === "string" ? record.sampleId.trim() : "";
  if (!sampleId) {
    return null;
  }

  const name =
    typeof record.name === "string" && record.name.trim() ? record.name.trim() : sampleId;
  const relativePath =
    typeof record.relativePath === "string" && record.relativePath.trim()
      ? record.relativePath.trim()
      : undefined;

  return {
    sampleId,
    name,
    relativePath,
  };
};

export const normalizeProjectSampleReferences = (value: unknown): ProjectSampleReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeProjectSampleReference(entry))
    .filter((entry): entry is ProjectSampleReference => Boolean(entry));
};

export const normalizeProjectSampleSourceType = (
  value: unknown
): ProjectSampleSourceType | null => {
  if (value === "path" || value === "directory-handle" || value === "imported") {
    return value;
  }

  return null;
};

export const hasDemoKitAutoLoaded = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(DEMO_KIT_AUTOLOAD_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const markDemoKitAutoLoaded = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_KIT_AUTOLOAD_STORAGE_KEY, "1");
  } catch {
    // Ignore localStorage errors; demo kit still imports.
  }
};
