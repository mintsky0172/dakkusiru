import * as ImagePicker from "expo-image-picker";

export async function pickImageFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("사진 라이브러리 접근 권한이 필요해요.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}
