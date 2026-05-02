import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

const ASSET_BUCKET = "dakku-assets";

interface UploadAdminAssetParams {
  path: string;
  base64: string;
  contentType?: string;
}

export async function uploadAdminAsset({
  path,
  base64,
  contentType = "image/png",
}: UploadAdminAssetParams) {
  const { data, error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, decode(base64), {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`[dakku-assets 업로드 실패] ${error.message}`);
  }

  return data.path;
}

export async function deleteAdminAssets(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (!uniquePaths.length) return;

  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .remove(uniquePaths);

  if (error) {
    throw new Error(`[dakku-assets 삭제 실패] ${error.message}`);
  }
}

export async function listAdminAssetPaths(folderPath: string) {
  const { data, error } = await supabase.storage
    .from(ASSET_BUCKET)
    .list(folderPath, {
      limit: 1000,
      offset: 0,
    });

  if (error) {
    throw new Error(`[dakku-assets 목록 조회 실패] ${error.message}`);
  }

  return (data ?? [])
    .filter((item) => item.id)
    .map((item) => `${folderPath}/${item.name}`);
}

export function getPackAssetFolderPath(params: {
  kind: "sticker" | "background";
  packId: string;
}) {
  const folder = params.kind === "sticker" ? "stickers" : "backgrounds";
  return `packs/${folder}/${params.packId}`;
}

export function getPackThumbnailPath(params: {
  kind: "sticker" | "background";
  packId: string;
}) {
  return `${getPackAssetFolderPath(params)}/thumbnail.png`;
}

export function getPackItemImagePath(params: {
  kind: "sticker" | "background";
  packId: string;
  itemId: string;
}) {
  return `${getPackAssetFolderPath(params)}/items/${params.itemId}.png`;
}
