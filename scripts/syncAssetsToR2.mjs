import { createClient } from "@supabase/supabase-js";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "dakku-assets";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "");
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET = process.env.R2_BUCKET?.trim();
const R2_CACHE_CONTROL = process.env.R2_CACHE_CONTROL ?? "public, max-age=31536000, immutable";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL 또는 EXPO_PUBLIC_SUPABASE_URL이 필요합니다.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

if ((!R2_ACCOUNT_ID && !R2_ENDPOINT) || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error(
    "R2_ACCOUNT_ID 또는 R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET이 필요합니다.",
  );
}

const resolvedR2Endpoint =
  R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: resolvedR2Endpoint,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getContentType(path) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".svg")) return "image/svg+xml";

  return "image/png";
}

async function fetchAssetPathsFromDatabase() {
  const { data: packs, error: packsError } = await supabase
    .from("shop_packs")
    .select("thumbnail_path");

  if (packsError) {
    throw new Error(`[shop_packs 조회 실패] ${packsError.message}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from("shop_pack_items")
    .select("image_path, preview_image_path");

  if (itemsError) {
    throw new Error(`[shop_pack_items 조회 실패] ${itemsError.message}`);
  }

  return unique([
    ...(packs ?? []).map((pack) => pack.thumbnail_path),
    ...(items ?? []).map((item) => item.image_path),
    ...(items ?? []).map((item) => item.preview_image_path),
  ]);
}

async function syncAsset(path) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${path}`);
    return;
  }

  const { data: file, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .download(path);

  if (error) {
    throw new Error(`[Supabase download 실패] ${path}: ${error.message}`);
  }

  const body = Buffer.from(await file.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
      Body: body,
      ContentType: getContentType(path),
      CacheControl: R2_CACHE_CONTROL,
    }),
  );

  console.log(`[synced] ${path}`);
}

async function assertR2Access() {
  if (DRY_RUN) return;

  try {
    await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        MaxKeys: 1,
      }),
    );
  } catch (error) {
    throw new Error(
      `[R2 연결 확인 실패] endpoint=${resolvedR2Endpoint}, bucket=${R2_BUCKET}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function main() {
  console.log(`source bucket: ${SUPABASE_BUCKET}`);
  console.log(`target bucket: ${R2_BUCKET}`);
  console.log(`target endpoint: ${resolvedR2Endpoint}`);
  console.log(`mode: ${DRY_RUN ? "dry-run" : "sync"}`);

  await assertR2Access();

  const paths = await fetchAssetPathsFromDatabase();
  console.log(`target files: ${paths.length}`);

  let successCount = 0;
  let failCount = 0;

  for (const path of paths) {
    try {
      await syncAsset(path);
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

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
