import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody =
  | {
      action: "createUploadUrl";
      path: string;
      contentType: string;
    }
  | {
      action: "delete";
      paths: string[];
    }
  | {
      action: "list";
      folderPath: string;
    };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}

function createR2Client() {
  const accountId = getEnv("R2_ACCOUNT_ID");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function normalizePath(path: string) {
  return path.trim().replace(/^\/+/, "");
}

function assertAssetPath(path: string) {
  const normalizedPath = normalizePath(path);

  if (!normalizedPath || normalizedPath.includes("..")) {
    throw new Error("올바르지 않은 asset path입니다.");
  }

  if (!normalizedPath.startsWith("packs/")) {
    throw new Error("packs/ 하위 asset만 처리할 수 있습니다.");
  }

  return normalizedPath;
}

async function assertAdminUser(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    throw new Error("인증 정보가 필요합니다.");
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    await assertAdminUser(request);

    const body = (await request.json()) as RequestBody;
    const r2 = createR2Client();
    const bucket = getEnv("R2_BUCKET");

    if (body.action === "createUploadUrl") {
      const path = assertAssetPath(body.path);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        ContentType: body.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      });
      const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

      return jsonResponse({ uploadUrl, path });
    }

    if (body.action === "delete") {
      const paths = [...new Set(body.paths.map(assertAssetPath))];

      if (paths.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: paths.map((path) => ({ Key: path })),
              Quiet: true,
            },
          }),
        );
      }

      return jsonResponse({ deleted: paths.length });
    }

    if (body.action === "list") {
      const folderPath = assertAssetPath(body.folderPath).replace(/\/+$/, "");
      const listedPaths: string[] = [];
      let continuationToken: string | undefined;

      do {
        const result = await r2.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `${folderPath}/`,
            ContinuationToken: continuationToken,
          }),
        );

        listedPaths.push(
          ...(result.Contents ?? [])
            .map((item) => item.Key)
            .filter((key): key is string => !!key),
        );
        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      return jsonResponse({ paths: listedPaths });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
});
