export interface CanvasBackground {
    id: string;
    imageSource?: any;
    backgroundColor?: string;
}

export type CanvasObjectType = 'sticker' | 'text';

interface BaseCanvasObject {
    id: string;
    type: CanvasObjectType
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
}

export interface CanvasSticker extends BaseCanvasObject {
    type: 'sticker';
    stickerId: string;
    imageSource?: any;
}

export interface CanvasText extends BaseCanvasObject {
    type: 'text';
    text: string;
    fontSize: number;
    color: string;
}

export type CanvasObject = CanvasSticker | CanvasText;

export type ResizeHandleAxis = 'proportional' | 'x' | 'y' | 'xy';

export interface ObjectResizeOptions {
    source?: 'transform' | 'content';
    axis?: ResizeHandleAxis;
}

export interface EditorState {
    background: CanvasBackground | null;
    objects: CanvasObject[];
    selectedObjectId: string | null;
}
