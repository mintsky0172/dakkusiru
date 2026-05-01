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

export function getPackThumbnailPath(params: {
  kind: "sticker" | "background";
  packId: string;
}) {
  const folder = params.kind === "sticker" ? "stickers" : "backgrounds";
  return `packs/${folder}/${params.packId}/thumbnail.png`;
}

export function getPackItemImagePath(params: {
  kind: "sticker" | "background";
  packId: string;
  itemId: string;
}) {
  const folder = params.kind === "sticker" ? "stickers" : "backgrounds";
  return `packs/${folder}/${params.packId}/items/${params.itemId}.png`;
}
