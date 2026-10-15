import { supabase } from "../lib/supabase";
import { prepareGuestTransfer } from "./packAcquisitionService";

export async function signInWithEmail(email: string, password: string) {
  await prepareGuestTransfer(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  await prepareGuestTransfer(email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user || user.is_anonymous) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const fallbackProfile = {
    id: user.id,
    email: user.email ?? null,
    role: "user",
  };

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .upsert(fallbackProfile)
    .select("id, email, role")
    .single();

  if (createError) throw createError;

  return createdProfile;
}
