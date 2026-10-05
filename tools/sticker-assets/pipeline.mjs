import { preparePack as prepareAssetPack, buildRegistration as buildAssetRegistration } from '../background-assets/pipeline.mjs';

export { hash, normalizeItemId, pixelHash, inputFile, validateManifest, archiveSources, executeRegistration } from '../background-assets/pipeline.mjs';

// Stickers have no fixed aspect ratio. Do not crop, resize, flatten or remove alpha.
export function validateSize(width, height) {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error(`스티커 크기는 양의 정수여야 합니다 (실제 ${width}×${height}).`);
  }
}
export function preparePack(pack, inbox) {
  return prepareAssetPack(pack, inbox, { validateDimensions: validateSize });
}
export function buildRegistration(pack, token) {
  return buildAssetRegistration(pack, token, 'sticker');
}
