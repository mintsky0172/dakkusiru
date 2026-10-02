import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { HashCache, scanExisting, withDeadline, timedFetch, timedR2, requestTimeout, r2Validator, storageValidator } from './inspection.mjs';
import { hash } from './pipeline.mjs';
const scope = { endpoint: 'test', bucket: 'background' };
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'background-cache-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'cache/pixels.json');
  const cache = new HashCache(path, scope); await cache.load();
  const bytes = await sharp({ create: { width: 4, height: 6, channels: 3, background: '#abcdef' } }).png().toBuffer();
  return { cache, path, bytes };
}
test('unchanged ETag uses persisted cache without downloading, changed ETag invalidates', async t => {
  const { cache, path, bytes } = await fixture(t);
  let reads = 0, version = 'etag-1'; const logs = [];
  const inspect = async () => ({ source: 'R2', validator: version });
  const read = async () => { reads++; return { bytes, validator: version }; };
  const run = current => scanExisting({ keys: ['one.png'], cache: current, inspect, read, log: line => logs.push(line) });
  const initial = await run(cache); assert.equal(reads, 1); assert.equal(initial.stats.decoded, 1);
  const reloaded = new HashCache(path, scope); await reloaded.load();
  const cached = await run(reloaded); assert.equal(reads, 1); assert.equal(cached.stats.cached, 1);
  version = 'etag-2'; await run(reloaded); assert.equal(reads, 2);
  assert(logs.some(line => line.includes('1/1 (100.0%)') && line.includes('완료')));
});
test('cache scope isolation and refresh force fresh inspection', async t => {
  const { cache, path, bytes } = await fixture(t);
  cache.set('R2:one', 'v1', [hash('pixels')]); await cache.save();
  const other = new HashCache(path, { ...scope, bucket: 'other' }); await other.load();
  assert.equal(other.get('R2:one', 'v1'), null);
  let reads = 0;
  const result = await scanExisting({ keys: ['one'], cache, refresh: true,
    inspect: async () => ({ source: 'R2', validator: 'v1' }), read: async () => { reads++; return { bytes, validator: 'v1' }; }, log: () => {} });
  assert.equal(reads, 1); assert.equal(result.stats.cached, 0);
});
test('checkpoint survives later request failure and never caches failed image', async t => {
  const { cache, path, bytes } = await fixture(t);
  await assert.rejects(scanExisting({ keys: ['one', 'two'], cache, checkpoint: 1,
    inspect: async key => { if (key === 'two') throw new Error('network'); return { source: 'R2', validator: 'v1' }; },
    read: async () => ({ bytes, validator: 'v1' }), log: () => {} }), /two.*network/);
  const reload = new HashCache(path, scope); await reload.load();
  assert(reload.get('R2:one', 'v1')); assert.equal(reload.get('R2:two', 'v1'), null);
});
test('invalid JSON/digests and missing remote validator never produce cache hit', async t => {
  const { cache, path, bytes } = await fixture(t);
  cache.set('R2:one', 'v1', [hash('pixels')]); await cache.save();
  assert.equal(cache.get('R2:one', null), null);
  const parsed = JSON.parse(await readFile(path, 'utf8')); parsed.entries[hash('R2:one')].hashes = ['invalid'];
  await writeFile(path, JSON.stringify(parsed));
  const reload = new HashCache(path, scope); await reload.load(); assert.equal(reload.get('R2:one', 'v1'), null);
  await writeFile(path, '{'); const warnings = [];
  const broken = new HashCache(path, scope, line => warnings.push(line)); await broken.load(); assert.equal(warnings.length, 1);
  await scanExisting({ keys: ['one'], cache: broken, inspect: async () => ({ source: 'R2', validator: null }),
    read: async () => ({ bytes, validator: null }), log: () => {} });
  assert.equal(broken.get('R2:one', null), null);
});
test('remote version changing during read caches downloaded version, not previous HEAD', async t => {
  const { cache, bytes } = await fixture(t);
  await scanExisting({ keys: ['one'], cache, inspect: async () => ({ source: 'R2', validator: 'old', sourceHash: hash('old') }),
    read: async () => ({ bytes, validator: 'new', sourceHash: hash('new') }), log: () => {} });
  assert.equal(cache.get('R2:one', 'old'), null);
  assert(cache.get('R2:one', 'new').includes(hash('new')));
  assert(!cache.get('R2:one', 'new').includes(hash('old')));
});
test('deadline aborts pending SDK request and rejects even if transport ignores abort', async () => {
  let observed;
  const r2 = timedR2({ send: async (_, options) => { observed = options.abortSignal; return new Promise(() => {}); } }, 15);
  await assert.rejects(r2.send({ constructor: { name: 'HeadObjectCommand' }, input: { Key: 'slow.png' } }), /slow.png.*15ms/);
  assert.equal(observed.aborted, true);
});
test('deadline covers R2 body consumption and fetch response body', async () => {
  await assert.rejects(withDeadline('R2 body', 15, async () => {
    await Promise.resolve({ headers: 'received' }); return new Promise(() => {});
  }), /R2 body.*15ms/);
  let signal;
  const wrapped = timedFetch(15, async (_, init) => { signal = init.signal; return { arrayBuffer: () => new Promise(() => {}) }; });
  await assert.rejects(wrapped('https://example.test'), /Supabase HTTP.*15ms/);
  assert.equal(signal.aborted, true);
});
test('normal fetch JSON and empty responses retain SDK compatibility', async () => {
  const wrapped = timedFetch(100, async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));
  assert.deepEqual(await (await wrapped('https://example.test')).json(), { ok: true });
  const empty = timedFetch(100, async () => new Response(null, { status: 204 }));
  assert.equal((await empty('https://example.test')).status, 204);
});
test('heartbeat exposes stalled request stage and current key', async t => {
  const { cache, bytes } = await fixture(t); const lines = [];
  await scanExisting({ keys: ['slow.png'], cache, heartbeatMs: 5,
    inspect: async () => { await new Promise(resolve => setTimeout(resolve, 20)); return { source: 'R2', validator: 'v1' }; },
    read: async () => ({ bytes, validator: 'v1' }), log: line => lines.push(line) });
  assert(lines.filter(line => line.includes('원격 변경 정보 확인: slow.png')).length > 1);
});
test('validator tracks remote identity and rejects invalid timeout configuration', () => {
  assert.notEqual(r2Validator({ ETag: 'a', ContentLength: 1 }), r2Validator({ ETag: 'b', ContentLength: 1 }));
  assert.equal(r2Validator({ ContentLength: 1 }), null);
  assert.notEqual(storageValidator({ version: 'v1' }), storageValidator({ version: 'v2' }));
  assert.equal(requestTimeout(), 30000);
  for (const value of ['0', '-1', 'bad', '600001']) assert.throws(() => requestTimeout(value));
});

