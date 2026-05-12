import { BackgroundPack } from "./shop";

export interface BackgroundItem {
    id: string;
    name: string;
    category: BackgroundPack["category"];
    imageSource?: any;
    originalImageSource?: any;
    backgroundColor?: string;
}
