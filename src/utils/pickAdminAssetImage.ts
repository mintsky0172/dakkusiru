import * as ImagePicker from 'expo-image-picker';

export async function pickAdminAssetImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if(!permission.granted) {
        throw new Error('앨범 접근 권한이 필요합니다.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        base64: true,
    });

    if(result.canceled || !result.assets?.length) {
        return null;
    }

    const asset = result.assets[0];

    if(!asset.base64) {
        throw new Error('이미지 데이터를 읽어오지 못했어요.');
    }

    return asset;
}