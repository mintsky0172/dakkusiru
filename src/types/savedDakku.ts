import { CanvasBackground, CanvasObject } from "./editor";

export interface SavedDakku {
    id: string;
    title: string;
    background: CanvasBackground | null;
    objects: CanvasObject[];
    thumbnailUri?: string;
    createdAt: string;
    updatedAt: string;
}