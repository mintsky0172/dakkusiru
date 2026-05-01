export type PackStatus = "free" | "priced";
export type PackOwnStatus = "not_owned" | "owned";
export type PackKind = "sticker" | "background";

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
  tags?: string[];
}

export interface StickerPack extends BasePack {
  kind: "sticker";
  category:
    | "food"
    | "character"
    | "deco"
    | "memo"
    | "chat"
    | "object"
    | "nature"
    | "masking_tape"
    | "etc";
  previewStickers: PackPreviewSticker[];
}

export interface BackgroundPack extends BasePack {
  kind: "background";
  category: "grid" | "check" | 'dot' | 'paper' | 'color' | 'room' | "deco" | "landscape";
  previewBackgrounds?: PackPreviewBackground[];
}

export type ShopPack = StickerPack | BackgroundPack;

export interface RemotePackItem {
  id: string;
  pack_id: string;
  name: string;
  image_path?: string | null;
  background_color?: string | null;
  sort_order: number;
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
  sort_order: number;
  shop_pack_items?: RemotePackItem[];
  tags?: string[] | null;
}
