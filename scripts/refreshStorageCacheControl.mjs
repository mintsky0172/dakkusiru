import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "dakku-assets";
const CACHE_CONTROL = process.env.STORAGE_CACHE_CONTROL ?? "31536000";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL 또는 EXPO_PUBLIC_SUPABASE_URL이 필요합니다.");
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY가 필요합니다. 이 키는 앱에 넣지 말고 로컬에서만 사용하세요.",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getContentType(path) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerPath.endsWith(".avif")) {
    return "image/avif";
  }
  if (lowerPath.endsWith(".svg")) {
    return "image/svg+xml";
  }

  return "image/png";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchAssetPathsFromDatabase() {
  const { data: packs, error: packsError } = await supabase
    .from("shop_packs")
    .select("thumbnail_path");

  if (packsError) throw packsError;

  const { data: items, error: itemsError } = await supabase
    .from("shop_pack_items")
    .select("image_path");

  if (itemsError) throw itemsError;

  return unique([
    ...(packs ?? []).map((pack) => pack.thumbnail_path),
    ...(items ?? []).map((item) => item.image_path),
  ]);
}

async function refreshCacheControl(path) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${path}`);
    return;
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (downloadError) {
    throw new Error(`[download 실패] ${path}: ${downloadError.message}`);
  }

  const body = await file.arrayBuffer();

  const { error: updateError } = await supabase.storage
    .from(BUCKET)
    .update(path, body, {
      cacheControl: CACHE_CONTROL,
      contentType: getContentType(path),
      upsert: true,
    });

  if (updateError) {
    throw new Error(`[update 실패] ${path}: ${updateError.message}`);
  }

  console.log(`[updated] ${path}`);
}

async function main() {
  console.log(`bucket: ${BUCKET}`);
  console.log(`cacheControl: ${CACHE_CONTROL}`);
  console.log(`mode: ${DRY_RUN ? "dry-run" : "update"}`);

  const paths = await fetchAssetPathsFromDatabase();
  console.log(`target files: ${paths.length}`);

  let successCount = 0;
  let failCount = 0;

  for (const path of paths) {
    try {
      await refreshCacheControl(path);
      successCount += 1;
    } catch (error) {
      failCount += 1;
      console.error(error instanceof Error ? error.message : error);
    }
  }

  console.log(`done. success=${successCount}, failed=${failCount}`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

void main();
