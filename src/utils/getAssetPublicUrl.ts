import { supabase } from "../lib/supabase";

const ASSET_BUCKET = "dakku-assets";
const ASSET_BASE_URL = process.env.EXPO_PUBLIC_ASSET_BASE_URL;

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getAssetPublicUrl(path?: string | null) {
  if (!path) return undefined;

  if (ASSET_BASE_URL) {
    return joinUrl(ASSET_BASE_URL, path);
  }

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
