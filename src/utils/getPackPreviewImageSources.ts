import { ImageSourcePropType } from "react-native";
import { ShopPack } from "../types/shop";

export function getPackPreviewImageSources(
  pack: ShopPack,
  limit = Number.POSITIVE_INFINITY,
): (ImageSourcePropType | undefined)[] {
  const previewItems =
    pack.kind === "sticker" ? pack.previewStickers : (pack.previewBackgrounds ?? []);

  return previewItems.slice(0, limit).map((item) => item.imageSource);
}
