import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, copyFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { preparePack, buildRegistration, pixelHash, validateManifest, executeRegistration, archiveSources } from './pipeline.mjs';
import { prepareGenerated } from './prepare-generated.mjs';
import { prepareInbox } from './prepare-inbox.mjs';
import { listR2Objects, scanExisting, HashCache } from '../background-assets/inspection.mjs';

const spec = { id: 'test-pack', title: '고양이', category: 'nature', subcategory: 'cat', status: 'priced', coin_price: 1000,
  tags: ['고양이'], include_subcategory_tag: false, preserve_file_names: true, items: [{ file: '1.png', name: '고양이' }] };
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'sticker-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = join(root, 'tools/sticker-assets'), inbox = join(home, 'inbox');
  await mkdir(inbox, { recursive: true });
  await mkdir(join(root, 'src/constants'), { recursive: true });
  await writeFile(join(root, 'src/constants/packCategories.ts'), "export const stickerCategoryOptions = ['nature', 'deco']; export const backgroundCategoryOptions = ['simple'];");
  await writeFile(join(home, 'manifest.json'), JSON.stringify({ version: 1, packs: [] }));
  const bytes = await sharp({ create: { width: 80, height: 120, channels: 4, background: '#fcaaff80' } })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#00000000' }).png().toBuffer();
  const source = join(inbox, '1.png'); await writeFile(source, bytes);
  return { root, home, inbox, bytes, source };
}
test('sticker original and alpha pixels survive conversion; background dimensions do not apply', async t => {
  const { inbox, bytes } = await fixture(t);
  const pack = await preparePack(spec, inbox), metadata = await sharp(pack.items[0].original).metadata();
  assert.equal(metadata.width, 100); assert.equal(metadata.height, 140); assert.equal(metadata.hasAlpha, true);
  assert.equal(await pixelHash(pack.items[0].original), await pixelHash(bytes));
  assert.equal((await sharp(pack.items[0].preview).metadata()).height, 140);
  const journal = buildRegistration(pack, 'token');
  assert.equal(journal.pack.kind, 'sticker'); assert.equal(journal.pack.coin_price, 1000);
  assert.deepEqual(journal.pack.tags, ['고양이']);
  assert.equal(journal.items[0].image_path, 'packs/stickers/test-pack/items/1.webp');
  assert.equal(journal.items[0].preview_image_path, 'packs/stickers/test-pack/previews/1.webp');
  assert.equal(journal.pack.thumbnail_path, 'packs/stickers/test-pack/thumbnail.webp');
});
test('large non-square stickers shrink previews without cropping alpha or changing originals', async t => {
  const { inbox } = await fixture(t);
  await writeFile(join(inbox, '1.png'), await sharp({ create: { width: 900, height: 300, channels: 4, background: '#aabbcc80' } }).png().toBuffer());
  const pack = await preparePack({ ...spec, status: 'free', preserve_file_names: false }, inbox);
  const preview = await sharp(pack.items[0].preview).metadata(), original = await sharp(pack.items[0].original).metadata();
  assert.equal(original.width, 900); assert.equal(original.height, 300);
  assert.equal(preview.width, 256); assert.equal(preview.height, 85); assert.equal(preview.hasAlpha, true);
  const j = buildRegistration(pack, 'token');
  assert.equal(j.pack.coin_price, null); assert.match(j.items[0].image_path, /1-token.webp$/);
});
test('wrong categories, duplicate pixels and disguised image formats fail before writes', async t => {
  const { inbox, bytes } = await fixture(t);
  assert.throws(() => validateManifest({ version: 1, packs: [{ ...spec, category: 'simple' }] }, ['nature']));
  await writeFile(join(inbox, '2.png'), bytes);
  await assert.rejects(preparePack({ ...spec, items: [{ file: '1.png' }, { file: '2.png' }] }, inbox), /동일 이미지/);
  await writeFile(join(inbox, '2.png'), await sharp(bytes).webp().toBuffer());
  await assert.rejects(preparePack({ ...spec, items: [{ file: '2.png' }] }, inbox), /실제 PNG\/JPEG/);
});
for (const stage of ['upload', 'insertPack', 'insertItems', 'verify', 'activate']) {
  test(`sticker failure at ${stage} compensates and retains originals`, async t => {
    const { inbox, source, bytes } = await fixture(t), journal = buildRegistration(await preparePack(spec, inbox), 'token');
    const calls = [], phases = [];
    const adapter = Object.fromEntries(['upload', 'insertPack', 'insertItems', 'verify', 'activate', 'rollback'].map(name => [name, async () => {
      calls.push(name); if (name === stage) throw new Error('failure');
    }]));
    await assert.rejects(executeRegistration(journal, adapter, async j => phases.push(j.phase), async () => calls.push('archive')), /failure/);
    assert.equal(calls.at(-1), 'rollback'); assert(!calls.includes('archive')); assert.equal(phases.at(-1), 'rolled-back');
    assert.deepEqual(await readFile(source), bytes);
  });
}
test('committed sticker archive retry includes thumbnail.clip and preserves filenames', async t => {
  const { root, inbox } = await fixture(t);
  await writeFile(join(inbox, 'thumbnail.clip'), 'clip source');
  const j = buildRegistration(await preparePack({ ...spec, archive_files: ['thumbnail.clip'] }, inbox), 'token');
  let rollback = false;
  const adapter = Object.fromEntries(['upload', 'insertPack', 'insertItems', 'verify', 'activate'].map(name => [name, async () => {}]));
  adapter.rollback = async () => { rollback = true; };
  await assert.rejects(executeRegistration(j, adapter, async () => {}, async () => { throw new Error('disk'); }), /disk/);
  assert.equal(j.phase, 'committed'); assert.equal(rollback, false);
  await archiveSources(j, join(root, 'archive')); await archiveSources(j, join(root, 'archive'));
  assert.equal(await readFile(join(root, 'archive/nature/cat/test-pack/thumbnail.clip'), 'utf8'), 'clip source');
});
test('generated preparation preserves dimensions, transparency, source and old manifest entries', async t => {
  const { root, home, source, bytes } = await fixture(t);
  const old = { ...spec, id: 'old', title: '기존', items: [{ file: 'missing.png' }] };
  await writeFile(join(home, 'manifest.json'), JSON.stringify({ version: 1, packs: [old] }));
  const config = { resize: 'none', pack: { ...spec, id: 'new', title: '신규' }, images: [{ source }] }; delete config.pack.items;
  await assert.rejects(prepareGenerated({ ...config, resize: 'cover' }, root), /resize/);
  const result = await prepareGenerated(config, root);
  assert.equal(await pixelHash(join(home, 'inbox/new/1.png')), await pixelHash(bytes));
  assert.deepEqual(await readFile(source), bytes); assert.equal((await sharp(result.previewPath).metadata()).width, 240);
  assert.deepEqual(JSON.parse(await readFile(join(home, 'manifest.json'))).packs[0], old);
  await assert.rejects(prepareGenerated(config, root), /충돌/);
});
test('folder preparation uses natural order, excludes thumbnail and hidden files, archives editing source', async t => {
  const { root, home, inbox, bytes } = await fixture(t);
  const folder = join(inbox, 'cats'); await mkdir(folder);
  await writeFile(join(folder, '10.png'), bytes);
  await writeFile(join(folder, '2.png'), await sharp(bytes).flop().tint('#00ff00').png().toBuffer());
  await writeFile(join(folder, 'thumbnail.png'), bytes); await writeFile(join(folder, '.hidden.png'), bytes);
  await writeFile(join(folder, 'thumbnail.clip'), 'clip'); await writeFile(join(folder, 'other.clip'), 'other');
  const pack = { title: '고양이', category: 'nature', subcategory: 'cat', status: 'priced', coin_price: 1000, tags: ['귀염'], description: '설명' };
  const result = await prepareInbox({ folder: 'cats', pack }, root); assert.equal(result.count, 2);
  const saved = JSON.parse(await readFile(join(home, 'manifest.json'))).packs[0];
  assert.deepEqual(saved.items.map(i => i.file), ['cats/2.png', 'cats/10.png']);
  assert.deepEqual(saved.archive_files, ['cats/thumbnail.clip']); assert.equal(saved.thumbnail, 'cats/thumbnail.png');
  assert.equal(saved.preserve_file_names, true); assert.equal(saved.include_subcategory_tag, false);
  assert.deepEqual(await readFile(join(folder, '10.png')), bytes);
  await assert.rejects(prepareInbox({ folder: 'cats', pack }, root), /衝突|충돌/);
});
test('folder preparation refuses missing thumbnail and folder escape without changing manifest', async t => {
  const { root, home, inbox } = await fixture(t);
  await mkdir(join(inbox, 'cats'));
  const pack = { title: '고양이', category: 'nature', subcategory: 'cat' };
  await assert.rejects(prepareInbox({ folder: 'cats', pack }, root), /thumbnail.png/);
  await assert.rejects(prepareInbox({ folder: '../outside', pack }, root), /folder/);
  assert.deepEqual(JSON.parse(await readFile(join(home, 'manifest.json'))).packs, []);
});
test('sticker R2 listing uses sticker prefix and canonical pixels detect remote duplicates', async t => {
  const { root, bytes } = await fixture(t); let prefix;
  await listR2Objects({ send: async command => { prefix = command.input.Prefix; return {}; } }, 'bucket', () => {}, 'packs/stickers/');
  assert.equal(prefix, 'packs/stickers/');
  const scan = await scanExisting({ keys: ['packs/stickers/old/items/1.webp'], cache: new HashCache(join(root, 'cache.json'), {}), label: '스티커', log: () => {},
    inspect: async () => ({ source: 'R2', validator: 'version' }),
    read: async () => ({ bytes: await sharp(bytes).webp({ lossless: true }).toBuffer(), validator: 'version' }) });
  assert(scan.hashes.has(await pixelHash(bytes)));
});
test('actual sticker CLI dry-run keeps source and background state untouched, creates no registration state', async t => {
  const { root, home, source, bytes } = await fixture(t);
  const background = join(root, 'tools/background-assets'); await mkdir(background);
  for (const name of ['register.mjs', 'pipeline.mjs', 'inspection.mjs']) await copyFile(new URL(`../background-assets/${name}`, import.meta.url), join(background, name));
  for (const name of ['register.mjs', 'pipeline.mjs']) await copyFile(new URL(name, import.meta.url), join(home, name));
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'));
  await writeFile(join(home, 'manifest.json'), JSON.stringify({ version: 1, packs: [spec] }));
  await mkdir(join(background, '.state')); await writeFile(join(background, '.state/untouched.json'), 'background sentinel');
  const { stdout } = await promisify(execFile)(process.execPath, [join(home, 'register.mjs'), '--dry-run', '--pack', spec.id], { env: { PATH: process.env.PATH } });
  assert.match(stdout, /오프라인 dry-run/); assert.match(stdout, /등록예정=1/); assert.match(stdout, /"kind": "sticker"/);
  assert.match(stdout, /packs\/stickers\//); assert.doesNotMatch(stdout, /packs\/backgrounds\//);
  assert.deepEqual(await readFile(source), bytes); assert(!(await readdir(home)).includes('.state'));
  assert.equal(await readFile(join(background, '.state/untouched.json'), 'utf8'), 'background sentinel');
});
