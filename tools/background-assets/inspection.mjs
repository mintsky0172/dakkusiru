import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { hash, pixelHash } from './pipeline.mjs';

export function requestTimeout(value = '30000', variable = 'BACKGROUND_ASSET_REQUEST_TIMEOUT_MS') {
  const ms = Number(value);
  if (!Number.isSafeInteger(ms) || ms < 1 || ms > 600000) throw new Error(`${variable}는 1~600000 사이의 정수여야 합니다.`);
  return ms;
}
export async function withDeadline(label, timeoutMs, operation, upstream) {
  const controller = new AbortController();
  const signal = upstream ? AbortSignal.any([controller.signal, upstream]) : controller.signal;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label}: 요청 제한 시간 ${timeoutMs}ms 초과`);
      error.name = 'RequestTimeoutError';
      reject(error);
      controller.abort(error);
    }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => operation(signal)), timeout]); }
  finally { clearTimeout(timer); }
}
export function timedR2(client, timeoutMs) {
  return { send(command, options = {}) {
    return withDeadline(`R2 ${command.constructor.name} ${command.input.Key ?? ''}`, timeoutMs,
      signal => client.send(command, { ...options, abortSignal: signal }), options.abortSignal);
  } };
}
export function timedFetch(timeoutMs, fetchImpl = fetch) {
  return async (input, init = {}) => withDeadline('Supabase HTTP', timeoutMs, async signal => {
    const response = await fetchImpl(input, { ...init, signal });
    // Fetch resolves at headers. Keep the deadline active until the BODY finishes too.
    const bytes = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : bytes,
      { status: response.status, statusText: response.statusText, headers: response.headers });
  }, init.signal ?? (input instanceof Request ? input.signal : undefined));
}
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export class HashCache {
  constructor(path, scope, warn = console.warn) {
    this.path = path; this.scope = hash(JSON.stringify(scope)); this.entries = {}; this.warn = warn; this.dirty = false;
  }
  async load() {
    try {
      const data = JSON.parse(await readFile(this.path, 'utf8'));
      if (data && data.version === 'rgba-v1-cache-1' && data.scope === this.scope && data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) this.entries = data.entries;
    } catch (e) {
      if (e.code !== 'ENOENT') {
        if (!(e instanceof SyntaxError)) throw e;
        this.warn('[해시 캐시] 손상된 캐시는 사용하지 않고 다시 검사합니다.');
      }
    }
  }
  get(key, validator) {
    const entry = this.entries[hash(key)];
    if (!validator || entry?.validator !== validator || !Array.isArray(entry.hashes) || !entry.hashes.length || !entry.hashes.every(digest)) return null;
    return entry.hashes;
  }
  set(key, validator, hashes) {
    if (!validator || !hashes.length || !hashes.every(digest)) return;
    this.entries[hash(key)] = { validator, hashes }; this.dirty = true;
  }
  async save() {
    if (!this.dirty) return;
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify({ version: 'rgba-v1-cache-1', scope: this.scope, entries: this.entries }), { mode: 0o600, flag: 'wx' });
      await rename(temp, this.path); this.dirty = false;
    } finally { await unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
  }
}
export function r2Validator(head) {
  if (!head.ETag) return null;
  return JSON.stringify([head.ETag, head.VersionId ?? null, head.ContentLength,
    head.LastModified?.toISOString?.() ?? head.LastModified ?? null, head.Metadata?.['source-pixel-sha256'] ?? null]);
}
// List responses contain content identity fields but not custom metadata. Reuse
// cached hashes when content ETag and size match, and modification times match
// at HTTP Last-Modified precision (seconds). R2 listings include milliseconds.
// A same-second content change still invalidates the cache through its ETag.
export function listingValidator(cache, key, object) {
  const listed = r2Validator({ ETag: object.ETag, ContentLength: object.Size, LastModified: object.LastModified });
  const entry = cache.entries[hash(`R2:${key}`)];
  if (!listed || !entry || !cache.get(`R2:${key}`, entry.validator)) return listed;
  try {
    const previous = JSON.parse(entry.validator), current = JSON.parse(listed);
    if (previous.length === 5 && previous[1] === null &&
      [0, 2].every(i => previous[i] === current[i]) && current[3] !== null &&
      Number.isFinite(Date.parse(previous[3])) && Number.isFinite(Date.parse(current[3])) &&
      Math.floor(Date.parse(previous[3]) / 1000) === Math.floor(Date.parse(current[3]) / 1000)) return entry.validator;
  } catch { /* Invalid cache identity: download and replace it. */ }
  return listed;
}
export async function listR2Objects(r2, bucket, log = console.log, prefix = 'packs/backgrounds/') {
  const objects = new Map();
  let token, pages = 0;
  do {
    const result = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: token }));
    for (const object of result.Contents ?? []) if (object.Key) objects.set(object.Key, object);
    pages++;
    log(`[R2 목록] ${pages}페이지, 객체 ${objects.size}개 확인`);
    const next = result.NextContinuationToken;
    if (result.IsTruncated && (!next || next === token)) throw new Error('R2 목록 페이지 토큰이 누락되거나 반복되었습니다.');
    token = result.IsTruncated ? next : undefined;
  } while (token);
  return objects;
}
export function storageValidator(info) {
  if (!info.etag && !info.version) return null;
  return JSON.stringify([info.etag ?? null, info.version ?? null, info.size ?? null, info.lastModified ?? null]);
}
export async function scanExisting({ keys, cache, inspect, read, refresh = false, log = console.log, heartbeatMs = 5000, checkpoint = 10, label = '배경' }) {
  const stats = { completed: 0, cached: 0, decoded: 0 };
  const hashes = new Set(), start = Date.now();
  let current = '검사 준비', stage = '원격 변경 정보 확인';
  const progress = () => log(`[중복 검사] ${stats.completed}/${keys.length} (${keys.length ? (stats.completed / keys.length * 100).toFixed(1) : '100.0'}%) | 캐시=${stats.cached}, 새 검사=${stats.decoded} | ${Math.floor((Date.now() - start) / 1000)}초 | ${stage}: ${current}`);
  log(`[중복 검사] 기존 ${label} 원본 ${keys.length}개 확인 (캐시 변경 여부 확인)`);
  const heartbeat = setInterval(progress, heartbeatMs); heartbeat.unref();
  try {
    for (const key of keys) {
      current = key; stage = '원격 변경 정보 확인';
      if (!stats.completed) progress();
      const info = await inspect(key);
      const cacheKey = `${info.source}:${key}`;
      let result = !refresh && cache.get(cacheKey, info.validator);
      if (result) stats.cached++;
      else {
        stage = `${info.source} 다운로드`;
        const file = await read(key, info);
        stage = '픽셀 해시 계산';
        result = [...new Set([...(digest(file.sourceHash) ? [file.sourceHash] : []), await pixelHash(file.bytes)])];
        // Cache the validator of the downloaded version, not a potentially stale HEAD.
        cache.set(cacheKey, file.validator, result);
        stats.decoded++;
      }
      result.forEach(value => hashes.add(value));
      stats.completed++;
      if (stats.completed % checkpoint === 0) { stage = '캐시 저장'; await cache.save(); progress(); }
    }
    return { hashes, stats };
  } catch (e) { throw new Error(`기존 원본 비교 실패 (${current}, ${stage}): ${e.message}`, { cause: e }); }
  finally {
    clearInterval(heartbeat);
    await cache.save();
    stage = stats.completed === keys.length ? '완료' : '중단'; progress();
  }
}
