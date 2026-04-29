import { ShopPack } from "../types/shop";

export const mockCoinBalance = 10000;

export const mockPacks: ShopPack[] = [
  {
    id: "1",
    title: "아침식사팩",
    category: "food",
    kind: 'sticker',
    status: "free",
    ownStatus: "owned",
    thumbnailSource: require("../../assets/sticker_pack/thumbnails/breakfast.png"),
    description: '아침 감성에 어울리는 음식들로 구성된 팩이에요.',
    previewStickers: [
      {
        id: '1-1',
        name: '계란후라이',
        imageSource: require('../../assets/sticker_pack/mock/breakfast/egg.png'),
      },
      {
        id: '1-2',
        name: '사과',
        imageSource: require('../../assets/sticker_pack/mock/breakfast/apple.png'),
      },
      {
        id: '1-3',
        name: '베이컨',
        imageSource: require('../../assets/sticker_pack/mock/breakfast/bacon.png'),
      },
      {
        id: '1-4',
        name: '바나나',
        imageSource: require('../../assets/sticker_pack/mock/breakfast/banana.png'),
      },
    ]
  },
  {
    id: "2",
    title: "팬케이크팩",
    category: "food",
    kind: 'sticker',
    status: "free",
    ownStatus: "owned",
    thumbnailSource: require("../../assets/sticker_pack/thumbnails/pancake.png"),
     description: '달콤한 브런치 느낌의 팬케이크들이 담겨 있어요.',
    previewStickers: [
      {
        id: '2-1',
        name: '팬케이크1',
        imageSource: require('../../assets/sticker_pack/mock/pancake/pancake1.png'),
      },
      {
        id: '2-2',
        name: '팬케이크2',
        imageSource: require('../../assets/sticker_pack/mock/pancake/pancake2.png'),
      },
      {
        id: '2-3',
        name: '팬케이크3',
        imageSource: require('../../assets/sticker_pack/mock/pancake/pancake3.png'),
      },
      {
        id: '2-4',
        name: '팬케이크4',
        imageSource: require('../../assets/sticker_pack/mock/pancake/pancake4.png'),
      },
    ]
  },
  {
    id: "3",
    title: "배달음식팩",
    category: "food",
    kind: 'sticker',
    status: "priced",
    priceLabel: "1,000",
    ownStatus: "not_owned",
    thumbnailSource: require("../../assets/sticker_pack/thumbnails/baedal.png"),
     description: '보기만 해도 배고파지는 다양한 배달음식들로 구성되어 있어요.',
    previewStickers: [
      {
        id: '3-1',
        name: '짜장면',
        imageSource: require('../../assets/sticker_pack/mock/baedal/jjajang.png'),
      },
      {
        id: '3-2',
        name: '짬뽕',
        imageSource: require('../../assets/sticker_pack/mock/baedal/jjambbong.png'),
      },
      {
        id: '3-3',
        name: '탕수육',
        imageSource: require('../../assets/sticker_pack/mock/baedal/tangsuyook.png'),
      },
      {
        id: '3-4',
        name: '마라탕',
        imageSource: require('../../assets/sticker_pack/mock/baedal/maratang.png'),
      },
    ]
  },
  {
    id: "4",
    title: "딸기디저트팩",
    category: "food",
    kind: 'sticker',
    status: "priced",
    ownStatus: "not_owned",
    priceLabel: "1,000",
    thumbnailSource: require("../../assets/sticker_pack/thumbnails/strawberry.png"),
     description: '사랑스러운 비주얼의 딸기 디저트로 구성된 팩이에요.',
    previewStickers: [
      {
        id: '4-1',
        name: '딸기 수건케이크',
        imageSource: require('../../assets/sticker_pack/mock/strawberry_dessert/berry1.png'),
      },
      {
        id: '4-2',
        name: '딸기 사각케이크',
        imageSource: require('../../assets/sticker_pack/mock/strawberry_dessert/berry2.png'),
      },
      {
        id: '4-3',
        name: '딸기 모찌',
        imageSource: require('../../assets/sticker_pack/mock/strawberry_dessert/berry3.png'),
      },
      {
        id: '4-4',
        name: '딸기 조각',
        imageSource: require('../../assets/sticker_pack/mock/strawberry_dessert/berry4.png'),
      },
    ]
  },
  {
    id: '5',
    title: '기본 배경팩',
    category: 'grid',
    kind: 'background',
    status: 'free',
    ownStatus: 'owned',
    thumbnailSource: require('../../assets/background_pack/thumbnails/basic.png'),
    description: '다양한 용도로 활용할 수 있는 기본 배경들이 담긴 팩이에요.',
    previewBackgrounds: [
      {
        id: '5-1',
        name: '그리드 배경',
        imageSource: require('../../assets/background_pack/mock/white_grid.png'),
      },
      {
        id: '5-2',
        name: '체크 배경',
        imageSource: require('../../assets/background_pack/mock/mint_check.png'),
      },
      {
        id: '5-3',
        name: '방 배경',
        imageSource: require('../../assets/background_pack/mock/room.png'),
      },
      {
        id: '5-4',
        name: '접시 배경',
        imageSource: require('../../assets/background_pack/mock/plate.png'),
      },
    ]
  }
];
