import sharp from 'sharp';
import { readFile, writeFile, mkdir, rename, unlink, realpath } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateManifest, preparePack } from './pipeline.mjs';

// Local-only preparation: no network requests, R2/DB writes, or source deletion.
export async function prepareGenerated(config, root) {
  const home = resolve(root, 'tools/background-assets');
  const manifestPath = resolve(home, 'manifest.json');
  if (!config.pack || !Array.isArray(config.images) || !config.images.length) throw new Error('pack와 images 배열이 필요합니다.');
  if (config.resize !== 'cover') throw new Error('크기 보정을 허용하려면 resize: "cover"를 지정하세요.');
  const categorySource = await readFile(resolve(root, 'src/constants/packCategories.ts'), 'utf8');
  const section = categorySource.match(/backgroundCategoryOptions\s*=\s*\[([\s\S]*?)\]/)?.[1];
  if (!section) throw new Error('프로젝트 카테고리를 읽을 수 없습니다.');
  const categories = [...section.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
  const p = config.pack;
  if (p.items || p.thumbnail) throw new Error('items와 thumbnail은 보조 도구가 생성합니다.');
  const pack = { ...p, status: p.status ?? 'free', items: config.images.map((image, index) => ({
    file: `${p.id}/${index + 1}.png`, name: image.name ?? `${p.title} ${index + 1}`,
    background_color: image.background_color ?? null
  })) };
  validateManifest({ version: 1, packs: [pack] }, categories);
  const cache = resolve(home, '.cache');
  await mkdir(cache, { recursive: true });
  const lock = resolve(cache, 'manifest.lock');
  // A crashed preparation leaves this lock intentionally: inspect the partial inbox
  // before removing it, so reruns cannot accidentally overwrite generated assets.
  await writeFile(lock, JSON.stringify({ pid: process.pid, packId: pack.id }), { flag: 'wx', mode: 0o600 });
  const destination = resolve(home, 'inbox', pack.id);
  const temp = `${manifestPath}.${randomUUID()}.tmp`;
  try {
    const original = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(original);
    validateManifest(manifest, categories);
    if (manifest.packs.some(existing => existing.id === pack.id || existing.title.trim() === pack.title.trim())) throw new Error('manifest 팩 ID/제목 충돌: 기존 항목을 덮어쓰지 않습니다.');
    const sources = await Promise.all(config.images.map(async image => {
      if (typeof image.source !== 'string' || !image.source) throw new Error('생성된 이미지 source 경로가 필요합니다.');
      return realpath(resolve(root, image.source));
    }));
    await mkdir(dirname(destination), { recursive: true });
    await mkdir(destination); // EEXIST prevents replacing any existing folder.
    for (const [index, source] of sources.entries()) {
      const bytes = await sharp(source).rotate().resize(2048, 2732, { fit: 'cover', position: 'centre' }).png().toBuffer();
      await writeFile(resolve(destination, `${index + 1}.png`), bytes, { flag: 'wx' });
    }
    const prepared = await preparePack(pack, resolve(home, 'inbox'));
    const previewPath = resolve(cache, `${pack.id}-preview.png`);
    const tiles = await Promise.all(prepared.items.map(item => sharp(item.source).resize(240, 320, { fit: 'contain', background: '#ffffff' }).png().toBuffer()));
    const columns = Math.min(4, tiles.length), rows = Math.ceil(tiles.length / columns);
    const preview = await sharp({ create: { width: columns * 240, height: rows * 320, channels: 3, background: '#ffffff' } })
      .composite(tiles.map((input, index) => ({ input, left: index % columns * 240, top: Math.floor(index / columns) * 320 }))).png().toBuffer();
    await writeFile(previewPath, preview, { flag: 'wx' });
    // Keep a recoverable copy; only append the new pack, never rewrite old records.
    await writeFile(resolve(cache, `manifest-before-${randomUUID()}.json`), original, { flag: 'wx', mode: 0o600 });
    await writeFile(temp, JSON.stringify({ ...manifest, packs: [...manifest.packs, pack] }, null, 2) + '\n', { flag: 'wx' });
    if (await readFile(manifestPath, 'utf8') !== original) throw new Error('준비 중 manifest가 변경되었습니다. 생성 파일을 보존하고 중단합니다.');
    await rename(temp, manifestPath);
    return { packId: pack.id, count: pack.items.length, folder: destination, previewPath, manifestPath };
  } finally {
    await unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; });
    await unlink(lock);
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('사용법: node tools/background-assets/prepare-generated.mjs CONFIG_JSON'); process.exitCode = 1;
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    readFile(resolve(args[0]), 'utf8').then(text => prepareGenerated(JSON.parse(text), root))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => { console.error(`[이미지 준비 실패] ${error.message}; 부분 생성 파일은 보존됩니다.`); process.exitCode = 1; });
  }
}
