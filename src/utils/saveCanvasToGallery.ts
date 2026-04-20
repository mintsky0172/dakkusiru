import * as MediaLibrary from "expo-media-library";

export async function saveCanvasToGallery(localUri: string) {
  const permission = await MediaLibrary.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error("사진 보관함 권한이 필요해요.");
  }

  const asset = await MediaLibrary.createAssetAsync(localUri);

  // 전용 앨범 만들기(선택)
  const albumName = "다꾸시루";
  const album = await MediaLibrary.getAlbumAsync(albumName);

  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
  } else {
    await MediaLibrary.createAlbumAsync(albumName, asset, true);
  }

  return asset;
}
