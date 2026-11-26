-- Gives the demo clinic something to show on the Appointments screen: up to 2 more
-- appointments later today (only slots still ahead) and 4 tomorrow, all with the demo
-- owner (who holds the doctor role), for the first patients by card number. Notes are
-- non-clinical. Owner of the tenant named exactly "Galmee Clinic Demo" only, once.
-- Run after cl_load_demo_data(); the bookings go straight into core `bookings` with the
-- same shape cl_book_appointment writes (resource_type 'cl_doctor').
create function private.cl_load_demo_appointments() returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_owner uuid := auth.uid();
  v_name text;
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  v_customers uuid[];
  v_slots timestamptz[];
  v_notes text[] := array['Follow-up visit','Review lab results','Blood pressure check','Wound dressing change','Follow-up visit','Review after treatment'];
  i int; n int := 0;
begin
  select name into v_name from tenants where id = v_tenant;
  if v_name is distinct from 'Galmee Clinic Demo' then raise exception 'not_demo_tenant'; end if;
  if private.current_app_role() is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from cl_staff_roles where tenant_id = v_tenant and user_id = v_owner and clinical_role = 'doctor') then
    raise exception 'not_loaded';
  end if;
  if exists (select 1 from bookings where tenant_id = v_tenant and resource_type = 'cl_doctor') then
    raise exception 'already_loaded';
  end if;

  select array_agg(customer_id order by card_no) into v_customers
  from (select customer_id, card_no from cl_patients where tenant_id = v_tenant order by card_no limit 6) p;
  if coalesce(array_length(v_customers, 1), 0) < 6 then raise exception 'not_loaded'; end if;

  v_slots := array[
    (v_today + time '15:00') at time zone 'Africa/Addis_Ababa',
    (v_today + time '16:30') at time zone 'Africa/Addis_Ababa',
    (v_today + 1 + time '08:30') at time zone 'Africa/Addis_Ababa',
    (v_today + 1 + time '09:00') at time zone 'Africa/Addis_Ababa',
    (v_today + 1 + time '10:30') at time zone 'Africa/Addis_Ababa',
    (v_today + 1 + time '14:00') at time zone 'Africa/Addis_Ababa'
  ];
  for i in 1 .. 6 loop
    continue when v_slots[i] <= now();
    insert into bookings(tenant_id, resource_type, resource_id, customer_id, starts_at, ends_at, notes)
    values (v_tenant, 'cl_doctor', v_owner, v_customers[i], v_slots[i], v_slots[i] + interval '30 minutes', v_notes[i]);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function private.cl_load_demo_appointments() from public, anon;
grant execute on function private.cl_load_demo_appointments() to authenticated;

create function public.cl_load_demo_appointments() returns int language sql security invoker set search_path = public, private as $$ select private.cl_load_demo_appointments() $$;
revoke all on function public.cl_load_demo_appointments() from public, anon;
grant execute on function public.cl_load_demo_appointments() to authenticated;
