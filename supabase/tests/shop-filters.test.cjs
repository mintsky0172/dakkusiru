const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadUtility(name) {
  const source = fs.readFileSync(path.join(__dirname, '../../src/utils', name), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', js)(exports);
  return exports;
}

const { filterShopPacks } = loadUtility('filterShopPacks.ts');
const { sortShopPacks } = loadUtility('sortShopPacks.ts');
const packs = [
  { id: 'free-sticker', title: '나 스티커', kind: 'sticker', category: 'deco', status: 'free', ownStatus: 'not_owned', tags: ['Pink'], acquisitionCount: 2, createdAt: '2026-10-01' },
  { id: 'paid-owned', title: '유료 스티커', kind: 'sticker', category: 'deco', status: 'priced', ownStatus: 'owned', coinPrice: '0', tags: ['Pink'], acquisitionCount: 100 },
  { id: 'free-background', title: '가 배경', kind: 'background', category: 'emotion', status: 'free', ownStatus: 'owned', acquisitionCount: 3, createdAt: '2026-10-02' },
  { id: 'other-sticker', title: '다 스티커', kind: 'sticker', category: 'cute', status: 'free', ownStatus: 'owned', tags: ['Blue'], acquisitionCount: 1, createdAt: '2026-10-03' },
];
const defaults = { kind: 'all', category: 'all', search: '', freeOnly: false };
const ids = values => values.map(pack => pack.id);

test('free-only uses catalog status, includes owned free packs, and toggles off without mutation', () => {
  const before = JSON.stringify(packs);
  assert.deepEqual(ids(filterShopPacks(packs, { ...defaults, freeOnly: true })), ['free-sticker', 'free-background', 'other-sticker']);
  assert.deepEqual(ids(filterShopPacks(packs, defaults)), ids(packs));
  assert.equal(JSON.stringify(packs), before);
});

test('free-only combines with kind, category, title and normalized tag searches', () => {
  assert.deepEqual(ids(filterShopPacks(packs, { ...defaults, freeOnly: true, kind: 'sticker', category: 'deco', search: ' PINK ' })), ['free-sticker']);
  assert.deepEqual(ids(filterShopPacks(packs, { ...defaults, freeOnly: true, kind: 'background', search: '배경' })), ['free-background']);
  assert.deepEqual(ids(filterShopPacks(packs, { ...defaults, freeOnly: true, kind: 'sticker', category: 'emotion' })), []);
  assert.deepEqual(filterShopPacks([], { ...defaults, freeOnly: true }), []);
});

test('all sort modes operate on the free-only results', () => {
  const filtered = filterShopPacks(packs, { ...defaults, freeOnly: true });
  assert.deepEqual(ids(sortShopPacks(filtered, 'name')), ['free-background', 'free-sticker', 'other-sticker']);
  assert.deepEqual(ids(sortShopPacks(filtered, 'popular')), ['free-background', 'free-sticker', 'other-sticker']);
  assert.deepEqual(ids(sortShopPacks(filtered, 'latest')), ['other-sticker', 'free-background', 'free-sticker']);
});
