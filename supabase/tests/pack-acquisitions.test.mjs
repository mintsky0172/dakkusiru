import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const { PGlite } = await import(process.env.PGLITE_MODULE ?? '@electric-sql/pglite');

test('acquisitions, guest merge, wallet atomicity and permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, is_anonymous boolean);
      create function auth.uid() returns uuid language sql as
        $$select nullif(current_setting('request.user_id', true), '')::uuid$$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      create table public.profiles(id uuid primary key, role text);
      create table public.shop_packs(id text primary key, status text, coin_price bigint, is_active boolean);
      insert into public.shop_packs values ('free', 'free', null, true), ('paid', 'priced', 50, true), ('off', 'free', null, false);
    `);
    await db.exec(await readFile(new URL('../migrations/202610150001_pack_acquisitions.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../migrations/202610150002_preserve_guest_acquisition_counts.sql', import.meta.url), 'utf8'));
    const ids = [1, 2, 3, 4, 5, 6].map(i => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`);
    for (let i = 0; i < ids.length; i++) {
      await db.query('insert into auth.users values ($1, $2)', [ids[i], i === 0 || i >= 4]);
    }
    await db.query("insert into profiles values ($1, 'admin')", [ids[2]]);
    const asUser = async id => {
      await db.exec('reset role');
      await db.query("select set_config('request.user_id', $1, false)", [id]);
      await db.exec('set role authenticated');
    };
    const count = async () => Number((await db.query("select acquisition_count from get_pack_popularity() where pack_id = 'free'")).rows[0]?.acquisition_count ?? 0);
    await asUser(ids[0]);
    await db.query("select acquire_pack('free')");
    await db.query("select acquire_pack('free')");
    assert.equal(await count(), 1, 'repeat acquisitions count once');
    await assert.rejects(db.query("select acquire_pack('off')"), /PACK_UNAVAILABLE/);
    await assert.rejects(db.query("select acquire_pack('paid')"), /INSUFFICIENT_SERVER_COINS/);
    await assert.rejects(db.query("insert into pack_acquisitions values ($1, 'paid', now(), true)", [ids[0]]), /permission denied/);
    await assert.rejects(db.query("select credit_verified_coins($1, 'fake', 100)", [ids[0]]), /permission denied/);
    const token = (await db.query('select prepare_guest_pack_transfer() as token')).rows[0].token;
    await asUser(ids[1]);
    await db.query("select acquire_pack('free')");
    assert.equal(await count(), 2);
    await db.query('select claim_guest_packs($1)', [token]);
    await db.query('select claim_guest_packs($1)', [token]);
    assert.equal(await count(), 1, 'merge deduplicates and retries are harmless');
    await asUser(ids[0]);
    await assert.rejects(db.query("select acquire_pack('paid')"), /GUEST_ALREADY_TRANSFERRED/);
    await asUser(ids[2]);
    await db.query("select acquire_pack('free')");
    await db.query("select acquire_pack('paid')");
    assert.equal(await count(), 1, 'administrator excluded');
    await db.exec('reset role');
    await db.query("update profiles set role = 'user' where id = $1", [ids[2]]);
    assert.equal(await count(), 1, 'historical admin exclusion stays fixed');
    await db.query("select credit_verified_coins($1, 'verified-1', 100)", [ids[1]]);
    await db.query("select credit_verified_coins($1, 'verified-1', 100)", [ids[1]]);
    await asUser(ids[1]);
    await db.query("select acquire_pack('paid')");
    await db.query("select acquire_pack('paid')");
    assert.equal(Number((await db.query('select balance from coin_wallets')).rows[0].balance), 50, 'charge and purchase idempotent');
    await asUser(ids[3]);
    await assert.rejects(db.query('select claim_guest_packs($1)', [token]), /INVALID_TRANSFER/);
    await asUser(ids[4]);
    await db.query("select acquire_pack('free')");
    const adminToken = (await db.query('select prepare_guest_pack_transfer() as token')).rows[0].token;
    await db.exec('reset role');
    await db.query("update profiles set role = 'admin' where id = $1", [ids[2]]);
    await asUser(ids[2]);
    await db.query('select claim_guest_packs($1)', [adminToken]);
    assert.equal(await count(), 2, 'guest acquisition stays counted after merging into admin');
    await db.query('select claim_guest_packs($1)', [adminToken]);
    assert.equal(await count(), 2, 'admin merge retry does not add counts');
    await db.exec('reset role');
    await db.query('update auth.users set is_anonymous = false where id = $1', [ids[0]]);
    // Legacy entitlements are never inserted into counted server records.
    assert.equal((await db.query("select count(*) from pack_acquisitions where user_id = $1", [ids[3]])).rows[0].count, 0);
    await asUser(ids[5]);
    const upgradeToken = (await db.query('select prepare_guest_pack_transfer() as token')).rows[0].token;
    await db.exec('reset role');
    await db.query('update auth.users set is_anonymous = false where id = $1', [ids[5]]);
    await asUser(ids[5]);
    await db.query('select claim_guest_packs($1)', [upgradeToken]);
    await db.query('select claim_guest_packs($1)', [upgradeToken]);
    await db.query("select acquire_pack('free')");
    assert.equal(await count(), 3, 'in-place account upgrade can still acquire');
  } finally { await db.close(); }
});
