import { CropPreset } from "../types/imageCrop";

export const imageCropPresets: CropPreset[] = [
    {
        key: 'square',
        label: '1:1',
        aspect: [1, 1],
    },
    {
        key: 'threeFour',
        label: '3:4',
        aspect: [3, 4],
    },
    {
        key: 'nineSixteen',
        label: '9:16',
        aspect: [9, 16],            
    },
    {
        key: 'free',
        label: '자유형',
    }
]