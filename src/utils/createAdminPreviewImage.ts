import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const ITEM_PREVIEW_MAX_SIZE = 256;

export async function createAdminPreviewImageBase64(params: {
  uri: string;
  width?: number | null;
  height?: number | null;
}) {
  const shouldResizeByWidth =
    !params.width || !params.height || params.width >= params.height;

  const result = await manipulateAsync(
    params.uri,
    [
      {
        resize: shouldResizeByWidth
          ? { width: ITEM_PREVIEW_MAX_SIZE }
          : { height: ITEM_PREVIEW_MAX_SIZE },
      },
    ],
    {
      base64: true,
      compress: 0.82,
      format: SaveFormat.WEBP,
    },
  );

  if (!result.base64) {
    throw new Error("미리보기 이미지 생성에 실패했어요.");
  }

  return result.base64;
}
