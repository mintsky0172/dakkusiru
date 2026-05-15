import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

interface UploadAdminAssetParams {
  path: string;
  base64: string;
  contentType?: string;
}

async function invokeAdminR2Assets<T>(body: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-r2-assets`;
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `[R2 asset 함수 실패] ${
        data?.error ?? `${response.status} ${response.statusText}`
      }`,
    );
  }

  return data as T;
}

export async function uploadAdminAsset({
  path,
  base64,
  contentType = "image/png",
}: UploadAdminAssetParams) {
  const data = await invokeAdminR2Assets<{ uploadUrl: string; path: string }>({
    action: "createUploadUrl",
    path,
    contentType,
  });

  if (!data?.uploadUrl) {
    throw new Error("[R2 업로드 URL 생성 실패] uploadUrl이 비어 있어요.");
  }

  const response = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: decode(base64) as ArrayBuffer,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`[R2 업로드 실패] ${response.status} ${message}`);
  }

  return data.path;
}

export async function deleteAdminAssets(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (!uniquePaths.length) return;

  await invokeAdminR2Assets({
    action: "delete",
    paths: uniquePaths,
  });
}

export async function listAdminAssetPaths(folderPath: string) {
  const data = await invokeAdminR2Assets<{ paths: string[] }>({
    action: "list",
    folderPath,
  });

  return data?.paths ?? [];
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
  version?: string | number;
}) {
  const suffix = params.version ? `-${params.version}` : "";
  return `${getPackAssetFolderPath(params)}/thumbnail${suffix}.png`;
}

export function getPackItemImagePath(params: {
  kind: "sticker" | "background";
  packId: string;
  itemId: string;
}) {
  return `${getPackAssetFolderPath(params)}/items/${params.itemId}.png`;
}

export function getPackItemPreviewImagePath(params: {
  kind: "sticker" | "background";
  packId: string;
  itemId: string;
}) {
  return `${getPackAssetFolderPath(params)}/previews/${params.itemId}.webp`;
}
