const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../functions/verify-coin-purchase/validation.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
new Function('exports', js)(exportsObject);
const { validateAppleTransaction } = exportsObject;
const expected = { transactionId: '100', productId: 'dakkusiru.coin_1000', bundleId: 'com.mintsky0172.dakkusiru', environment: 'Sandbox' };
const good = { ...expected, appAccountToken: '00000000-0000-0000-0000-000000000001', quantity: 1, type: 'Consumable', inAppOwnershipType: 'PURCHASED' };

test('verified transaction must match app, product, environment, type and owner binding', () => {
  assert.deepEqual(validateAppleTransaction(good, expected), { owner: good.appAccountToken, quantity: 1 });
  for (const change of [
    { transactionId: '200' }, { productId: 'fake' }, { bundleId: 'fake' },
    { environment: 'Production' }, { appAccountToken: undefined }, { appAccountToken: 'not-a-uuid' },
    { quantity: 0 }, { quantity: 1.5 }, { quantity: 11 }, { type: 'Auto-Renewable Subscription' },
    { revocationDate: 0 }, { revocationReason: 0 }, { inAppOwnershipType: 'FAMILY_SHARED' },
  ]) assert.throws(() => validateAppleTransaction({ ...good, ...change }, expected), /INVALID_APPLE_TRANSACTION/);
});
