export interface BackgroundItem {
    id: string;
    name: string;
    category: 'grid' | 'check' | 'deco' | 'landscape';
    imageSource?: any;
    backgroundColor?: string;
}