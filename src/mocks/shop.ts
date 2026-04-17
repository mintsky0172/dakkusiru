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
  },
  {
    id: "2",
    title: "팬케이크팩",
    category: "food",
    status: "free",
    ownStatus: "owned",
    thumbnailSource: require("../../assets/pack/thumbnails/pancake.png"),
  },
  {
    id: "3",
    title: "배달음식팩",
    category: "food",
    status: "priced",
    priceLabel: "1,000",
    ownStatus: "not_owned",
    thumbnailSource: require("../../assets/pack/thumbnails/baedal.png"),
  },
  {
    id: "4",
    title: "딸기디저트팩",
    category: "food",
    status: "priced",
    ownStatus: "not_owned",
    priceLabel: "1,000",
    thumbnailSource: require("../../assets/pack/thumbnails/strawberry.png"),
  },
];
