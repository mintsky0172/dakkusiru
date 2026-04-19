import { StickerPack } from "../types/shop";

export const mockCoinBalance = 10000;

export const mockPacks: StickerPack[] = [
  {
    id: "1",
    title: "아침식사팩",
    category: "food",
    status: "free",
    ownStatus: "owned",
    thumbnailSource: require("../../assets/pack/thumbnails/breakfast.png"),
    description: '아침 감성에 어울리는 음식들로 구성된 팩이에요.',
    previewStickers: [
      {
        id: '1-1',
        name: '계란후라이',
        imageSource: require('../../assets/pack/mock/breakfast/egg.png'),
      },
      {
        id: '1-2',
        name: '사과',
        imageSource: require('../../assets/pack/mock/breakfast/apple.png'),
      },
      {
        id: '1-3',
        name: '베이컨',
        imageSource: require('../../assets/pack/mock/breakfast/bacon.png'),
      },
      {
        id: '1-4',
        name: '바나나',
        imageSource: require('../../assets/pack/mock/breakfast/banana.png'),
      },
    ]
  },
  {
    id: "2",
    title: "팬케이크팩",
    category: "food",
    status: "free",
    ownStatus: "owned",
    thumbnailSource: require("../../assets/pack/thumbnails/pancake.png"),
     description: '달콤한 브런치 느낌의 팬케이크들이 담겨 있어요.',
    previewStickers: [
      {
        id: '2-1',
        name: '팬케이크1',
        imageSource: require('../../assets/pack/mock/pancake/pancake1.png'),
      },
      {
        id: '2-2',
        name: '팬케이크2',
        imageSource: require('../../assets/pack/mock/pancake/pancake2.png'),
      },
      {
        id: '2-3',
        name: '팬케이크3',
        imageSource: require('../../assets/pack/mock/pancake/pancake3.png'),
      },
      {
        id: '2-4',
        name: '팬케이크4',
        imageSource: require('../../assets/pack/mock/pancake/pancake4.png'),
      },
    ]
  },
  {
    id: "3",
    title: "배달음식팩",
    category: "food",
    status: "priced",
    priceLabel: "1,000",
    ownStatus: "not_owned",
    thumbnailSource: require("../../assets/pack/thumbnails/baedal.png"),
     description: '보기만 해도 배고파지는 다양한 배달음식들로 구성되어 있어요.',
    previewStickers: [
      {
        id: '3-1',
        name: '짜장면',
        imageSource: require('../../assets/pack/mock/baedal/jjajang.png'),
      },
      {
        id: '3-2',
        name: '짬뽕',
        imageSource: require('../../assets/pack/mock/baedal/jjambbong.png'),
      },
      {
        id: '3-3',
        name: '탕수육',
        imageSource: require('../../assets/pack/mock/baedal/tangsuyook.png'),
      },
      {
        id: '3-4',
        name: '마라탕',
        imageSource: require('../../assets/pack/mock/baedal/maratang.png'),
      },
    ]
  },
  {
    id: "4",
    title: "딸기디저트팩",
    category: "food",
    status: "priced",
    ownStatus: "not_owned",
    priceLabel: "1,000",
    thumbnailSource: require("../../assets/pack/thumbnails/strawberry.png"),
     description: '사랑스러운 비주얼의 딸기 디저트로 구성된 팩이에요.',
    previewStickers: [
      {
        id: '4-1',
        name: '딸기 수건케이크',
        imageSource: require('../../assets/pack/mock/strawberry_dessert/berry1.png'),
      },
      {
        id: '4-2',
        name: '딸기 사각케이크',
        imageSource: require('../../assets/pack/mock/strawberry_dessert/berry2.png'),
      },
      {
        id: '4-3',
        name: '딸기 모찌',
        imageSource: require('../../assets/pack/mock/strawberry_dessert/berry3.png'),
      },
      {
        id: '4-4',
        name: '딸기 조각',
        imageSource: require('../../assets/pack/mock/strawberry_dessert/berry4.png'),
      },
    ]
  },
];
