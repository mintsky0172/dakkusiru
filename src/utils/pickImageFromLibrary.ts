import * as ImagePicker from "expo-image-picker";

interface PickImageFromLibraryOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
}

export async function pickImageFromLibrary(
  options: PickImageFromLibraryOptions = {},
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("사진 라이브러리 접근 권한이 필요해요.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: options.allowsEditing ?? false,
    ...(options.aspect ? { aspect: options.aspect } : {}),
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}
