begin;

create function public.fulfill_apple_coin_purchase(
  p_request_user uuid, p_owner uuid, p_transaction_id text,
  p_product_id text, p_environment text, p_quantity integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := p_owner; v_next uuid; v_path uuid[] := '{}'; v_lock uuid;
  v_amount bigint; v_key text; v_inserted boolean; v_existing public.verified_coin_credits;
begin
  if p_request_user is null or p_owner is null or p_environment not in ('Sandbox', 'Production')
     or p_transaction_id is null or p_transaction_id !~ '^[0-9]+$'
     or p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'INVALID_PURCHASE';
  end if;
  v_amount := case p_product_id
    when 'dakkusiru.coin_1000' then 1000 when 'dakkusiru.coin_3000' then 3000
    when 'dakkusiru.coin_5000' then 5500 when 'dakkusiru.coin_10000' then 11500
    else null end;
  if v_amount is null then raise exception 'INVALID_PRODUCT'; end if;
  v_amount := v_amount * p_quantity;
  loop
    if v_user = any(v_path) or cardinality(v_path) >= 32 then raise exception 'INVALID_TRANSFER_CHAIN'; end if;
    v_path := array_append(v_path, v_user);
    select target_id into v_next from public.guest_pack_transfers where source_id = v_user;
    if v_next is null or v_next = v_user then exit; end if;
    v_user := v_next;
  end loop;
  if v_user <> p_request_user then raise exception 'PURCHASE_OWNER_MISMATCH'; end if;
  -- Match guest-merge lock ordering; a delayed receipt can credit the new owner.
  for v_lock in select unnest(v_path) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended(v_lock::text, 0));
  end loop;
  select target_id into v_next from public.guest_pack_transfers where source_id = v_user;
  if v_next is not null and v_next <> v_user then raise exception 'OWNERSHIP_CHANGED_RETRY'; end if;
  v_key := 'apple:' || p_environment || ':' || p_transaction_id;
  insert into public.verified_coin_credits(transaction_id, user_id, amount)
    values(v_key, p_owner, v_amount) on conflict do nothing;
  v_inserted := found;
  if v_inserted then
    insert into public.coin_wallets(user_id, balance) values(v_user, v_amount)
      on conflict(user_id) do update set balance = coin_wallets.balance + excluded.balance;
  else
    select * into v_existing from public.verified_coin_credits where transaction_id = v_key;
    if v_existing.user_id <> p_owner or v_existing.amount <> v_amount then raise exception 'TRANSACTION_CONFLICT'; end if;
  end if;
  return jsonb_build_object('alreadyCredited', not v_inserted, 'amount', v_amount,
    'balance', coalesce((select balance from public.coin_wallets where user_id = v_user), 0));
end;
$$;
revoke all on function public.fulfill_apple_coin_purchase(uuid, uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.fulfill_apple_coin_purchase(uuid, uuid, text, text, text, integer) to service_role;

create function public.apple_coin_billing_ready() returns boolean
language sql set search_path = '' as $$ select true; $$;
revoke all on function public.apple_coin_billing_ready() from public, anon, authenticated;
grant execute on function public.apple_coin_billing_ready() to service_role;

commit;
