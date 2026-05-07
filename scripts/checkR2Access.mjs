import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "");
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET = process.env.R2_BUCKET?.trim();

if ((!R2_ACCOUNT_ID && !R2_ENDPOINT) || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error(
    "R2_ACCOUNT_ID 또는 R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET이 필요합니다.",
  );
}

const resolvedR2Endpoint =
  R2_ENDPOINT ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

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

function mask(value) {
  if (!value) return "(empty)";
  if (value.length <= 8) return `${value[0]}***${value[value.length - 1]}`;

  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`;
}

async function main() {
  console.log(`endpoint: ${resolvedR2Endpoint}`);
  console.log(`bucket: ${R2_BUCKET}`);
  console.log(`accessKeyId: ${mask(R2_ACCESS_KEY_ID)}`);
  console.log(`secretAccessKey: ${mask(R2_SECRET_ACCESS_KEY)}`);

  const result = await r2.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1,
    }),
  );

  console.log(`ok. keyCount=${result.KeyCount ?? 0}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