test('paged R2 listing replaces per-object HEAD and preserves metadata-aware cached identity', async t => {
  const { cache, bytes } = await fixture(t);
  const { listR2Objects, listingValidator } = await import('./inspection.mjs');
  const modified = new Date('2026-10-02T00:00:00Z');
  const object = { Key: 'packs/backgrounds/p/items/1.png', ETag: 'etag', Size: 100, LastModified: modified };
  const originalValidator = r2Validator({ ETag: 'etag', ContentLength: 100, LastModified: modified, Metadata: { 'source-pixel-sha256': hash('source') } });
  cache.set(`R2:${object.Key}`, originalValidator, [hash('pixels')]);
  let calls = 0;
  const listed = await listR2Objects({ send: async command => {
    calls++; assert.equal(command.constructor.name, 'ListObjectsV2Command');
    if (calls === 1) return { Contents: [object], IsTruncated: true, NextContinuationToken: 'page2' };
    assert.equal(command.input.ContinuationToken, 'page2');
    return { Contents: [{ ...object, Key: 'another' }], IsTruncated: false };
  } }, 'bucket', () => {});
  assert.equal(calls, 2); assert.equal(listed.size, 2);
  let downloads = 0;
  const result = await scanExisting({ keys: [object.Key], cache,
    inspect: async key => ({ source: 'R2', validator: listingValidator(cache, key, listed.get(key)) }),
    read: async () => { downloads++; return { bytes, validator: originalValidator }; }, log: () => {} });
  assert.equal(result.stats.cached, 1); assert.equal(downloads, 0);
  for (const changed of [{ ...object, ETag: 'changed' }, { ...object, Size: 101 }, { ...object, LastModified: new Date() }]) {
    assert.equal(cache.get(`R2:${object.Key}`, listingValidator(cache, object.Key, changed)), null);
  }
});
test('R2 listing failure or broken pagination is never treated as an empty valid inventory', async () => {
  const { listR2Objects } = await import('./inspection.mjs');
  await assert.rejects(listR2Objects({ send: async () => { throw new Error('offline'); } }, 'bucket', () => {}), /offline/);
  await assert.rejects(listR2Objects({ send: async () => ({ IsTruncated: true }) }, 'bucket', () => {}), /토큰/);
});

test('listing milliseconds match HTTP Last-Modified seconds without hiding changed contents', async t => {
  const { cache } = await fixture(t);
  const { listingValidator } = await import('./inspection.mjs');
  const key = 'original.png';
  const validator = r2Validator({ ETag: 'original', ContentLength: 10, LastModified: new Date('2026-08-29T07:41:46.000Z') });
  cache.set(`R2:${key}`, validator, [hash('pixels')]);
  const listed = { ETag: 'original', Size: 10, LastModified: new Date('2026-08-29T07:41:46.313Z') };
  assert.equal(listingValidator(cache, key, listed), validator);
  assert.equal(cache.get(`R2:${key}`, listingValidator(cache, key, { ...listed, ETag: 'changed' })), null);
  assert.equal(cache.get(`R2:${key}`, listingValidator(cache, key, { ...listed, LastModified: new Date('2026-08-29T07:41:47.000Z') })), null);
});
