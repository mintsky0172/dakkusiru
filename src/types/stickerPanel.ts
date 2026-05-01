export interface StickerPanelItem {
    id: string;
    name: string;
    imageSource?: any;
}

export interface StickerPanelPack {
    id: string;
    title: string;
    category:
        | 'food'
        | 'character'
        | 'deco'
        | 'memo'
        | 'chat'
        | 'object'
        | 'nature'
        | 'masking_tape'
        | 'etc';
    thumbnailSource?: any;
    stickers: StickerPanelItem[];
}
