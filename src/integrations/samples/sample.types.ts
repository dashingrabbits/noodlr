export type SampleCategory =
  | "kicks"
  | "808s"
  | "loops"
  | "one shots"
  | "chops"
  | "hats"
  | "snares"
  | "fx"
  | "crash"
  | "tom"
  | "bass"
  | "vox"
  | "vocals"
  | "uncategorized";

export interface SampleAsset {
  id: string;
  name: string;
  previewUrl: string;
  category: SampleCategory;
  tags: string[];
  relativePath?: string;
  bpm?: number;
  musicalKey?: string;
}

export interface FetchSampleAssetsInput {
  signal?: AbortSignal;
  rootDir?: string;
}

export interface FetchSampleAssetsOutput {
  rootDir?: string;
  samples: SampleAsset[];
}

export interface SampleMetadataOverride {
  name?: string;
  category?: SampleCategory;
  tags?: string[];
}

export type SampleMetadataOverrides = Record<string, SampleMetadataOverride>;
