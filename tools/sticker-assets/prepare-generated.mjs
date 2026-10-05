import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareGenerated as prepareAssetImages } from '../background-assets/prepare-generated.mjs';
import { preparePack } from './pipeline.mjs';

export function prepareGenerated(config, root) {
  return prepareAssetImages(config, root, { kind: 'sticker', prepare: preparePack });
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('사용법: node tools/sticker-assets/prepare-generated.mjs CONFIG_JSON'); process.exitCode = 1;
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    readFile(resolve(args[0]), 'utf8').then(text => prepareGenerated(JSON.parse(text), root))
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => { console.error(`[이미지 준비 실패] ${error.message}; 부분 생성 파일은 보존됩니다.`); process.exitCode = 1; });
  }
}
