-- Booking creation + payment recording, as single database transactions.
-- Both are SECURITY DEFINER and callable only by the server (service role): browsers never write bookings.

-- ── Release vans held by unpaid bookings whose hold expired ───────────
create or replace function public.release_expired_holds()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare n integer;
begin
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Payment not completed in time'
   where status = 'pending_payment' and hold_expires_at is not null and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Create one booking per van, atomically ────────────────────────────
-- p_vans: [{ "vehicle_type_id", "passengers", "subtotal", "discount", "total", "deposit" }, ...]
-- p_addons: [{ "addon_id", "qty", "unit_price" }] (attached to the first booking)
-- Picks a free vehicle of each type; the exclusion constraint is the final word on clashes.
create or replace function public.create_booking(
  p_customer_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_trip_type public.trip_type,
  p_destination_id uuid,
  p_pickup jsonb,
  p_dropoff jsonb,
  p_stops jsonb,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_luggage integer,
  p_vans jsonb,
  p_addons jsonb,
  p_promo_code_id uuid,
  p_distance_km numeric,
  p_quote jsonb,
  p_source public.booking_source,
  p_notes text,
  p_hold_minutes integer default 30
)
returns table (booking_id uuid, ref_code text, group_id uuid)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_group uuid := case when jsonb_array_length(p_vans) > 1 then gen_random_uuid() else null end;
  v_van jsonb;
  v_vehicle uuid;
  v_booking uuid;
  v_ref text;
  v_first uuid;
  v_inserted boolean;
begin
  if jsonb_array_length(p_vans) < 1 then
    raise exception 'NO_VANS' using errcode = 'P0001';
  end if;

  perform public.release_expired_holds();

  for v_van in select value from jsonb_array_elements(p_vans) loop
    v_inserted := false;
    -- Try each bookable vehicle of the requested type until one fits the time slot.
    for v_vehicle in
      select v.id from public.vehicles v
       where v.type_id = (v_van ->> 'vehicle_type_id')::uuid
         and v.status in ('available', 'on_trip')
       order by v.current_mileage asc -- spread wear across the fleet
    loop
      begin
        insert into public.bookings (
          group_id, customer_id, vehicle_type_id, vehicle_id, trip_type, destination_id,
          pickup, dropoff, stops, start_at, end_at, passengers, luggage, status, hold_expires_at,
          contact_name, contact_phone, contact_email, distance_km,
          subtotal, discount, total, deposit_amount, currency, quote_snapshot, promo_code_id, source, notes
        ) values (
          v_group, p_customer_id, (v_van ->> 'vehicle_type_id')::uuid, v_vehicle, p_trip_type, p_destination_id,
          p_pickup, p_dropoff, coalesce(p_stops, '[]'::jsonb), p_start_at, p_end_at,
          (v_van ->> 'passengers')::integer, case when v_first is null then coalesce(p_luggage, 0) else 0 end,
          'pending_payment', now() + make_interval(mins => p_hold_minutes),
          p_contact_name, p_contact_phone, nullif(p_contact_email, ''), p_distance_km,
          (v_van ->> 'subtotal')::numeric, (v_van ->> 'discount')::numeric, (v_van ->> 'total')::numeric,
          (v_van ->> 'deposit')::numeric, 'GHS', p_quote, p_promo_code_id, p_source, p_notes
        )
        returning id, bookings.ref_code into v_booking, v_ref;
        v_inserted := true;
        exit;
      exception when exclusion_violation then
        -- this van is busy then; try the next one
        null;
      end;
    end loop;

    if not v_inserted then
      raise exception 'NO_VAN_AVAILABLE' using errcode = 'P0001';
    end if;

    if v_first is null then v_first := v_booking; end if;
    booking_id := v_booking;
    ref_code := v_ref;
    group_id := v_group;
    return next;
  end loop;

  if p_addons is not null and jsonb_array_length(p_addons) > 0 then
    insert into public.booking_addons (booking_id, addon_id, qty, unit_price)
    select v_first, (a ->> 'addon_id')::uuid, (a ->> 'qty')::integer, (a ->> 'unit_price')::numeric
      from jsonb_array_elements(p_addons) a;
  end if;

  if p_promo_code_id is not null then
    update public.promo_codes set used_count = used_count + 1 where id = p_promo_code_id;
  end if;
end;
$$;

-- ── Record a successful payment (idempotent) ──────────────────────────
-- Safe to call from both the webhook and the callback page: only the first call applies.
-- The amount is spread over every booking in the group in proportion to each booking's balance.
create or replace function public.record_payment_success(
  p_reference text,
  p_amount numeric,
  p_method public.payment_method,
  p_paid_at timestamptz,
  p_raw jsonb
)
returns table (applied boolean, booking_id uuid)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_payment public.payments%rowtype;
  v_lead public.bookings%rowtype;
  v_due numeric;
  v_left numeric;
  v_share numeric;
  r record;
  v_count integer;
  v_i integer := 0;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001'; end if;

  booking_id := v_payment.booking_id;
  if v_payment.status = 'success' then
    applied := false;
    return next;
    return;
  end if;
  if p_amount < v_payment.amount then
    raise exception 'AMOUNT_MISMATCH' using errcode = 'P0001';
  end if;

  update public.payments
     set status = 'success', method = coalesce(p_method, method), paid_at = coalesce(p_paid_at, now()), raw = p_raw
   where id = v_payment.id;

  select * into v_lead from public.bookings where id = v_payment.booking_id for update;

  select sum(greatest(b.total - b.amount_paid, 0)), count(*) into v_due, v_count
    from public.bookings b
   where (v_lead.group_id is not null and b.group_id = v_lead.group_id) or b.id = v_lead.id;

  v_left := v_payment.amount;
  for r in
    select b.id, greatest(b.total - b.amount_paid, 0) as due
      from public.bookings b
     where (v_lead.group_id is not null and b.group_id = v_lead.group_id) or b.id = v_lead.id
     order by b.created_at, b.id
     for update
  loop
    v_i := v_i + 1;
    v_share := case
      when v_i = v_count then v_left
      when v_due > 0 then round(v_payment.amount * r.due / v_due, 2)
      else 0 end;
    v_left := v_left - v_share;
    update public.bookings
       set amount_paid = amount_paid + v_share,
           status = case when status = 'pending_payment' then 'confirmed'::public.booking_status else status end,
           hold_expires_at = null
     where id = r.id;
  end loop;

  applied := true;
  return next;
end;
$$;

revoke execute on function public.create_booking(uuid, text, text, text, public.trip_type, uuid, jsonb, jsonb, jsonb,
  timestamptz, timestamptz, integer, jsonb, jsonb, uuid, numeric, jsonb, public.booking_source, text, integer)
  from public, anon, authenticated;
revoke execute on function public.record_payment_success(text, numeric, public.payment_method, timestamptz, jsonb)
  from public, anon, authenticated;
revoke execute on function public.release_expired_holds() from public, anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, text, public.trip_type, uuid, jsonb, jsonb, jsonb,
  timestamptz, timestamptz, integer, jsonb, jsonb, uuid, numeric, jsonb, public.booking_source, text, integer)
  to service_role;
grant execute on function public.record_payment_success(text, numeric, public.payment_method, timestamptz, jsonb) to service_role;
grant execute on function public.release_expired_holds() to service_role;
