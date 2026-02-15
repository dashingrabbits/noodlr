import type {
  SampleAsset,
  SampleCategory,
  SampleMetadataOverride,
  SampleMetadataOverrides,
} from "./sample.types";

type UnknownRecord = Record<string, unknown>;

export const SAMPLE_CATEGORY_ORDER: SampleCategory[] = [
  "kicks",
  "808s",
  "loops",
  "one shots",
  "chops",
  "hats",
  "snares",
  "fx",
  "crash",
  "tom",
  "bass",
  "vox",
  "vocals",
  "uncategorized",
];

export const SAMPLE_METADATA_STORAGE_KEY = "noodlr.sampleMetadataOverrides";

const SAMPLE_CATEGORY_LABELS: Record<SampleCategory, string> = {
  kicks: "Kicks",
  "808s": "808s",
  loops: "Loops",
  "one shots": "One Shots",
  chops: "Chops",
  hats: "Hats",
  snares: "Snares",
  fx: "FX",
  crash: "Crash",
  tom: "Tom",
  bass: "Bass",
  vox: "Vox",
  vocals: "Vocals",
  uncategorized: "Uncategorized",
};

const CATEGORY_PATTERNS: Array<[SampleCategory, RegExp[]]> = [
  ["kicks", [/\bkicks?\b/, /\bkickdrum\b/]],
  ["808s", [/\b808s?\b/]],
  ["loops", [/\bloops?\b/]],
  ["one shots", [/\bone[\s_-]*shots?\b/, /\boneshots?\b/]],
  ["chops", [/\bchops?\b/]],
  ["hats", [/\bhi[\s_-]*hats?\b/, /\bhats?\b/, /\bhh\b/]],
  ["snares", [/\bsnares?\b/, /\bsnr\b/]],
  ["fx", [/\bfx\b/, /\beffects?\b/, /\bsfx\b/]],
  ["crash", [/\bcrash(?:es)?\b/]],
  ["tom", [/\btoms?\b/]],
  ["bass", [/\bbass\b/]],
  ["vox", [/\bvox\b/]],
  ["vocals", [/\bvocals?\b/]],
];

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null;
};

const readStringField = (record: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return "";
};

const readNumberField = (record: UnknownRecord, keys: string[]): number | undefined => {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const normalizeCategoryValue = (value: string): SampleCategory | null => {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  const aliasMap: Record<string, SampleCategory> = {
    kick: "kicks",
    kicks: "kicks",
    "808": "808s",
    "808s": "808s",
    loop: "loops",
    loops: "loops",
    "one shot": "one shots",
    "one shots": "one shots",
    oneshot: "one shots",
    oneshots: "one shots",
    chop: "chops",
    chops: "chops",
    hat: "hats",
    hats: "hats",
    snare: "snares",
    snares: "snares",
    fx: "fx",
    effect: "fx",
    effects: "fx",
    sfx: "fx",
    crash: "crash",
    crashes: "crash",
    tom: "tom",
    toms: "tom",
    bass: "bass",
    vox: "vox",
    vocal: "vocals",
    vocals: "vocals",
    uncategorized: "uncategorized",
  };
  return aliasMap[normalized] ?? null;
};

const normalizeTags = (tags: string[]): string[] => {
  const uniqueNormalizedTags = new Set<string>();
  tags.forEach((tag) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag) {
      uniqueNormalizedTags.add(normalizedTag);
    }
  });
  return Array.from(uniqueNormalizedTags);
};

export const buildSearchTextForSampleAsset = (sample: SampleAsset): string => {
  return [
    sample.name,
    sample.category,
    sample.relativePath || "",
    sample.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
};

export const parseSampleTagsInput = (value: string): string[] => {
  return normalizeTags(value.split(","));
};

export const readSampleMetadataOverrides = (): SampleMetadataOverrides => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(SAMPLE_METADATA_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsedValue)) {
      return {};
    }

    const entries = Object.entries(parsedValue);
    const normalizedEntries = entries.map(([sampleId, overrideValue]) => {
      if (!isRecord(overrideValue)) {
        return [sampleId, {} as SampleMetadataOverride] as const;
      }

      const name = readStringField(overrideValue, ["name"]);
      const category = normalizeCategoryValue(readStringField(overrideValue, ["category"]));
      const rawTags = Array.isArray(overrideValue.tags)
        ? overrideValue.tags.filter((tag): tag is string => typeof tag === "string")
        : [];

      return [
        sampleId,
        {
          ...(name ? { name } : {}),
          ...(category ? { category } : {}),
          ...(rawTags.length > 0 ? { tags: normalizeTags(rawTags) } : {}),
        } as SampleMetadataOverride,
      ] as const;
    });

    return Object.fromEntries(normalizedEntries);
  } catch {
    return {};
  }
};

export const writeSampleMetadataOverrides = (
  overrides: SampleMetadataOverrides
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAMPLE_METADATA_STORAGE_KEY, JSON.stringify(overrides));
};

export const applySampleMetadataOverride = (
  sample: SampleAsset,
  override?: SampleMetadataOverride
): SampleAsset => {
  if (!override) {
    return sample;
  }

  const normalizedOverrideName = override.name?.trim();
  const normalizedOverrideCategory = override.category;
  const normalizedOverrideTags = override.tags ? normalizeTags(override.tags) : sample.tags;

  return {
    ...sample,
    name: normalizedOverrideName || sample.name,
    category: normalizedOverrideCategory || sample.category,
    tags: normalizedOverrideTags,
  };
};

const categorizeByNameOrPath = (name: string, relativePath: string): SampleCategory => {
  const searchTarget = `${relativePath} ${name}`
    .toLowerCase()
    .replace(/[./\\_-]+/g, " ");

  for (const [category, patterns] of CATEGORY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(searchTarget))) {
      return category;
    }
  }

  return "uncategorized";
};

export const getSampleCategoryLabel = (category: SampleCategory): string => {
  return SAMPLE_CATEGORY_LABELS[category];
};

export const normalizeSampleAsset = (value: unknown): SampleAsset | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringField(value, ["id", "sample_id", "uuid"]);
  const name = readStringField(value, ["name", "title", "filename", "display_name"]);
  const relativePath = readStringField(value, ["relativePath", "relative_path", "path"]);
  const previewUrl = readStringField(value, [
    "previewUrl",
    "preview_url",
    "audio_url",
    "audioUrl",
    "url",
  ]);

  if (!id || !name || !previewUrl) {
    return null;
  }

  const rawCategory = readStringField(value, ["category"]);
  const category =
    normalizeCategoryValue(rawCategory) ?? categorizeByNameOrPath(name, relativePath);

  return {
    id,
    name,
    previewUrl,
    category,
    tags: [],
    relativePath,
    bpm: readNumberField(value, ["bpm"]),
    musicalKey: readStringField(value, ["key", "musical_key"]),
  };
};
