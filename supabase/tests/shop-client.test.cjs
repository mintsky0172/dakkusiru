const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../../src', relativePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', 'require', js)(exports, name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  });
  return exports;
}

test('popular sorting breaks ties by creation time, title, ID without mutation', () => {
  const { sortShopPacks } = load('utils/sortShopPacks.ts');
  const packs = [
    { id: 'a', title: '가', acquisitionCount: 1, createdAt: '2026-10-01' },
    { id: 'b', title: '나', acquisitionCount: 2, createdAt: '2026-09-01' },
    { id: 'c', title: '다', acquisitionCount: 2, createdAt: '2026-10-01' },
    { id: 'd', title: '라', createdAt: 'invalid' },
  ];
  assert.deepEqual(sortShopPacks(packs, 'popular').map(p => p.id), ['c', 'b', 'a', 'd']);
  assert.deepEqual(sortShopPacks(packs, 'name').map(p => p.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(sortShopPacks(packs, 'latest').map(p => p.id), ['a', 'c', 'b', 'd']);
  assert.equal(packs[0].id, 'a');
  assert.deepEqual(sortShopPacks([{ id: 'z', title: '가' }, { id: 'a', title: '가' }], 'popular').map(p => p.id), ['a', 'z']);
});

test('catalog survives missing or unreachable popularity RPC without inventing counts', async () => {
  let failure = 'missing';
  const rows = [{ id: 'free', title: '테스트', kind: 'sticker', category: 'deco', status: 'free', is_active: true }];
  const query = {
    select() { return this; },
    eq() { return this; },
    order() { return this; },
    then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject); },
  };
  const api = load('services/supabase/queries/packs.ts', {
    '../../../lib/supabase': { supabase: {
      from: () => query,
      rpc: async () => {
        if (failure === 'network') throw new Error('Network request failed');
        if (failure === 'missing') return { data: null, error: { code: 'PGRST202' } };
        return { data: failure === 'empty' ? [] : [{ pack_id: 'free', acquisition_count: 5 }], error: null };
      },
    } },
    '../../../utils/getAssetPublicUrl': { getAssetPublicUrl: p => p },
  });
  for (const mode of ['missing', 'network']) {
    failure = mode;
    const packs = await api.fetchShopPacksFromSupabase();
    assert.equal(packs.length, 1);
    assert.equal(packs[0].acquisitionCount, undefined);
  }
  failure = 'empty';
  assert.equal((await api.fetchShopPacksFromSupabase())[0].acquisitionCount, 0);
  failure = null;
  assert.equal((await api.fetchShopPacksFromSupabase())[0].acquisitionCount, 5);
});

test('guest session coalescing, retryable transfer, legacy exclusion and offline failures', async () => {
  let session = null;
  let guestCalls = 0;
  let claimFailure = false;
  let acquireFailure = false;
  const calls = [];
  const memory = new Map();
  const storage = {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => memory.set(key, value),
    removeItem: async key => memory.delete(key),
  };
  const supabase = { auth: {
    getSession: async () => ({ data: { session }, error: null }),
    signInAnonymously: async () => {
      guestCalls++;
      await new Promise(resolve => setImmediate(resolve));
      session = { user: { id: 'guest', is_anonymous: true } };
      return { error: null };
    },
  }, rpc: async (name, args) => {
    calls.push([name, args]);
    if (name === 'prepare_guest_pack_transfer') return { data: 'one-time-token', error: null };
    if (name === 'claim_guest_packs') return { error: claimFailure ? new Error('offline') : null };
    return { error: acquireFailure ? new Error('offline') : null };
  } };
  const api = load('services/packAcquisitionService.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
    '../lib/supabase': { supabase },
    './localOwnedPackStorage': { loadOwnedPackIdsFromLocal: async () => ['legacy'] },
  });
  await Promise.all([api.ensureShopSession(), api.ensureShopSession()]);
  assert.equal(guestCalls, 1);
  await api.acquirePack('legacy');
  assert.equal(calls.length, 0, 'legacy entitlements never create counts');
  await api.prepareGuestTransfer(' USER@EXAMPLE.COM ');
  session = { user: { id: 'account', email: 'user@example.com', is_anonymous: false } };
  claimFailure = true;
  await assert.rejects(api.claimPendingGuestPacks());
  assert.ok(memory.has('dakku_pending_guest_transfer'), 'failed merge keeps recovery token');
  claimFailure = false;
  await api.claimPendingGuestPacks();
  assert.equal(memory.has('dakku_pending_guest_transfer'), false);
  acquireFailure = true;
  await assert.rejects(api.acquirePack('new'));
  assert.equal(memory.has('dakku_account_packs_account'), false, 'failed acquisition grants nothing locally');
  memory.set('dakku_account_packs_account', 'corrupt');
  assert.deepEqual(await api.readCachedAccountPackIds('account'), []);
  await api.cacheAccountPackIds('account', ['new']);
  assert.deepEqual(await api.readCachedAccountPackIds('other-account'), []);
});
