import { supabase } from "../services/supabase/client";

const ASSET_BUCKET = "dakku-assets";

export function getAssetPublicUrl(path?: string | null) {
  if (!path) return undefined;

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
