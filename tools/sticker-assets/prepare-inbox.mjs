import { readFile, writeFile, mkdir, readdir, rename, unlink } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateManifest, inputFile, preparePack } from './pipeline.mjs';

// Build a manifest entry from an existing folder without modifying source files.
export async function prepareInbox(config, root) {
  if (!config.pack || typeof config.folder !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(config.folder)) {
    throw new Error('pack와 inbox 바로 아래 팩 폴더 이름(folder: 영문 소문자/숫자/하이픈)이 필요합니다.');
  }
  if (config.pack.id !== undefined && config.pack.id !== config.folder) throw new Error('팩 ID와 폴더 이름이 일치해야 합니다.');
  if (config.pack.items || config.pack.thumbnail) throw new Error('items와 thumbnail은 폴더에서 자동으로 지정합니다.');
  const home = resolve(root, 'tools/sticker-assets'), inbox = resolve(home, 'inbox');
  const folder = await inputFile(inbox, config.folder);
  const entries = await readdir(folder, { withFileTypes: true });
  if (!entries.some(entry => entry.isFile() && entry.name === 'thumbnail.png')) throw new Error('팩 폴더에 thumbnail.png가 필요합니다.');
  const names = entries.filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'thumbnail.png' && /\.(png|jpe?g)$/i.test(entry.name))
    .map(entry => entry.name).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }) || (a < b ? -1 : a > b ? 1 : 0));
  const archiveFiles = config.pack.archive_files ?? [];
  const clip = `${config.folder}/thumbnail.clip`;
  const pack = { ...config.pack, id: config.folder, status: config.pack.status ?? 'free',
    include_subcategory_tag: config.pack.include_subcategory_tag ?? false,
    preserve_file_names: config.pack.preserve_file_names ?? true,
    thumbnail: `${config.folder}/thumbnail.png`,
    archive_files: [...new Set([...archiveFiles, ...(entries.some(e => e.isFile() && e.name === 'thumbnail.clip') ? [clip] : [])])],
    items: names.map(name => ({ file: `${config.folder}/${name}`, name: basename(name, extname(name)) })) };
  const source = await readFile(resolve(root, 'src/constants/packCategories.ts'), 'utf8');
  const section = source.match(/stickerCategoryOptions\s*=\s*\[([\s\S]*?)\]/)?.[1];
  if (!section) throw new Error('프로젝트 스티커 카테고리를 읽을 수 없습니다.');
  const categories = [...section.matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
  validateManifest({ version: 1, packs: [pack] }, categories);
  const cache = resolve(home, '.cache'); await mkdir(cache, { recursive: true });
  const lock = resolve(cache, 'manifest.lock'), manifestPath = resolve(home, 'manifest.json');
  const temp = `${manifestPath}.${randomUUID()}.tmp`;
  await writeFile(lock, JSON.stringify({ pid: process.pid, packId: pack.id }), { flag: 'wx', mode: 0o600 });
  try {
    const original = await readFile(manifestPath, 'utf8'), manifest = JSON.parse(original);
    validateManifest(manifest, categories);
    if (manifest.packs.some(existing => existing.id === pack.id || existing.title.trim() === pack.title.trim())) throw new Error('manifest 팩 ID/제목 충돌: 기존 항목을 덮어쓰지 않습니다.');
    await preparePack(pack, inbox);
    await writeFile(resolve(cache, `manifest-before-${randomUUID()}.json`), original, { flag: 'wx', mode: 0o600 });
    await writeFile(temp, JSON.stringify({ ...manifest, packs: [...manifest.packs, pack] }, null, 2) + '\n', { flag: 'wx' });
    if (await readFile(manifestPath, 'utf8') !== original) throw new Error('준비 중 manifest가 변경되었습니다. 중단합니다.');
    await rename(temp, manifestPath);
    return { packId: pack.id, count: pack.items.length, folder, manifestPath };
  } finally {
    await unlink(temp).catch(e => { if (e.code !== 'ENOENT') throw e; });
    await unlink(lock);
  }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('사용법: node tools/sticker-assets/prepare-inbox.mjs CONFIG_JSON'); process.exitCode = 1;
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    readFile(resolve(args[0]), 'utf8').then(text => prepareInbox(JSON.parse(text), root))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => { console.error(`[팩 준비 실패] ${error.message}`); process.exitCode = 1; });
  }
}
