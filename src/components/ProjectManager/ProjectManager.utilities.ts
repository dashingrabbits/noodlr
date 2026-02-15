import type { SavedProject, ProjectArchiveManifest } from "./ProjectManager.types";

export const SAVED_PROJECTS_STORAGE_KEY = "noodlr.savedProjects.session";
export const PROJECT_NAME_MAX_LENGTH = 64;
export const PROJECT_ARCHIVE_MANIFEST_FILE_NAME = "project.json";
export const PROJECT_ARCHIVE_EXTENSION = ".noodlr-project.zip";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const sanitizeProjectName = (value: string): string => {
  return value.trim().slice(0, PROJECT_NAME_MAX_LENGTH);
};

export const readSavedProjectsFromSession = (): SavedProject[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(SAVED_PROJECTS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((item): item is SavedProject => {
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

export const writeSavedProjectsToSession = (projects: SavedProject[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SAVED_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const createSavedProjectId = (): string => {
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

  return cleanedValue || "project";
};

const isProjectArchiveSampleEntry = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sampleId === "string" &&
    typeof value.name === "string" &&
    typeof value.filePath === "string"
  );
};

export const createProjectArchiveFileName = (projectName: string): string => {
  const safeProjectName = sanitizeFileNamePart(projectName).slice(0, 80);
  return `${safeProjectName}${PROJECT_ARCHIVE_EXTENSION}`;
};

export const isProjectArchiveManifest = (value: unknown): value is ProjectArchiveManifest => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.format === "noodlr-project" &&
    value.version === 1 &&
    typeof value.name === "string" &&
    typeof value.exportedAt === "string" &&
    isRecord(value.state) &&
    isRecord(value.sampleMetadataOverrides) &&
    Array.isArray(value.samples) &&
    value.samples.every(isProjectArchiveSampleEntry)
  );
};
