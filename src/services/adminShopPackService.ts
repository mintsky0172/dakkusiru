import { supabase } from "../lib/supabase";

export type AdminPackKind = "sticker" | "background";
export type AdminPackStatus = "free" | "priced";

export interface AdminPackItem {
  id: string;
  pack_id: string;
  name: string;
  image_path?: string | null;
  background_color?: string | null;
  sort_order: number;
}

export interface UpsertAdminPackParams {
  id: string;
  kind: AdminPackKind;
  title: string;
  category: string;
  status: AdminPackStatus;
  coinPrice?: number | null;
  thumbnailPath?: string | null;
  description?: string | null;
  isNew?: boolean;
  sortOrder?: number;
  tags?: string[];
}

export interface UpsertAdminPackItemParams {
  id: string;
  packId: string;
  name: string;
  imagePath?: string | null;
  backgroundColor: string | null;
  sortOrder?: number;
}

export async function fetchAdminPackItems(
  packId: string,
): Promise<AdminPackItem[]> {
  const { data, error } = await supabase
    .from("shop_pack_items")
    .select("id, pack_id, name, image_path, background_color, sort_order")
    .eq("pack_id", packId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function upsertAdminPack(params: UpsertAdminPackParams) {
  const { error } = await supabase.from("shop_packs").upsert({
    id: params.id,
    kind: params.kind,
    title: params.title,
    category: params.category,
    status: params.status,
    coin_price: params.status === "priced" ? (params.coinPrice ?? 0) : null,
    thumbnail_path: params.thumbnailPath ?? null,
    description: params.description ?? null,
    is_new: params.isNew ?? false,
    sort_order: params.sortOrder ?? 0,
    is_active: true,
    updated_at: new Date().toISOString(),
    tags: params.tags ?? [],
  });

  if (error) {
    throw new Error(`[shop_packs 저장 실패] ${error.message}`);
  }
}

export async function upsertAdminPackItem(params: UpsertAdminPackItemParams) {
  const { error } = await supabase.from("shop_pack_items").upsert({
    id: params.id,
    pack_id: params.packId,
    name: params.name,
    image_path: params.imagePath ?? null,
    background_color: params.backgroundColor ?? null,
    sort_order: params.sortOrder ?? 0,
  });

  if (error) {
    throw new Error(`[shop_pack_items 저장 실패] ${error.message}`);
  }
}

export async function deleteAdminPackItem(itemId: string) {
  const { error } = await supabase
    .from("shop_pack_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
