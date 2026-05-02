import { supabase } from "../../../lib/supabase";
import { ShopPack } from "../../../types/shop";
import { getAssetPublicUrl } from "../../../utils/getAssetPublicUrl";

const NEW_PACK_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

function isPackCreatedRecently(createdAt?: string | null) {
  if (!createdAt) return false;

  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) return false;

  return Date.now() - createdTime <= NEW_PACK_THRESHOLD_MS;
}

async function fetchShopPackRows(params: {
  orderByLatest: boolean;
  includeInactive?: boolean;
}) {
  let query = supabase
    .from("shop_packs")
    .select(
      `
            *,
            shop_pack_items (*)
            `,
    );

  if (!params.includeInactive) {
    query = query.eq("is_active", true);
  }

  query = params.orderByLatest
    ? query.order("updated_at", { ascending: false })
    : query.order("sort_order", { ascending: true });

  return query.order("sort_order", {
      referencedTable: "shop_pack_items",
      ascending: true,
    });
}

export async function fetchShopPacksFromSupabase(params?: {
  includeInactive?: boolean;
}): Promise<ShopPack[]> {
  let { data, error } = await fetchShopPackRows({
    orderByLatest: true,
    includeInactive: params?.includeInactive,
  });

  if (error) {
    const fallbackResult = await fetchShopPackRows({
      orderByLatest: false,
      includeInactive: params?.includeInactive,
    });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) throw error;

  return (data ?? []).map((pack: any) => {
    const base = {
      id: pack.id,
      title: pack.title,
      kind: pack.kind,
      category: pack.category,
      status: pack.status,
      ownStatus: "not_owned" as const,
      coinPrice: pack.coin_price ?? undefined,
      thumbnailPath: pack.thumbnail_path ?? undefined,
      thumbnailSource: pack.thumbnail_path
        ? { uri: getAssetPublicUrl(pack.thumbnail_path) }
        : undefined,
      isNew: isPackCreatedRecently(pack.created_at ?? pack.updated_at),
      isActive: pack.is_active ?? true,
      description: pack.description ?? undefined,
      tags: pack.tags ?? [],
    };

    if (pack.kind === "sticker") {
      return {
        ...base,
        kind: "sticker" as const,
        previewStickers: (pack.shop_pack_items ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          imagePath: item.image_path ?? null,
          imageSource: item.image_path
            ? { uri: getAssetPublicUrl(item.image_path) }
            : undefined,
        })),
      };
    }

    return {
      ...base,
      kind: "background" as const,
      previewBackgrounds: (pack.shop_pack_items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        imagePath: item.image_path ?? null,
        imageSource: item.image_path
          ? { uri: getAssetPublicUrl(item.image_path) }
          : undefined,
        backgroundColor: item.background_color ?? undefined,
      })),
    };
  });
}
