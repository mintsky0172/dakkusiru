import {
  BackgroundPackCategory,
  StickerPackCategory,
} from "../constants/packCategories";

export type PackStatus = "free" | "priced";
export type PackOwnStatus = "not_owned" | "owned";
export type PackKind = "sticker" | "background";

export interface PackPreviewSticker {
  id: string;
  name: string;
  imagePath?: string | null;
  previewImagePath?: string | null;
  imageSource?: any;
  originalImageSource?: any;
}

export interface PackPreviewBackground {
  id: string;
  name: string;
  imagePath?: string | null;
  previewImagePath?: string | null;
  imageSource?: any;
  originalImageSource?: any;
  backgroundColor?: string;
}

interface BasePack {
  id: string;
  title: string;
  kind: PackKind;
  status: PackStatus;
  ownStatus: PackOwnStatus;
  coinPrice?: string;
  thumbnailPath?: string;
  thumbnailSource?: any;
  isNew?: boolean;
  isActive?: boolean;
  description?: string;
  tags?: string[];
}

export interface StickerPack extends BasePack {
  kind: "sticker";
  category: StickerPackCategory;
  previewStickers: PackPreviewSticker[];
}

export interface BackgroundPack extends BasePack {
  kind: "background";
  category: BackgroundPackCategory;
  previewBackgrounds?: PackPreviewBackground[];
}

export type ShopPack = StickerPack | BackgroundPack;

export interface RemotePackItem {
  id: string;
  pack_id: string;
  name: string;
  image_path?: string | null;
  preview_image_path?: string | null;
  background_color?: string | null;
}

export interface RemoteShopPack {
  id: string;
  kind: "sticker" | "background";
  title: string;
  category: string;
  status: "free" | "priced";
  coin_price?: number | null;
  thumbnail_path?: string | null;
  description: string | null;
  is_new: boolean;
  is_active?: boolean | null;
  shop_pack_items?: RemotePackItem[];
  tags?: string[] | null;
}
