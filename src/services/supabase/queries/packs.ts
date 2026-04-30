import { supabase } from "../client";
import { ShopPack } from "../../../types/shop";
import { getAssetPublicUrl } from "../../../utils/getAssetPublicUrl";

export async function fetchShopPacksFromSupabase(): Promise<ShopPack[]> {
  const { data, error } = await supabase
    .from("shop_packs")
    .select(
      `
            *,
            shop_pack_items (*)
            `,
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("sort_order", {
      referencedTable: "shop_pack_items",
      ascending: true,
    });

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
      thumbnailSource: pack.thumbnail_path
        ? { uri: getAssetPublicUrl(pack.thumbnail_path) }
        : undefined,
      isNew: pack.is_new,
      description: pack.description ?? undefined,
    };

    if (pack.kind === "sticker") {
      return {
        ...base,
        kind: "sticker" as const,
        previewStickers: (pack.shop_pack_items ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
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
        imageSource: item.image_path
          ? { uri: getAssetPublicUrl(item.image_path) }
          : undefined,
        backgroundColor: item.background_color ?? undefined,
      })),
    };
  });
}
