export interface StickerPanelItem {
    id: string;
    name: string;
    imageSource?: any;
}

export interface StickerPanelPack {
    id: string;
    title: string;
    category: 'food' | 'deco' | 'etc';
    thumbnailSource?: any;
    stickers: StickerPanelItem[];
}