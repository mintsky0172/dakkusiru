import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs, runRegistration } from '../background-assets/register.mjs';
import { preparePack, buildRegistration } from './pipeline.mjs';

export { parseArgs, selectPacks, adapterFor } from '../background-assets/register.mjs';

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('npm run assets:register-stickers [-- --dry-run --pack PACK_ID --refresh-hash-cache]\n입력: tools/sticker-assets/manifest.json 및 inbox/\n상세 설명: tools/sticker-assets/README.md');
  } else {
    runRegistration({ kind: 'sticker', options, prepare: preparePack, build: buildRegistration })
      .catch(error => { console.error(`[중단] ${error.message}`); process.exitCode = 1; });
  }
}
