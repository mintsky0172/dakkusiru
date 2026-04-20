import { StickerPanelPack } from "../types/stickerPanel";

export const mockStickerPacks: StickerPanelPack[] = [
    {
    id: "breakfast-pack",
    title: "아침식사팩",
    category: "food",
    thumbnailSource: require("../../assets/pack/thumbnails/breakfast.png"),
    stickers: [
      {
        id: 'egg',
        name: '계란후라이',
        imageSource: require('../../assets/pack/mock/breakfast/egg.png'),
      },
      {
        id: 'apple',
        name: '사과',
        imageSource: require('../../assets/pack/mock/breakfast/apple.png'),
      },
      {
        id: 'bacon',
        name: '베이컨',
        imageSource: require('../../assets/pack/mock/breakfast/bacon.png'),
      },
      {
        id: 'banana',
        name: '바나나',
        imageSource: require('../../assets/pack/mock/breakfast/banana.png'),
      },
    ]
  },
  {
    id: "pancake-pack",
    title: "팬케이크팩",
    category: "food",
    thumbnailSource: require("../../assets/pack/thumbnails/pancake.png"),
    stickers: [
      {
        id: 'pancake1',
        name: '팬케이크1',
        imageSource: require('../../assets/pack/mock/pancake/pancake1.png'),
      },
      {
        id: 'pancake2',
        name: '팬케이크2',
        imageSource: require('../../assets/pack/mock/pancake/pancake2.png'),
      },
      {
        id: 'pancake3',
        name: '팬케이크3',
        imageSource: require('../../assets/pack/mock/pancake/pancake3.png'),
      },
      {
        id: 'pancake4',
        name: '팬케이크4',
        imageSource: require('../../assets/pack/mock/pancake/pancake4.png'),
      },
    ]
  },
]