import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareGenerated } from './prepare-generated.mjs';
import { parseArgs, selectPacks } from './register.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'generated-pack-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = join(root, 'tools/background-assets');
  await mkdir(home, { recursive: true }); await mkdir(join(root, 'src/constants'), { recursive: true });
  await writeFile(join(root, 'src/constants/packCategories.ts'), "export const backgroundCategoryOptions = ['simple'];");
  const old = { id: 'existing', title: '기존 팩', category: 'simple', subcategory: 'paper', status: 'priced', coin_price: 700,
    items: [{ file: 'missing-original.png', name: '원본' }] };
  await writeFile(join(home, 'manifest.json'), JSON.stringify({ version: 1, packs: [old] }));
  const source = join(root, 'generated.png');
  const original = await sharp({ create: { width: 512, height: 512, channels: 3, background: '#aa33bb' } }).png().toBuffer();
  await writeFile(source, original);
  const config = { resize: 'cover', pack: { id: 'new-pack', title: '새 팩', category: 'simple', subcategory: 'grid' },
    images: [{ source, name: '생성 배경' }] };
  return { root, home, source, original, old, config };
}
test('local preparation resizes exactly, keeps source and existing manifest, and creates preview', async t => {
  const { root, home, source, original, old, config } = await fixture(t);
  const result = await prepareGenerated(config, root);
  const metadata = await sharp(join(home, 'inbox/new-pack/1.png')).metadata();
  assert.equal(metadata.width, 2048); assert.equal(metadata.height, 2732); assert.equal(metadata.format, 'png');
  assert.deepEqual(await readFile(source), original);
  const manifest = JSON.parse(await readFile(join(home, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.packs[0], old); assert.equal(manifest.packs[1].status, 'free');
  assert.equal(manifest.packs[1].items[0].file, 'new-pack/1.png');
  assert.equal((await sharp(result.previewPath).metadata()).width, 240);
});
test('existing inbox directory is never overwritten', async t => {
  const { root, home, config } = await fixture(t);
  await mkdir(join(home, 'inbox/new-pack'), { recursive: true });
  await writeFile(join(home, 'inbox/new-pack/keep.txt'), 'keep');
  await assert.rejects(prepareGenerated(config, root), { code: 'EEXIST' });
  assert.equal(await readFile(join(home, 'inbox/new-pack/keep.txt'), 'utf8'), 'keep');
  assert.equal(JSON.parse(await readFile(join(home, 'manifest.json'))).packs.length, 1);
});
test('duplicate generated pixels fail without appending manifest', async t => {
  const { root, home, config } = await fixture(t);
  config.images.push({ ...config.images[0], name: '중복' });
  await assert.rejects(prepareGenerated(config, root), /동일 이미지/);
  assert.equal(JSON.parse(await readFile(join(home, 'manifest.json'))).packs.length, 1);
});
test('resize opt-in and manifest ID collision are enforced', async t => {
  const { root, config } = await fixture(t);
  await assert.rejects(prepareGenerated({ ...config, resize: undefined }, root), /resize/);
  config.pack.id = 'existing'; await assert.rejects(prepareGenerated(config, root), /충돌/);
});
test('--pack selects exactly one pack without changing the full manifest', () => {
  const manifest = { packs: [{ id: 'first' }, { id: 'second' }] };
  assert.equal(parseArgs(['--dry-run', '--pack', 'second']).pack, 'second');
  assert.deepEqual(selectPacks(manifest, 'second'), [{ id: 'second' }]);
  assert.equal(manifest.packs.length, 2);
  assert.throws(() => selectPacks(manifest, 'missing'));
  assert.throws(() => parseArgs(['--pack', '--dry-run']));
  assert.throws(() => parseArgs(['--pack', 'first', '--pack', 'second']));
});
