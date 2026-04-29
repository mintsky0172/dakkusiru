export type CropPresetKey = "square" | "threeFour" | "nineSixteen" | "free";

export interface CropPreset {
  key: CropPresetKey;
  label: string;
  aspect?: [number, number];
}
