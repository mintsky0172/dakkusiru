begin;

create or replace function public.claim_guest_packs(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_transfer public.guest_pack_transfers;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id = auth.uid() and not is_anonymous) then
    raise exception 'ACCOUNT_REQUIRED';
  end if;
  select * into v_transfer from public.guest_pack_transfers where token = p_token;
  if not found then raise exception 'INVALID_TRANSFER'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_transfer.source_id::text, auth.uid()::text), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_transfer.source_id::text, auth.uid()::text), 0));
  select * into v_transfer from public.guest_pack_transfers where token = p_token for update;
  if v_transfer.target_id = auth.uid() then return; end if;
  if v_transfer.target_id is not null or v_transfer.expires_at < now() then raise exception 'INVALID_TRANSFER'; end if;
  if v_transfer.source_id = auth.uid() then
    update public.guest_pack_transfers set target_id = auth.uid() where source_id = auth.uid();
    return;
  end if;
  -- Preserve acquisition-time eligibility, regardless of the destination role.
  insert into public.pack_acquisitions(user_id, pack_id, created_at, counted)
    select auth.uid(), pack_id, created_at, counted
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

commit;
