import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
const PREVIEW_SIZE = Number(process.env.ITEM_PREVIEW_SIZE ?? 256);
const CACHE_CONTROL = process.env.STORAGE_CACHE_CONTROL ?? "31536000";
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

function formatError(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") return JSON.stringify(error, null, 2);
  return String(error);
}

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

  return "image/png";
}

function getPreviewPath(imagePath) {
  const extension = extname(imagePath) || ".png";
  const filename = basename(imagePath, extension);
  const folder = dirname(imagePath);

  if (folder.endsWith("/items")) {
    return `${dirname(folder)}/previews/${filename}${extension}`;
  }

  return `${folder}/previews/${filename}${extension}`;
}

async function fetchItems() {
  const { data, error } = await supabase
    .from("shop_pack_items")
    .select("id, image_path, preview_image_path")
    .not("image_path", "is", null)
    .order("pack_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`[shop_pack_items 조회 실패] ${formatError(error)}`);
  }

  return data ?? [];
}

async function createPreviewImage(item, tempRoot) {
  const sourcePath = item.image_path;
  const previewPath = item.preview_image_path || getPreviewPath(sourcePath);

  if (!FORCE && item.preview_image_path) {
    console.log(`[skip] ${item.id}: already has preview_image_path`);
    return "skipped";
  }

  if (DRY_RUN) {
    console.log(`[dry-run] ${sourcePath} -> ${previewPath}`);
    return "dry-run";
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(sourcePath);

  if (downloadError) {
    throw new Error(`[download 실패] ${sourcePath}: ${downloadError.message}`);
  }

  const itemTempDir = join(tempRoot, item.id.replace(/[^a-zA-Z0-9_-]/g, "_"));
  mkdirSync(itemTempDir, { recursive: true });

  const inputPath = join(itemTempDir, `source${extname(sourcePath) || ".png"}`);
  const outputPath = join(itemTempDir, `preview${extname(previewPath) || ".png"}`);

  writeFileSync(inputPath, Buffer.from(await file.arrayBuffer()));

  await execFileAsync("sips", ["-Z", String(PREVIEW_SIZE), inputPath, "--out", outputPath]);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(previewPath, readFileSync(outputPath), {
      contentType: getContentType(previewPath),
      cacheControl: CACHE_CONTROL,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[upload 실패] ${previewPath}: ${uploadError.message}`);
  }

  const { error: updateError } = await supabase
    .from("shop_pack_items")
    .update({ preview_image_path: previewPath })
    .eq("id", item.id);

  if (updateError) {
    throw new Error(`[DB 갱신 실패] ${item.id}: ${updateError.message}`);
  }

  console.log(`[created] ${item.id}: ${previewPath}`);
  return "created";
}

async function main() {
  console.log(`bucket: ${BUCKET}`);
  console.log(`previewSize: ${PREVIEW_SIZE}`);
  console.log(`mode: ${DRY_RUN ? "dry-run" : FORCE ? "force" : "missing-only"}`);

  const items = await fetchItems();
  console.log(`target items: ${items.length}`);

  const tempRoot = join(tmpdir(), `dakkusiru-preview-${Date.now()}`);
  mkdirSync(tempRoot, { recursive: true });

  let createdCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  try {
    for (const item of items) {
      try {
        const result = await createPreviewImage(item, tempRoot);

        if (result === "created") createdCount += 1;
        if (result === "skipped") skippedCount += 1;
      } catch (error) {
        failCount += 1;
        console.error(error instanceof Error ? error.message : error);
      }
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(
    `done. created=${createdCount}, skipped=${skippedCount}, failed=${failCount}`,
  );

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
