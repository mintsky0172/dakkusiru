import { StickerPackCategory } from "../constants/packCategories";

export interface StickerPanelItem {
    id: string;
    name: string;
    imageSource?: any;
}

export interface StickerPanelPack {
    id: string;
    title: string;
    category: StickerPackCategory;
    thumbnailSource?: any;
    stickers: StickerPanelItem[];
}
