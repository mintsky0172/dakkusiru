begin;

create table public.pack_acquisitions (
  user_id uuid not null references auth.users(id),
  pack_id text not null references public.shop_packs(id) on delete cascade,
  created_at timestamptz not null default now(),
  counted boolean not null,
  primary key (user_id, pack_id)
);
create index pack_acquisitions_counted_idx on public.pack_acquisitions(pack_id) where counted;
create table public.coin_wallets (
  user_id uuid primary key references auth.users(id),
  balance bigint not null default 0 check (balance >= 0)
);
create table public.verified_coin_credits (
  transaction_id text primary key,
  user_id uuid not null references auth.users(id),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);
create table public.guest_pack_transfers (
  source_id uuid primary key references auth.users(id),
  token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days',
  target_id uuid references auth.users(id)
);
alter table public.pack_acquisitions enable row level security;
alter table public.coin_wallets enable row level security;
alter table public.verified_coin_credits enable row level security;
alter table public.guest_pack_transfers enable row level security;
revoke all on public.pack_acquisitions, public.coin_wallets, public.verified_coin_credits,
  public.guest_pack_transfers from anon, authenticated;
grant select on public.pack_acquisitions, public.coin_wallets to authenticated;
create policy own_acquisitions on public.pack_acquisitions for select to authenticated using (user_id = auth.uid());
create policy own_wallet on public.coin_wallets for select to authenticated using (user_id = auth.uid());

create function public.get_pack_popularity() returns table(pack_id text, acquisition_count bigint)
language sql stable security definer set search_path = '' as $$
  select a.pack_id, count(*) from public.pack_acquisitions a
  join public.shop_packs p on p.id = a.pack_id
  where a.counted and p.is_active = true group by a.pack_id;
$$;

create function public.prepare_guest_pack_transfer() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and is_anonymous) then
    raise exception 'GUEST_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.guest_pack_transfers where source_id = auth.uid() and target_id is not null and target_id <> source_id) then
    raise exception 'GUEST_ALREADY_TRANSFERRED';
  end if;
  insert into public.guest_pack_transfers(source_id) values(auth.uid())
  on conflict(source_id) do update set expires_at = now() + interval '7 days'
  returning token into v_token;
  return v_token;
end;
$$;

create function public.claim_guest_packs(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_transfer public.guest_pack_transfers; v_admin boolean;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED';
  end if;
  select * into v_transfer from public.guest_pack_transfers where token = p_token;
  if not found then raise exception 'INVALID_TRANSFER'; end if;
  -- Use the same lock ordering as acquire_pack and other transfers.
  perform pg_advisory_xact_lock(hashtextextended(least(v_transfer.source_id::text, auth.uid()::text), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_transfer.source_id::text, auth.uid()::text), 0));
  select * into v_transfer from public.guest_pack_transfers where token = p_token for update;
  if v_transfer.target_id = auth.uid() then return; end if;
  if v_transfer.target_id is not null or v_transfer.expires_at < now() then raise exception 'INVALID_TRANSFER'; end if;
  if v_transfer.source_id = auth.uid() then
    update public.guest_pack_transfers set target_id = auth.uid() where source_id = auth.uid();
    return;
  end if;
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into v_admin;
  insert into public.pack_acquisitions(user_id, pack_id, created_at, counted)
    select auth.uid(), pack_id, created_at, counted and not v_admin
    from public.pack_acquisitions where user_id = v_transfer.source_id
  on conflict(user_id, pack_id) do update
    set counted = pack_acquisitions.counted or excluded.counted,
        created_at = least(pack_acquisitions.created_at, excluded.created_at);
  delete from public.pack_acquisitions where user_id = v_transfer.source_id;
  insert into public.coin_wallets(user_id) values(auth.uid()) on conflict do nothing;
  update public.coin_wallets set balance = balance + coalesce(
    (select balance from public.coin_wallets where user_id = v_transfer.source_id), 0)
    where user_id = auth.uid();
  update public.coin_wallets set balance = 0 where user_id = v_transfer.source_id;
  update public.guest_pack_transfers set target_id = auth.uid() where source_id = v_transfer.source_id;
end;
$$;

create function public.acquire_pack(p_pack_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_pack public.shop_packs; v_admin boolean; v_price bigint; v_balance bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.guest_pack_transfers where source_id = auth.uid() and target_id is not null and target_id <> source_id) then
    raise exception 'GUEST_ALREADY_TRANSFERRED';
  end if;
  if exists(select 1 from public.pack_acquisitions where user_id = auth.uid() and pack_id = p_pack_id) then
    return jsonb_build_object('already_owned', true);
  end if;
  select * into v_pack from public.shop_packs where id = p_pack_id and is_active = true for share;
  if not found then raise exception 'PACK_UNAVAILABLE'; end if;
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') into v_admin;
  v_price := case when v_pack.status = 'free' or v_admin then 0 else v_pack.coin_price end;
  if v_price is null or v_price < 0 then raise exception 'INVALID_PRICE'; end if;
  if v_price > 0 then
    select balance into v_balance from public.coin_wallets where user_id = auth.uid() for update;
    if v_balance is null or v_balance < v_price then raise exception 'INSUFFICIENT_SERVER_COINS'; end if;
    update public.coin_wallets set balance = balance - v_price where user_id = auth.uid();
  end if;
  insert into public.pack_acquisitions(user_id, pack_id, counted) values(auth.uid(), p_pack_id, not v_admin);
  return jsonb_build_object('already_owned', false);
end;
$$;

-- Called only by a receipt-verification backend, never by the app.
create function public.credit_verified_coins(p_user_id uuid, p_transaction_id text, p_amount bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 or p_transaction_id is null or length(p_transaction_id) = 0 then raise exception 'INVALID_CREDIT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if exists(select 1 from public.guest_pack_transfers where source_id = p_user_id and target_id is not null and target_id <> source_id) then
    raise exception 'GUEST_ALREADY_TRANSFERRED';
  end if;
  insert into public.verified_coin_credits(transaction_id, user_id, amount)
    values(p_transaction_id, p_user_id, p_amount) on conflict do nothing;
  if not found then return; end if;
  insert into public.coin_wallets(user_id, balance) values(p_user_id, p_amount)
    on conflict(user_id) do update set balance = coin_wallets.balance + excluded.balance;
end;
$$;
revoke all on function public.get_pack_popularity() from public;
grant execute on function public.get_pack_popularity() to anon, authenticated;
revoke all on function public.prepare_guest_pack_transfer(), public.claim_guest_packs(uuid), public.acquire_pack(text) from public;
grant execute on function public.prepare_guest_pack_transfer(), public.claim_guest_packs(uuid), public.acquire_pack(text) to authenticated;
revoke all on function public.credit_verified_coins(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.credit_verified_coins(uuid, text, bigint) to service_role;
commit;
