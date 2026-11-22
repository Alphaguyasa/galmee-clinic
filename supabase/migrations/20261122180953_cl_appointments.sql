-- Appointments with a doctor, kept in the core `bookings` table (resource_type 'cl_doctor',
-- resource_id = the doctor's user id, customer_id = the patient's customer). Core bookings are
-- insert-by-RPC only, so the clinic books, checks in and cancels through these functions.
-- The exclusion constraint on bookings stops a doctor from being double-booked.

create function private.cl_book_appointment(p_patient uuid, p_doctor uuid, p_starts_at timestamptz, p_minutes int, p_note text)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_customer uuid;
  v_end timestamptz;
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_starts_at is null then raise exception 'bad_date'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 240 then raise exception 'bad_minutes'; end if;
  if p_starts_at < now() - interval '10 minutes' then raise exception 'in_past'; end if;
  if p_starts_at > now() + interval '366 days' then raise exception 'too_far'; end if;
  if v_note is not null and length(v_note) > 200 then raise exception 'note_too_long'; end if;

  select customer_id into v_customer from cl_patients where id = p_patient and tenant_id = v_tenant for update;
  if not found then raise exception 'patient_not_found'; end if;
  if v_customer is null then raise exception 'patient_not_found'; end if;
  if not exists (select 1 from cl_staff_roles where tenant_id = v_tenant and user_id = p_doctor and clinical_role = 'doctor') then
    raise exception 'doctor_not_found';
  end if;
  v_end := p_starts_at + make_interval(mins => p_minutes);

  -- A repeated tap returns the booking already made.
  select id into v_id from bookings
  where tenant_id = v_tenant and resource_type = 'cl_doctor' and resource_id = p_doctor
    and customer_id = v_customer and starts_at = p_starts_at and status <> 'cancelled';
  if found then return v_id; end if;

  if exists (
    select 1 from bookings
    where tenant_id = v_tenant and resource_type = 'cl_doctor' and customer_id = v_customer
      and status in ('booked','checked_in') and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, v_end)
  ) then raise exception 'patient_busy'; end if;

  begin
    insert into bookings(tenant_id, resource_type, resource_id, customer_id, starts_at, ends_at, notes)
    values (v_tenant, 'cl_doctor', p_doctor, v_customer, p_starts_at, v_end, v_note) returning id into v_id;
  exception when exclusion_violation then raise exception 'doctor_busy'; end;
  return v_id;
end $$;

-- Moves an appointment on. Checking in puts the patient in today's queue with that doctor
-- (or keeps the visit already open) and returns the visit id.
create function private.cl_set_appointment_status(p_booking uuid, p_status text)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_b bookings%rowtype;
  v_patient uuid;
  v_visit uuid;
  v_day date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  if p_status not in ('checked_in','cancelled','no_show') then raise exception 'bad_status'; end if;
  select * into v_b from bookings where id = p_booking and tenant_id = v_tenant and resource_type = 'cl_doctor' for update;
  if not found then raise exception 'appointment_not_found'; end if;
  if v_b.status <> 'booked' then raise exception 'appointment_closed'; end if;

  if p_status = 'checked_in' then
    if (v_b.starts_at at time zone 'Africa/Addis_Ababa')::date <> v_day then raise exception 'not_today'; end if;
    select id into v_patient from cl_patients where tenant_id = v_tenant and customer_id = v_b.customer_id;
    if not found then raise exception 'patient_not_found'; end if;
    select id into v_visit from cl_visits
    where tenant_id = v_tenant and patient_id = v_patient and status in ('waiting','with_doctor','lab');
    if not found then
      v_visit := private.cl_open_visit(v_patient, v_b.resource_id, null);
    end if;
  end if;
  if p_status = 'no_show' and v_b.starts_at > now() then raise exception 'not_yet'; end if;

  update bookings set status = p_status where id = p_booking;
  return v_visit;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'cl_book_appointment(uuid,uuid,timestamptz,int,text)',
    'cl_set_appointment_status(uuid,text)'
  ] loop
    execute format('revoke all on function private.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
  end loop;
end $$;

create function public.cl_book_appointment(p_patient uuid, p_doctor uuid, p_starts_at timestamptz, p_minutes int default 15, p_note text default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_book_appointment(p_patient, p_doctor, p_starts_at, p_minutes, p_note) $$;
create function public.cl_set_appointment_status(p_booking uuid, p_status text)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_set_appointment_status(p_booking, p_status) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'cl_book_appointment(uuid,uuid,timestamptz,int,text)',
    'cl_set_appointment_status(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
