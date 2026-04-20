export interface CanvasBackground {
    id: string;
    imageSource?: any;
    backgroundColor?: string;
}

export interface CanvasSticker {
    id: string;
    stickerId: string;
    imageSource?: any;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
}

export interface EditorState {
    background: CanvasBackground | null;
    stickers: CanvasSticker[];
    selectedStickerId: string | null;
}