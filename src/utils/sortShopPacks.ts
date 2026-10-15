import { ShopPack } from "../types/shop";

export type PackSortOrder = "latest" | "name" | "popular";

const getCreatedTime = (pack: ShopPack) => {
  const time = pack.createdAt ? Date.parse(pack.createdAt) : NaN;
  return Number.isFinite(time) ? time : -Infinity;
};

export function sortShopPacks(packs: ShopPack[], order: PackSortOrder) {
  return [...packs].sort((a, b) => {
    if (order === "popular") {
      const difference = (b.acquisitionCount ?? 0) - (a.acquisitionCount ?? 0);
      if (difference !== 0) return difference;
    }
    if (order !== "name") {
      const aTime = getCreatedTime(a);
      const bTime = getCreatedTime(b);
      if (aTime !== bTime) return aTime > bTime ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "ko") || a.id.localeCompare(b.id);
  });
}
