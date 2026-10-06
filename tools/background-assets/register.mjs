import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { readFile, writeFile, mkdir, readdir, rename, open, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { hash, validateManifest, preparePack, buildRegistration, executeRegistration, archiveSources, cleanupInboxPack } from './pipeline.mjs';

import { requestTimeout, withDeadline, timedR2, timedFetch, HashCache, r2Validator, storageValidator, scanExisting, listR2Objects, listingValidator } from './inspection.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const invokedDirectly = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
export function parseArgs(args) {
  const options = { dry: false, refreshHashCache: false, help: false, pack: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') options.dry = true;
    else if (arg === '--refresh-hash-cache') options.refreshHashCache = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--pack') {
      const value = args[++i];
      if (!value || value.startsWith('--') || options.pack) throw new Error('--pack에는 팩 ID 하나를 지정하세요.');
      options.pack = value;
    } else throw new Error(`지원하지 않는 옵션: ${arg}`);
  }
  return options;
}
export function selectPacks(manifest, pack) {
  if (!pack) return manifest.packs;
  const matches = manifest.packs.filter(p => p.id === pack);
  if (matches.length !== 1) throw new Error(`manifest에서 팩 ID를 찾을 수 없거나 중복됩니다: ${pack}`);
  return matches;
}
const options = invokedDirectly ? parseArgs(process.argv.slice(2)) : {};
if (invokedDirectly && options.help) { console.log('npm run assets:register-backgrounds [-- --dry-run --pack PACK_ID --refresh-hash-cache]\n입력: tools/background-assets/manifest.json 및 inbox/\n상세 설명: tools/background-assets/README.md'); process.exit(0); }
async function loadEnv(root) {
  try {
    const text = await readFile(resolve(root, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const isMissing = e => e?.$metadata?.httpStatusCode === 404 || e?.name === 'NoSuchKey' || e?.name === 'NotFound';
function checked(result) { if (result.error) throw new Error(result.error.message); return result.data; }
async function pages(db, table, columns, filter) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    let q = db.from(table).select(columns).order('id').range(offset, offset + 499);
    if (filter) q = filter(q);
    const page = checked(await q); rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export function adapterFor(db, r2, bucket) {
  const ownedHead = async (key, token) => {
    try {
      const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (head.Metadata?.['registration-token'] !== token) throw new Error(`R2 소유권 불일치: ${key}`);
      return head;
    } catch (e) { if (isMissing(e)) return null; throw e; }
  };
  return {
    async upload(o, token) {
      await r2.send(new PutObjectCommand({ Bucket: bucket, Key: o.key, Body: o.bytes,
        ContentType: 'image/webp', CacheControl: process.env.R2_CACHE_CONTROL ?? 'public, max-age=31536000, immutable',
        IfNoneMatch: '*', Metadata: { 'registration-token': token, 'output-sha256': o.outputHash, ...(o.sourceHash ? { 'source-pixel-sha256': o.sourceHash } : {}) } }));
    },
    async insertPack(row) { checked(await db.from('shop_packs').insert(row)); },
    async insertItems(rows) {
      for (let i = 0; i < rows.length; i += 100) checked(await db.from('shop_pack_items').insert(rows.slice(i, i + 100)));
    },
    async verify(j) {
      for (const o of j.objects) {
        const head = await ownedHead(o.key, j.token);
        if (!head || head.ContentLength !== o.size || head.Metadata?.['output-sha256'] !== o.outputHash) throw new Error(`업로드 확인 실패: ${o.key}`);
      }
      const pack = checked(await db.from('shop_packs').select('id, thumbnail_path').eq('id', j.pack.id).single());
      if (pack.thumbnail_path !== j.pack.thumbnail_path) throw new Error('팩 경로 확인 실패');
      const rows = await pages(db, 'shop_pack_items', 'id, image_path, preview_image_path', q => q.eq('pack_id', j.pack.id));
      if (rows.length !== j.items.length || j.items.some(i => !rows.some(r => r.id === i.id && r.image_path === i.image_path && r.preview_image_path === i.preview_image_path))) throw new Error('DB 아이템 확인 실패');
    },
    async activate(j) {
      const rows = checked(await db.from('shop_packs').update({ is_active: j.targetActive }).eq('id', j.pack.id).eq('thumbnail_path', j.pack.thumbnail_path).select('id'));
      if (rows.length !== 1) throw new Error('팩 활성 상태 반영 실패');
    },
    async rollback(j) {
      // DB cleanup first. If it fails, preserve R2 objects referenced by surviving rows.
      for (const item of j.items) checked(await db.from('shop_pack_items').delete().eq('id', item.id).eq('pack_id', j.pack.id).eq('image_path', item.image_path));
      const remaining = await pages(db, 'shop_pack_items', 'id', q => q.eq('pack_id', j.pack.id));
      const pack = checked(await db.from('shop_packs').select('thumbnail_path').eq('id', j.pack.id).maybeSingle());
      if (pack?.thumbnail_path === j.pack.thumbnail_path) {
        if (remaining.length) throw new Error('다른 아이템이 존재하여 팩 삭제를 중단했습니다.');
        checked(await db.from('shop_packs').delete().eq('id', j.pack.id).eq('thumbnail_path', j.pack.thumbnail_path));
      }
      for (const object of j.objects) if (await ownedHead(object.key, j.token)) await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.key }));
    }
  };
}
// Shared runner: each asset kind keeps its own manifest, journal, cache and archive.
export async function runRegistration({ kind = 'background', options = {}, root: projectRoot = root,
  prepare = preparePack, build = buildRegistration } = {}) {
  if (!['background', 'sticker'].includes(kind)) throw new Error(`잘못된 에셋 종류: ${kind}`);
  const root = projectRoot;
  const home = resolve(root, `tools/${kind}-assets`);
  const inbox = resolve(home, 'inbox'), archive = resolve(home, 'archive'), state = resolve(home, '.state');
  const { dry, refreshHashCache } = options;
  const label = kind === 'sticker' ? '스티커' : '배경';
  const finishArchive = async journal => {
    await archiveSources(journal, archive);
    await cleanupInboxPack(journal, inbox, archive);
  };
  async function persist(j) {
    const path = resolve(state, `${j.token}.json`);
    const serial = { ...j, objects: j.objects.map(({ key, sourceHash, size, outputHash }) => ({ key, sourceHash, size, outputHash })) };
    const temp = `${path}.tmp`;
    const file = await open(temp, 'w', 0o600);
    try { await file.writeFile(JSON.stringify(serial, null, 2)); await file.sync(); } finally { await file.close(); }
    await rename(temp, path);
    const directory = await open(state, 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  }
  async function journals() {
    try { return await Promise.all((await readdir(state)).filter(n => n.endsWith('.json')).map(async n => JSON.parse(await readFile(resolve(state, n), 'utf8')))); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  }
  async function acquireLock() {
    await mkdir(state, { recursive: true });
    const path = resolve(state, 'run.lock');
    try { await writeFile(path, String(process.pid), { flag: 'wx', mode: 0o600 }); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const pid = Number(await readFile(path, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('run.lock이 손상되었습니다. 실행 중인 프로세스가 없는지 확인하세요.');
      try { process.kill(pid, 0); } catch (err) {
        if (err.code !== 'ESRCH') throw err;
        await unlink(path); return acquireLock();
      }
      throw new Error(`다른 등록 프로세스가 실행 중입니다 (PID ${pid}).`);
    }
    return () => unlink(path);
  }
  await loadEnv(root);
  const timeoutVariable = `${kind.toUpperCase()}_ASSET_REQUEST_TIMEOUT_MS`;
  const timeoutMs = requestTimeout(process.env[timeoutVariable], timeoutVariable);
  const manifest = JSON.parse(await readFile(resolve(home, 'manifest.json'), 'utf8'));
  const categorySource = await readFile(resolve(root, 'src/constants/packCategories.ts'), 'utf8');
  const section = categorySource.match(new RegExp(`${kind}CategoryOptions\\s*=\\s*\\[([\\s\\S]*?)\\]`))?.[1];
  if (!section) throw new Error(`프로젝트 ${label} 카테고리를 읽을 수 없습니다.`);
  validateManifest(manifest, [...section.matchAll(/["']([^"']+)["']/g)].map(m => m[1]));
  const selected = selectPacks(manifest, options.pack);
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const role = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const endpoint = process.env.R2_ENDPOINT ?? (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  const bucket = process.env.R2_BUCKET;
  const online = !!(url && role && endpoint && bucket && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
  if (!online && !dry) throw new Error('필수 .env 설정: SUPABASE_URL(또는 EXPO_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID(또는 R2_ENDPOINT), R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  let unlock;
  const summary = { success: 0, skipped: 0, failed: 0, planned: 0, recovered: 0 };
  try {
    if (!dry) unlock = await acquireLock();
    let history = await journals();
    const db = online ? createClient(url, role, { global: { fetch: timedFetch(timeoutMs) }, auth: { persistSession: false, autoRefreshToken: false } }) : null;
    const r2 = online ? timedR2(new S3Client({ region: 'auto', endpoint, forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }), timeoutMs) : null;
    const adapter = online ? adapterFor(db, r2, bucket) : null;
    for (const j of history) {
      if (['done', 'rolled-back'].includes(j.phase)) continue;
      if (dry) throw new Error(`미완료 실행 ${j.token}: 실제 실행으로 복구한 후 dry-run하세요.`);
      if (j.phase === 'committed') {
        await adapter.verify(j); await finishArchive(j); j.phase = 'done';
      } else { await adapter.rollback(j); j.phase = 'rolled-back'; }
      await persist(j); summary.recovered++;
      console.log(`[복구] ${j.pack.id}: ${j.phase}`);
    }
    if (dry && !online) console.log('[오프라인 dry-run] 로컬 검증·변환만 수행합니다. 운영 DB/R2 중복 및 접근 권한은 미검증입니다.');
    const packs = online ? await pages(db, 'shop_packs', 'id, title, kind') : [];
    const items = online ? await pages(db, 'shop_pack_items', 'id, pack_id, image_path') : [];
    const assetPacks = new Set(packs.filter(p => p.kind === kind).map(p => p.id));
    const existingHashes = new Set();
    if (online) {
      const sources = [...new Set(items.filter(i => assetPacks.has(i.pack_id) && i.image_path).map(i => i.image_path))];
      const storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'dakku-assets';
      const cache = new HashCache(resolve(home, '.cache/pixel-hashes.json'), { endpoint, bucket, url, storageBucket });
      await cache.load();
      console.log(`[요청 제한 시간] ${timeoutMs}ms (응답 본문 다운로드 포함)`);
      const inspectionStarted = performance.now();
      const listed = await listR2Objects(r2, bucket, console.log, `packs/${kind === 'sticker' ? 'stickers' : 'backgrounds'}/`);
      const scan = await scanExisting({ keys: sources, cache, refresh: refreshHashCache, label, concurrency: kind === 'sticker' ? 8 : 1,
        inspect: async key => {
          const object = listed.get(key);
          if (object?.ETag && object.Size !== undefined && object.LastModified) {
            return { source: 'R2', validator: listingValidator(cache, key, object) };
          }
          try {
            const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
            return { source: 'R2', validator: r2Validator(head), sourceHash: head.Metadata?.['source-pixel-sha256'] };
          } catch (e) { if (!isMissing(e)) throw e; }
          const info = checked(await db.storage.from(storageBucket).info(key));
          return { source: 'Supabase', validator: storageValidator(info) };
        },
        read: async (key, info) => {
          if (info.source === 'R2') return withDeadline(`R2 원본 다운로드 ${key}`, timeoutMs, async signal => {
            const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal });
            const onAbort = () => result.Body.destroy?.();
            signal.addEventListener('abort', onAbort, { once: true });
            try {
              if (signal.aborted) onAbort();
              signal.throwIfAborted();
              return { bytes: Buffer.from(await result.Body.transformToByteArray()), validator: r2Validator(result), sourceHash: result.Metadata?.['source-pixel-sha256'] };
            } finally { signal.removeEventListener('abort', onAbort); }
          });
          const file = checked(await db.storage.from(storageBucket).download(key));
          // Storage download exposes no version validator. Recheck after the read;
          // cache only if the version remained unchanged throughout the download.
          const after = checked(await db.storage.from(storageBucket).info(key));
          const validator = storageValidator(after);
          return { bytes: Buffer.from(await file.arrayBuffer()), validator: validator === info.validator ? validator : null };
        }
      });
      scan.hashes.forEach(value => existingHashes.add(value));
      console.log(`[중복 검사 소요] 목록 조회 포함 ${((performance.now() - inspectionStarted) / 1000).toFixed(2)}초`);
    }
    history = await journals();
    for (const spec of selected) {
      try {
        const done = history.find(j => j.phase === 'done' && j.pack.id === spec.id && j.manifestHash === hash(JSON.stringify(spec)));
        if (done) { if (online) await adapter.verify(done); if (!dry) await cleanupInboxPack(done, inbox, archive); summary.skipped++; console.log(`[건너뜀] ${spec.id}: 이미 등록·archive 완료 (기록 기준)`); continue; }
        const prepared = await prepare(spec, inbox);
        const duplicate = prepared.items.find(i => existingHashes.has(i.sourceHash));
        if (duplicate) { summary.skipped++; console.log(`[중복 건너뜀] ${spec.id}: ${duplicate.file}; 팩 전체 미등록, 원본 유지`); continue; }
        if (packs.some(p => p.id === spec.id || p.title === spec.title.trim())) throw new Error('기존 팩 ID/제목이 존재합니다. 기존 팩 변경은 지원하지 않습니다.');
        if (prepared.items.some(i => items.some(r => r.id === i.id))) throw new Error('기존 아이템 ID 충돌');
        const j = build(prepared, randomUUID()); j.manifestHash = hash(JSON.stringify(spec));
        if (dry) {
          summary.planned++;
          console.log(`[등록 예정] ${spec.id}: 원본 ${prepared.items.length}개, 미리보기 ${prepared.items.length}개, 썸네일 1개`);
          console.log(JSON.stringify({ pack: { ...j.pack, is_active: j.targetActive }, items: j.items, archive: `${spec.category}/${spec.subcategory}/${spec.id}/` }, null, 2));
        } else {
          await executeRegistration(j, adapter, persist, finishArchive);
          summary.success++; console.log(`[성공] ${spec.id}: ${prepared.items.length}개 등록·archive 완료`);
        }
        for (const item of prepared.items) existingHashes.add(item.sourceHash);
      } catch (e) {
        summary.failed++; console.error(`[실패] ${spec.id}: ${e.message}`);
        // Stop after any failure: pending compensation must be recovered before new writes.
        if (!dry) break;
      }
    }
    if (!manifest.packs.length) console.log('manifest의 packs가 비어 있습니다. manifest.example.json을 참고해 등록할 팩을 지정하세요.');
    if (summary.failed) process.exitCode = 1;
  } finally {
    if (unlock) await unlock();
    console.log(`요약: 성공=${summary.success}, 건너뜀=${summary.skipped}, 실패=${summary.failed}, 등록예정=${summary.planned}, 복구=${summary.recovered}`);
  }
}
if (invokedDirectly) {
  runRegistration({ options }).catch(e => { console.error(`[중단] ${e.message}`); process.exitCode = 1; });
}
