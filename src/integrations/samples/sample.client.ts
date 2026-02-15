import type {
  FetchSampleAssetsInput,
  FetchSampleAssetsOutput,
  SampleAsset,
} from "./sample.types";
import { normalizeSampleAsset } from "./sample.utilities";

const DEFAULT_SAMPLE_PROXY_BASE_URL = "/api/samples";

const getConfiguredBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_SAMPLE_PROXY_BASE_URL as string | undefined;
  return configuredBaseUrl?.trim() || DEFAULT_SAMPLE_PROXY_BASE_URL;
};

const buildSampleUrl = (path: string, params?: Record<string, string>): string => {
  const baseUrl = getConfiguredBaseUrl().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const url =
    baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
      ? new URL(`${baseUrl}${normalizedPath}`)
      : new URL(`${baseUrl}${normalizedPath}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value.trim()) {
        url.searchParams.set(key, value.trim());
      }
    });
  }

  return url.toString();
};

const parseSamplesFromPayload = (payload: unknown): SampleAsset[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeSampleAsset).filter((sample): sample is SampleAsset => Boolean(sample));
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { samples?: unknown }).samples)) {
    return (payload as { samples: unknown[] }).samples
      .map(normalizeSampleAsset)
      .filter((sample): sample is SampleAsset => Boolean(sample));
  }

  return [];
};

const parseResponsePayload = (payload: unknown): FetchSampleAssetsOutput => {
  if (Array.isArray(payload)) {
    return {
      samples: parseSamplesFromPayload(payload),
    };
  }

  if (payload && typeof payload === "object") {
    const record = payload as { rootDir?: unknown; samples?: unknown };
    const rootDir = typeof record.rootDir === "string" ? record.rootDir : undefined;
    return {
      rootDir,
      samples: parseSamplesFromPayload(record.samples),
    };
  }

  return {
    samples: [],
  };
};

export const fetchSampleAssets = async ({
  signal,
  rootDir,
}: FetchSampleAssetsInput): Promise<FetchSampleAssetsOutput> => {
  const response = await fetch(
    buildSampleUrl(
      "/samples",
      rootDir?.trim() ? { rootDir: rootDir.trim() } : undefined
    ),
    {
      method: "GET",
      signal,
    }
  );

  if (!response.ok) {
    let message = "Failed to load samples";
    try {
      const payload = (await response.json()) as { message?: string };
      if (typeof payload.message === "string" && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // Keep the default message.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as unknown;
  return parseResponsePayload(payload);
};
