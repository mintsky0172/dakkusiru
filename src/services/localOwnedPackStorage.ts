import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dakku_siru_owned_pack_ids';

export async function loadOwnedPackIdsFromLocal(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    try {
        const parsed = JSON.parse(raw);

        if(!Array.isArray(parsed)) return [];

        return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
        return [];
    }
}

export async function saveOwnedPackIdsToLocal(packIds: string[]) {
    const uniquePackIds = Array.from(new Set(packIds));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uniquePackIds));
}

export async function addOwnedPackIdToLocal(packId: string) {
    const current = await loadOwnedPackIdsFromLocal();

    if(current.includes(packId)) return current;

    const next = [...current, packId];
    await saveOwnedPackIdsToLocal(next);

    return next;
}

export async function removeOwnedPackIdFromLocal(packId: string) {
    const current = await loadOwnedPackIdsFromLocal();
    const next = current.filter((id)  => id !== packId);

    await saveOwnedPackIdsToLocal(next);

    return next;
}

export async function isPackOwnedInLocal(packId: string) {
    const current = await loadOwnedPackIdsFromLocal();
    return current.includes(packId);
}