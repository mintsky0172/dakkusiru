import AsyncStorage from "@react-native-async-storage/async-storage";
import { SavedDakku } from "../types/savedDakku";

const STORAGE_KEY = "dakku_siru_saved_dakkus";

async function getAllSavedDakkus(): Promise<SavedDakku[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    return JSON.parse(raw) as SavedDakku[];
  } catch {
    return [];
  }
}

async function setAllSavedDakkus(dakkus: SavedDakku[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dakkus));
}

export async function saveDakkuToLocal(
  dakku: Omit<SavedDakku, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<SavedDakku> {
  const now = new Date().toISOString();
  const savedDakkus = await getAllSavedDakkus();

  const existing = savedDakkus.find((item) => item.id === dakku.id);

  const nextDakku: SavedDakku = {
    ...dakku,
    createdAt: existing?.createdAt ?? dakku.createdAt ?? now,
    updatedAt: now,
  };

  const nextDakkus = existing
    ? savedDakkus.map((item) => (item.id === dakku.id ? nextDakku : item))
    : [nextDakku, ...savedDakkus];

  await setAllSavedDakkus(nextDakkus);

  return nextDakku;
}

export async function loadSavedDakkusFromLocal(): Promise<SavedDakku[]> {
  const savedDakkus = await getAllSavedDakkus();

  return savedDakkus.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function loadDakkuByIdFromLocal(
  id: string,
): Promise<SavedDakku | null> {
  const savedDakkus = await getAllSavedDakkus();
  return savedDakkus.find((item) => item.id === id) ?? null;
}

export async function deleteDakkuFromLocal(id: string) {
  const savedDakkus = await getAllSavedDakkus();
  const nextDakkus = savedDakkus.filter((item) => item.id !== id);

  await setAllSavedDakkus(nextDakkus);
}

export async function clearAllLocalDakkus() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function renameDakkuFromLocal(id: string, title: string) {
  const savedDakkus = await getAllSavedDakkus();
  const now = new Date().toISOString();

  const nextDakkus = savedDakkus.map((item) =>
    item.id === id
      ? {
          ...item,
          title,
          updatedAt: now,
        }
      : item,
  );

  await setAllSavedDakkus(nextDakkus);
}
