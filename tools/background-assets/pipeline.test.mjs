import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateSize, validateManifest, pixelHash, preparePack, buildRegistration, executeRegistration, archiveSources, hash, inputFile } from './pipeline.mjs';
import { adapterFor } from './register.mjs';
const spec = { id: 'test-pack', title: '테스트', category: 'simple', subcategory: 'grid', status: 'free', items: [{ file: '1.png' }] };
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'background-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inbox = join(root, 'inbox'); await mkdir(inbox);
  const bytes = await sharp({ create: { width: 2048, height: 2732, channels: 4, background: '#ffccaa' } }).png().toBuffer();
  await writeFile(join(inbox, '1.png'), bytes);
  return { root, inbox, bytes, pack: await preparePack(spec, inbox) };
}
test('exact width and inclusive height tolerance', () => {
  for (const h of [2731, 2732, 2733]) validateSize(2048, h);
  for (const [w, h] of [[2047, 2732], [2048, 2730], [2048, 2734], [2732, 2048]]) assert.throws(() => validateSize(w, h));
});
test('height exception is explicit and still requires 2048px width and a positive height', () => {
  validateSize(2048, 2719, true);
  assert.throws(() => validateSize(2048, 2719));
  for (const [w, h] of [[1024, 2719], [2048, 0], [2048, NaN]]) assert.throws(() => validateSize(w, h, true));
  for (const key of ['allow_nonstandard_height', 'include_subcategory_tag']) {
    assert.throws(() => validateManifest({ version: 1, packs: [{ ...spec, [key]: 'true' }] }, ['simple']));
  }
});
test('nonstandard pack preserves pixels, uses separate square thumbnail and exact supplied tags', async t => {
  const { inbox, root } = await fixture(t);
  const bytes = await sharp({ create: { width: 2048, height: 2719, channels: 3, background: '#abcdef' } }).png().toBuffer();
  await writeFile(join(inbox, '1.png'), bytes);
  await writeFile(join(inbox, 'thumbnail.png'), await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#ff0000' } }).png().toBuffer());
  const pack = await preparePack({ ...spec, allow_nonstandard_height: true, thumbnail: 'thumbnail.png', include_subcategory_tag: false, tags: ['블루', '심플'] }, inbox);
  assert.equal((await sharp(pack.items[0].original).metadata()).height, 2719);
  assert.equal(await pixelHash(pack.items[0].original), await pixelHash(bytes));
  assert.equal((await sharp(pack.thumbnail).metadata()).width, 512);
  assert.equal((await sharp(pack.thumbnail).metadata()).height, 512);
  const journal = buildRegistration(pack, 'test');
  assert.deepEqual(journal.pack.tags, ['블루', '심플']);
  assert.equal(journal.sources.length, 2);
  await archiveSources(journal, join(root, 'archive'));
  const archivedThumbnail = join(root, 'archive/simple/grid/test-pack/thumbnail.png');
  assert.equal(hash(await readFile(archivedThumbnail)), journal.sources[1].byteHash);
  await assert.rejects(readFile(join(inbox, 'thumbnail.png')), { code: 'ENOENT' });
});
test('manifest rejects missing subcategory and normalized ID collisions', () => {
  validateManifest({ version: 1, packs: [spec] }, ['simple']);
  assert.throws(() => validateManifest({ version: 1, packs: [{ ...spec, subcategory: '../escape' }] }, ['simple']));
  assert.throws(() => validateManifest({ version: 1, packs: [{ ...spec, items: [{ file: 'a_b.png' }, { file: 'a-b.jpg' }] }] }, ['simple']));
});
test('preserved upload names and archive-only editing file survive commit and archive retry', async t => {
  const { inbox, root } = await fixture(t);
  await writeFile(join(inbox, 'thumbnail.clip'), Buffer.from('editing source'));
  const pack = await preparePack({ ...spec, preserve_file_names: true, archive_files: ['thumbnail.clip'] }, inbox);
  const journal = buildRegistration(pack, 'token');
  assert.equal(journal.items[0].image_path, 'packs/backgrounds/test-pack/items/1.webp');
  assert.equal(journal.items[0].preview_image_path, 'packs/backgrounds/test-pack/previews/1.webp');
  assert.equal(journal.pack.thumbnail_path, 'packs/backgrounds/test-pack/thumbnail.webp');
  assert.equal(journal.objects.length, 3);
  assert.equal(journal.sources.at(-1).file, 'thumbnail.clip');
  const adapter = Object.fromEntries(['upload', 'insertPack', 'insertItems', 'verify', 'activate'].map(name => [name, async () => {}]));
  const archive = join(root, 'archive');
  await executeRegistration(journal, adapter, async () => {}, j => archiveSources(j, archive));
  await archiveSources(journal, archive);
  assert.equal(journal.phase, 'done');
  assert.equal(await readFile(join(archive, 'simple/grid/test-pack/thumbnail.clip'), 'utf8'), 'editing source');
  await assert.rejects(readFile(join(inbox, 'thumbnail.clip')), { code: 'ENOENT' });
});
test('lossless WebP retains canonical pixels and paths match existing pack structure', async t => {
  const { pack, bytes } = await fixture(t);
  assert.equal(await pixelHash(bytes), await pixelHash(pack.items[0].original));
  assert.equal((await sharp(pack.items[0].preview).metadata()).height, 256);
  const j = buildRegistration(pack, 'version');
  assert.equal(j.items[0].id, 'test-pack-1');
  assert.equal(j.items[0].image_path, 'packs/backgrounds/test-pack/items/1-version.webp');
  assert.equal(j.pack.is_active, false);
  assert.deepEqual(j.pack.tags, ['grid']);
});
test('inbox traversal and symlinks outside input are refused', async t => {
  const { root, inbox, bytes } = await fixture(t);
  await writeFile(join(root, 'outside.png'), bytes);
  await symlink(join(root, 'outside.png'), join(inbox, 'link.png'));
  await assert.rejects(inputFile(inbox, '../outside.png'));
  await assert.rejects(inputFile(inbox, 'link.png'));
});
test('identical decoded images in a pack are rejected', async t => {
  const { inbox, bytes } = await fixture(t);
  await writeFile(join(inbox, '2.png'), await sharp(bytes).png({ compressionLevel: 1 }).toBuffer());
  await assert.rejects(preparePack({ ...spec, items: [{ file: '1.png' }, { file: '2.png' }] }, inbox), /동일 이미지/);
});
for (const failure of ['upload', 'insertPack', 'insertItems', 'verify', 'activate']) {
  test(`failure at ${failure} compensates before archive`, async t => {
    const { pack } = await fixture(t), j = buildRegistration(pack, 'token');
    const calls = [], phases = [];
    const adapter = Object.fromEntries(['upload', 'insertPack', 'insertItems', 'verify', 'activate', 'rollback'].map(name => [name, async () => { calls.push(name); if (name === failure) throw new Error('injected'); }]));
    await assert.rejects(executeRegistration(j, adapter, async row => phases.push(row.phase), async () => calls.push('archive')), /injected/);
    assert.equal(calls.at(-1), 'rollback'); assert(!calls.includes('archive'));
    assert.equal(phases[0], 'pending'); assert.equal(phases.at(-1), 'rolled-back');
  });
}
test('cleanup failure leaves pending journal for recovery', async t => {
  const { pack } = await fixture(t), j = buildRegistration(pack, 'token');
  const adapter = { upload: async () => { throw new Error('upload failed'); }, rollback: async () => { throw new Error('offline'); } };
  await assert.rejects(executeRegistration(j, adapter, async () => {}, async () => {}), /복구 필요/);
  assert.equal(j.phase, 'pending');
});
test('archive interruption preserves committed registration and resumes safely', async t => {
  const { root, pack } = await fixture(t), j = buildRegistration(pack, 'token');
  const phases = [], calls = [];
  const adapter = Object.fromEntries(['upload', 'insertPack', 'insertItems', 'verify', 'activate', 'rollback'].map(name => [name, async () => calls.push(name)]));
  await assert.rejects(executeRegistration(j, adapter, async row => phases.push(row.phase), async () => { throw new Error('disk'); }));
  assert.equal(j.phase, 'committed'); assert(!calls.includes('rollback'));
  const archive = join(root, 'archive');
  await archiveSources(j, archive); await archiveSources(j, archive);
  assert.equal(hash(await readFile(join(archive, 'simple/grid/test-pack/1.png'))), j.sources[0].byteHash);
});
test('R2 compensation refuses objects owned by another run', async () => {
  const commands = [];
  const db = { from: () => {
    const q = { delete: () => q, select: () => q, eq: () => q, order: () => q, range: () => q,
      maybeSingle: async () => ({ data: null }), then: (resolve) => resolve({ data: [] }) }; return q;
  } };
  const r2 = { send: async command => { commands.push(command.constructor.name); return { Metadata: { 'registration-token': 'other' } }; } };
  await assert.rejects(adapterFor(db, r2, 'bucket').rollback({ token: 'ours', pack: { id: 'p', thumbnail_path: 't' }, items: [], objects: [{ key: 'k' }] }), /소유권/);
  assert.deepEqual(commands, ['HeadObjectCommand']);
});
test('DB compensation failure prevents R2 deletion', async () => {
  const q = { delete: () => q, eq: () => q, then: resolve => resolve({ error: { message: 'DB unavailable' } }) };
  let r2Called = false;
  await assert.rejects(adapterFor({ from: () => q }, { send: async () => { r2Called = true; } }, 'bucket').rollback({ items: [{ id: 'i', pack_id: 'p', image_path: 'k' }], pack: { id: 'p' } }), /DB unavailable/);
  assert.equal(r2Called, false);
});

test('CLI offline dry-run with a real image writes no state and keeps original', async t => {
  const { root, bytes } = await fixture(t);
  const { copyFile } = await import('node:fs/promises');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const tool = join(root, 'tools/background-assets');
  await mkdir(join(tool, 'inbox'), { recursive: true });
  await mkdir(join(root, 'src/constants'), { recursive: true });
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'));
  for (const name of ['register.mjs', 'pipeline.mjs', 'inspection.mjs']) await copyFile(new URL(name, import.meta.url), join(tool, name));
  await writeFile(join(root, 'src/constants/packCategories.ts'), "export const backgroundCategoryOptions = ['simple'] as const;");
  await writeFile(join(tool, 'manifest.json'), JSON.stringify({ version: 1, packs: [spec] }));
  await writeFile(join(tool, 'inbox/1.png'), bytes);
  const { stdout } = await promisify(execFile)(process.execPath, [join(tool, 'register.mjs'), '--dry-run'], { env: { PATH: process.env.PATH } });
  assert.match(stdout, /오프라인 dry-run/);
  assert.match(stdout, /등록예정=1/);
  assert.equal(hash(await readFile(join(tool, 'inbox/1.png'))), hash(bytes));
  await assert.rejects(readFile(join(tool, '.state/run.lock')), { code: 'ENOENT' });
  const { readdir } = await import('node:fs/promises');
  assert.deepEqual((await readdir(tool)).sort(), ['inbox', 'inspection.mjs', 'manifest.json', 'pipeline.mjs', 'register.mjs']);
});

test('lost DB insert response is compensated using matching rows and owned R2 keys', async t => {
  const { pack } = await fixture(t), j = buildRegistration(pack, 'owned-token');
  const tables = { shop_packs: [], shop_pack_items: [] }, objects = new Map();
  let insertItemsFails = true;
  const db = { from(table) {
    let action = 'select', payload, filters = [];
    const q = {
      select: () => q, order: () => q, range: () => q,
      eq: (field, value) => { filters.push(row => row[field] === value); return q; },
      insert: value => { action = 'insert'; payload = value; return q; },
      delete: () => { action = 'delete'; return q; },
      maybeSingle: async () => ({ data: tables[table].find(row => filters.every(f => f(row))) ?? null }),
      then(resolve) {
        if (action === 'insert') {
          tables[table].push(...(Array.isArray(payload) ? payload : [payload]));
          if (table === 'shop_pack_items' && insertItemsFails) { insertItemsFails = false; return resolve({ error: { message: 'response lost' } }); }
        }
        if (action === 'delete') tables[table] = tables[table].filter(row => !filters.every(f => f(row)));
        resolve({ data: tables[table].filter(row => filters.every(f => f(row))) });
      }
    }; return q;
  } };
  const r2 = { async send(command) {
    const input = command.input;
    if (command.constructor.name === 'PutObjectCommand') { objects.set(input.Key, { Metadata: input.Metadata, ContentLength: input.Body.length }); return {}; }
    if (command.constructor.name === 'HeadObjectCommand') {
      if (objects.has(input.Key)) return objects.get(input.Key);
      throw Object.assign(new Error('missing'), { name: 'NotFound' });
    }
    if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(input.Key); return {}; }
    throw new Error('unexpected command');
  } };
  await assert.rejects(executeRegistration(j, adapterFor(db, r2, 'bucket'), async () => {}, async () => {}), /response lost/);
  assert.equal(tables.shop_packs.length, 0);
  assert.equal(tables.shop_pack_items.length, 0);
  assert.equal(objects.size, 0);
  assert.equal(j.phase, 'rolled-back');
});
