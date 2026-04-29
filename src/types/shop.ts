export type PackStatus = "free" | "priced";
export type PackOwnStatus = "not_owned" | "owned";
export type PackKind = 'sticker' | 'background';

export interface PackPreviewSticker {
  id: string;
  name: string;
  imageSource?: any;
}

export interface PackPreviewBackground {
  id: string;
  name: string;
  imageSource?: any;
  backgroundColor?: string;
}

interface BasePack {
  id: string;
  title: string;
  kind: PackKind;
  status: PackStatus;
  ownStatus: PackOwnStatus;
  coinPrice?: string;
  thumbnailSource?: any;
  isNew?: boolean;
  description?: string;
}

export interface StickerPack extends BasePack {
  kind: 'sticker';
  category: 'food' | 'deco' | 'memo' | 'etc';
  previewStickers: PackPreviewSticker[];
}

export interface BackgroundPack extends BasePack {
  kind: 'background';
  category: 'grid' | 'check' | 'deco' | 'landscape';
  previewBackgrounds?: PackPreviewBackground[];
}

export type ShopPack = StickerPack | BackgroundPack;