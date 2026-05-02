import { supabase } from "../lib/supabase";
import {
  deleteAdminAssets,
  getPackAssetFolderPath,
  listAdminAssetPaths,
} from "./adminAssetUploadService";

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

export async function deleteAdminPack(packId: string) {
  const { data: pack, error: packFetchError } = await supabase
    .from("shop_packs")
    .select("kind, thumbnail_path")
    .eq("id", packId)
    .maybeSingle();

  if (packFetchError) {
    throw new Error(`[shop_packs 조회 실패] ${packFetchError.message}`);
  }

  const items = await fetchAdminPackItems(packId);
  const packKind =
    pack?.kind === "background" || pack?.kind === "sticker"
      ? pack.kind
      : null;
  const storageFolderPaths = packKind
    ? [
        getPackAssetFolderPath({ kind: packKind, packId }),
        `${getPackAssetFolderPath({ kind: packKind, packId })}/items`,
      ]
    : [];
  const storagePaths = (
    await Promise.all(storageFolderPaths.map((path) => listAdminAssetPaths(path)))
  ).flat();
  const assetPaths = [
    pack?.thumbnail_path,
    ...items.map((item) => item.image_path),
    ...storagePaths,
  ].filter((path): path is string => !!path);

  await deleteAdminAssets(assetPaths);

  const { error: itemsDeleteError } = await supabase
    .from("shop_pack_items")
    .delete()
    .eq("pack_id", packId);

  if (itemsDeleteError) {
    throw new Error(`[shop_pack_items 삭제 실패] ${itemsDeleteError.message}`);
  }

  const { error } = await supabase.from("shop_packs").delete().eq("id", packId);

  if (error) {
    throw new Error(`[shop_packs 삭제 실패] ${error.message}`);
  }
}

export async function deleteAdminPackItem(itemId: string) {
  const { error } = await supabase
    .from("shop_pack_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
