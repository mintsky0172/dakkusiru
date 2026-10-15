import { PackKind, ShopPack } from "../types/shop";

interface ShopPackFilters {
  kind: "all" | PackKind;
  category: string;
  search: string;
  freeOnly: boolean;
}

export function filterShopPacks(packs: ShopPack[], filters: ShopPackFilters) {
  const keyword = filters.search.trim().toLowerCase();

  return packs.filter((pack) => {
    if (filters.freeOnly && pack.status !== "free") return false;
    if (filters.kind !== "all" && pack.kind !== filters.kind) return false;
    if (filters.kind !== "all" && filters.category !== "all" && pack.category !== filters.category) return false;
    if (!keyword) return true;

    return [pack.title, pack.category, ...(pack.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
}
