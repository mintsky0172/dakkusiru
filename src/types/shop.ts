export type PackStatus = "free" | "priced";
export type PackOwnStatus = "not_owned" | "owned";

export interface PackPreviewSticker {
  id: string;
  name: string;
  imageSource?: any;
}

export interface StickerPack {
  id: string;
  title: string;
  category: "all" | "food" | "deco" | "etc";
  status: PackStatus;
  ownStatus: PackOwnStatus;
  priceLabel?: string;
  thumbnailSource?: any;
  isNew?: boolean;
  description?: string;
  previewStickers?: PackPreviewSticker[];
}
