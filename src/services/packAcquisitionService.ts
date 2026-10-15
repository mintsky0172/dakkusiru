import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { loadOwnedPackIdsFromLocal } from "./localOwnedPackStorage";

const TRANSFER_KEY = "dakku_pending_guest_transfer";
let guestRequest: Promise<void> | null = null;

export async function ensureShopSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;
  if (!guestRequest) {
    guestRequest = (async () => {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    })().finally(() => { guestRequest = null; });
  }
  await guestRequest;
  const { data: next } = await supabase.auth.getSession();
  if (!next.session) throw new Error("연결을 확인한 뒤 다시 시도해 주세요.");
  return next.session;
}

export async function prepareGuestTransfer(email: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user.is_anonymous) return;
  const { data: token, error } = await supabase.rpc("prepare_guest_pack_transfer");
  if (error) throw error;
  await AsyncStorage.setItem(TRANSFER_KEY, JSON.stringify({ token, email: email.trim().toLowerCase() }));
}

export async function claimPendingGuestPacks() {
  const raw = await AsyncStorage.getItem(TRANSFER_KEY);
  if (!raw) return;
  const pending = JSON.parse(raw);
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous || user.email?.toLowerCase() !== pending.email) return;
  const { error } = await supabase.rpc("claim_guest_packs", { p_token: pending.token });
  if (error) throw new Error("보유 팩 병합을 완료하지 못했어요. 연결을 확인한 뒤 로그인 또는 다운로드를 다시 시도해 주세요.");
  await AsyncStorage.removeItem(TRANSFER_KEY);
}

export async function loadAccountPackIds() {
  const session = await ensureShopSession();
  await claimPendingGuestPacks();
  const { data, error } = await supabase.from("pack_acquisitions").select("pack_id").eq("user_id", session.user.id);
  if (error) throw error;
  return { userId: session.user.id, ids: (data ?? []).map((row) => row.pack_id as string) };
}

export async function acquirePack(packId: string) {
  await ensureShopSession();
  await claimPendingGuestPacks();
  // Legacy device entitlements stay usable without creating historical counts.
  if ((await loadOwnedPackIdsFromLocal()).includes(packId)) return;
  const { error } = await supabase.rpc("acquire_pack", { p_pack_id: packId });
  if (error) {
    if (error.message.includes("INSUFFICIENT_SERVER_COINS")) {
      throw new Error("사용 가능한 서버 코인이 부족해요. 기존 기기 코인은 이전 확인이 필요해요.");
    }
    if (error.message.includes("PACK_UNAVAILABLE")) throw new Error("현재 다운로드할 수 없는 팩이에요.");
    throw new Error("팩을 획득하지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.");
  }
}

export async function currentShopUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function readCachedAccountPackIds(userId: string | null) {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(`dakku_account_packs_${userId}`);
  try {
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export async function cacheAccountPackIds(userId: string, ids: string[]) {
  await AsyncStorage.setItem(`dakku_account_packs_${userId}`, JSON.stringify(ids));
}
