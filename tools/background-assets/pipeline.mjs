import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, copyFile, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, relative, basename, extname, dirname, sep } from 'node:path';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function normalizeItemId(value) {
  return value.normalize('NFC').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
export function validateSize(width, height) {
  if (width !== 2048 || ![2731, 2732, 2733].includes(height)) {
    throw new Error(`허용 크기는 2048×2731~2733입니다 (실제 ${width}×${height}).`);
  }
}
export async function pixelHash(input) {
  const { data, info } = await sharp(input).rotate().toColourspace('srgb').ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  return hash(Buffer.concat([Buffer.from(`${info.width}:${info.height}:rgba-v1\n`), data]));
}
export async function inputFile(inbox, file) {
  if (typeof file !== 'string' || !file || file.includes('\\') || file.startsWith('/')) throw new Error('올바른 inbox 상대 경로가 필요합니다.');
  const root = await realpath(inbox);
  const path = await realpath(resolve(root, file));
  const rel = relative(root, path);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith('/')) throw new Error(`inbox 밖의 파일: ${file}`);
  return path;
}
const slug = (value, label) => {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(value)) throw new Error(`${label}: 영문 소문자/숫자/하이픈을 사용하세요.`);
};
export function validateManifest(manifest, categories) {
  if (manifest.version !== 1 || !Array.isArray(manifest.packs)) throw new Error('manifest version=1과 packs 배열이 필요합니다.');
  const ids = new Set(), titles = new Set(), files = new Set();
  for (const p of manifest.packs) {
    slug(p.id, '팩 ID'); slug(p.subcategory, '세부 카테고리');
    if (!categories.includes(p.category)) throw new Error(`잘못된 카테고리: ${p.category}`);
    if (typeof p.title !== 'string' || !p.title.trim()) throw new Error('팩 제목이 필요합니다.');
    if (ids.has(p.id) || titles.has(p.title.trim())) throw new Error(`중복 팩 ID/제목: ${p.id}`);
    ids.add(p.id); titles.add(p.title.trim());
    if (!['free', 'priced'].includes(p.status)) throw new Error(`잘못된 status: ${p.id}`);
    if (p.status === 'priced' && (!Number.isSafeInteger(p.coin_price) || p.coin_price < 0)) throw new Error('유료 팩 coin_price는 0 이상의 정수여야 합니다.');
    if (p.tags !== undefined && (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string'))) throw new Error('tags는 문자열 배열이어야 합니다.');
    if (p.is_active !== undefined && typeof p.is_active !== 'boolean') throw new Error('is_active는 boolean이어야 합니다.');
    if (p.sort_order !== undefined && !Number.isSafeInteger(p.sort_order)) throw new Error('sort_order는 정수여야 합니다.');
    if (p.description !== undefined && p.description !== null && typeof p.description !== 'string') throw new Error('description은 문자열이어야 합니다.');
    if (!Array.isArray(p.items) || !p.items.length) throw new Error(`아이템이 없는 팩: ${p.id}`);
    const localIds = new Set();
    for (const item of p.items) {
      if (typeof item.file !== 'string' || !/\.(png|jpe?g)$/i.test(item.file)) throw new Error('PNG/JPG/JPEG 파일을 지정하세요.');
      if (files.has(item.file)) throw new Error(`manifest 파일 중복: ${item.file}`);
      files.add(item.file);
      if (item.name !== undefined && (typeof item.name !== 'string' || !item.name.trim())) throw new Error('아이템 이름은 비어 있지 않은 문자열이어야 합니다.');
      if (item.background_color !== undefined && item.background_color !== null && !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(item.background_color)) throw new Error('background_color는 #RRGGBB 또는 #RRGGBBAA여야 합니다.');
      const id = normalizeItemId(basename(item.file, extname(item.file)));
      if (!id || localIds.has(id)) throw new Error(`정규화 후 아이템 ID 충돌: ${item.file}`);
      localIds.add(id);
    }
  }
}
export async function preparePack(pack, inbox) {
  const items = [], seen = new Set();
  for (const [index, item] of pack.items.entries()) {
    const source = await inputFile(inbox, item.file);
    const bytes = await readFile(source);
    const metadata = await sharp(bytes).metadata();
    if (!['png', 'jpeg'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error(`실제 PNG/JPEG 단일 이미지가 아닙니다: ${item.file}`);
    const rotated = await sharp(bytes).rotate().toBuffer();
    const dimensions = await sharp(rotated).metadata();
    validateSize(dimensions.width, dimensions.height);
    const sourceHash = await pixelHash(bytes);
    if (seen.has(sourceHash)) throw new Error(`동일 이미지 중복: ${item.file}`);
    seen.add(sourceHash);
    // Lossless originals preserve source pixels and make cross-run duplicate checks exact.
    const original = await sharp(bytes).rotate().webp({ lossless: true }).toBuffer();
    const preview = await sharp(bytes).rotate().resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const localId = normalizeItemId(basename(item.file, extname(item.file)));
    items.push({ ...item, source, sourceHash, byteHash: hash(bytes), original, preview,
      id: `${pack.id}-${localId}`, localId, name: item.name?.trim() || localId.replace(/-/g, ' '), sort_order: index });
  }
  const thumbnailSource = pack.thumbnail ? await inputFile(inbox, pack.thumbnail) : items[0].source;
  const thumbnailBytes = await readFile(thumbnailSource);
  const thumbnailMetadata = await sharp(thumbnailBytes).metadata();
  if (!['png', 'jpeg'].includes(thumbnailMetadata.format) || (thumbnailMetadata.pages ?? 1) !== 1) throw new Error('썸네일 입력도 PNG/JPEG 단일 이미지여야 합니다.');
  const thumbnailDimensions = await sharp(thumbnailBytes).rotate().toBuffer().then(bytes => sharp(bytes).metadata());
  validateSize(thumbnailDimensions.width, thumbnailDimensions.height);
  if (!items.some(i => i.source === thumbnailSource) && items.some(i => basename(i.file) === basename(pack.thumbnail))) throw new Error('썸네일과 아이템 archive 파일명이 충돌합니다.');
  const thumbnail = await sharp(thumbnailSource).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return { ...pack, items, thumbnail, thumbnailSource, thumbnailByteHash: hash(thumbnailBytes) };
}
export function buildRegistration(pack, token) {
  const folder = `packs/backgrounds/${pack.id}`;
  const objects = [{ key: `${folder}/thumbnail-${token}.webp`, bytes: pack.thumbnail }];
  const rows = pack.items.map(item => {
    const image_path = `${folder}/items/${item.localId}-${token}.webp`;
    const preview_image_path = `${folder}/previews/${item.localId}-${token}.webp`;
    objects.push({ key: image_path, bytes: item.original, sourceHash: item.sourceHash }, { key: preview_image_path, bytes: item.preview });
    return { id: item.id, pack_id: pack.id, name: item.name, image_path, preview_image_path,
      background_color: item.background_color ?? null, sort_order: item.sort_order };
  });
  for (const object of objects) { object.size = object.bytes.length; object.outputHash = hash(object.bytes); }
  return { token, phase: 'pending', objects,
    pack: { id: pack.id, kind: 'background', title: pack.title.trim(), category: pack.category,
      status: pack.status, coin_price: pack.status === 'priced' ? pack.coin_price : null,
      thumbnail_path: objects[0].key, description: pack.description ?? null, is_new: false,
      sort_order: pack.sort_order ?? 0, is_active: false, updated_at: new Date().toISOString(),
      tags: [...new Set([...(pack.tags ?? []), pack.subcategory])] },
    targetActive: pack.is_active ?? true, items: rows,
    sources: [...pack.items.map(item => ({ path: item.source, file: item.file, byteHash: item.byteHash, sourceHash: item.sourceHash })),
      ...(pack.thumbnailSource && !pack.items.some(i => i.source === pack.thumbnailSource) ? [{ path: pack.thumbnailSource, file: pack.thumbnail, byteHash: pack.thumbnailByteHash }] : [])],
    category: pack.category, subcategory: pack.subcategory };
}
export async function archiveSources(journal, archive) {
  for (const source of journal.sources) {
    const target = resolve(archive, journal.category, journal.subcategory, journal.pack.id, basename(source.file));
    await mkdir(dirname(target), { recursive: true });
    let bytes;
    try { bytes = await readFile(source.path); } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      if (hash(await readFile(target)) !== source.byteHash) throw new Error(`archive 복구 불일치: ${target}`);
      continue;
    }
    if (hash(bytes) !== source.byteHash) throw new Error(`등록 후 원본이 변경됨: ${source.file}`);
    try { await copyFile(source.path, target, constants.COPYFILE_EXCL); } catch (e) {
      if (e.code !== 'EEXIST' || hash(await readFile(target)) !== source.byteHash) throw e;
    }
    // Recheck before removing the original; preserve a file edited during archiving.
    if (hash(await readFile(source.path)) !== source.byteHash) throw new Error(`archive 중 원본 변경: ${source.file}`);
    await unlink(source.path);
  }
}
export async function executeRegistration(journal, adapter, persist, archive) {
  // Persist all intended IDs and keys BEFORE the first external mutation.
  await persist(journal);
  try {
    for (const object of journal.objects) await adapter.upload(object, journal.token);
    await adapter.insertPack(journal.pack);
    await adapter.insertItems(journal.items);
    await adapter.verify(journal);
    await adapter.activate(journal);
    journal.phase = 'committed';
    await persist(journal);
  } catch (error) {
    // If saving the committed marker failed, compensate too; archive has not started.
    journal.phase = 'pending';
    try { await persist(journal); await adapter.rollback(journal); journal.phase = 'rolled-back'; await persist(journal); }
    catch (cleanup) { throw new Error(`등록 실패: ${error.message}; 복구 필요: ${cleanup.message}`); }
    throw error;
  }
  // Once committed, archive failures must NEVER roll back a published registration.
  await archive(journal);
  journal.phase = 'done';
  await persist(journal);
}
