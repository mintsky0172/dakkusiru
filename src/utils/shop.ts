import { PackOwnStatus, ShopPack } from "../types/shop";

export function resolvePackOwnStatus(
  pack: ShopPack,
  ownedPackIds: string[],
): PackOwnStatus {
  if (pack.status === "free") return "owned";
  return ownedPackIds.includes(pack.id) ? "owned" : "not_owned";
}

export function resolvePack(pack: ShopPack, ownedPackIds: string[]): ShopPack {
  return {
    ...pack,
    ownStatus: resolvePackOwnStatus(pack, ownedPackIds),
  };
}

export function resolvePacks(
  packs: ShopPack[],
  ownedPackIds: string[],
): ShopPack[] {
  return packs.map((pack) => resolvePack(pack, ownedPackIds));
}

export function getPackBadgeLabel(pack: ShopPack) {
  if (pack.status === "free") return "무료";
  if (pack.ownStatus === "owned") return "보유중";
  return `${pack.coinPrice?.toLocaleString() ?? 0}코인`
}

export function getPackActionLabel(pack: ShopPack) {
  if (pack.status === "free") return "사용하기";
  if (pack.ownStatus === "owned") return "사용하기";
  return `${pack.coinPrice?.toLocaleString() ?? 0}코인으로 구매하기`;
}
