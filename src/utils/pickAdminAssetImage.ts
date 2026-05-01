import * as ImagePicker from "expo-image-picker";

export async function pickAdminAssetImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("앨범 접근 권한이 필요합니다.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: true,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.filter((asset) => !!asset.base64);
}
