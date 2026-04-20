import { BackgroundItem } from "../types/backgroundPanel";

export const mockBackgrounds: BackgroundItem[] = [
    {
        id: 'grid-white',
        name: '화이트 모눈',
        category: 'grid',
        imageSource: require('../../assets/background_pack/mock/white_grid.png')
    },
    {
        id: 'grid-pink',
        name: '핑크 모눈',
        category: 'grid',
        imageSource: require('../../assets/background_pack/mock/pink_grid.png')
    },
    {
        id: 'check-beige',
        name: '베이지 체크',
        category: 'check',
        imageSource: require('../../assets/background_pack/mock/beige_check.png')
    },
    {
        id: 'check-mint',
        name: '민트 체크',
        category: 'check',
        imageSource: require('../../assets/background_pack/mock/mint_check.png')
    },
    {
        id: 'plate',
        name: '접시',
        category: 'deco',
        imageSource: require('../../assets/background_pack/mock/plate.png')
    },
    {
        id: 'room',
        name: '방',
        category: 'landscape',
        imageSource: require('../../assets/background_pack/mock/room.png')
    },
]