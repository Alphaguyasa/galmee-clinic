-- Day-before SMS reminders for appointments. Reception (or the owner/manager) presses one button
-- for a day; each booked appointment whose patient has a phone gets one SMS row in the core
-- `notifications` queue, and `cl_appointment_reminders` makes sure the same appointment is never
-- texted twice. The text names the clinic, the date, the time and the card number only: no doctor,
-- no reason, nothing clinical.

create table public.cl_appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id, booking_id)
);
create index cl_appointment_reminders_booking on public.cl_appointment_reminders (booking_id);
create index cl_appointment_reminders_notification on public.cl_appointment_reminders (notification_id);
alter table public.cl_appointment_reminders enable row level security;
create policy cl_appointment_reminders_sel on public.cl_appointment_reminders for select to authenticated
  using (tenant_id = (select private.current_tenant()));
revoke insert, update, delete on public.cl_appointment_reminders from anon, authenticated;

create function private.cl_queue_appointment_reminders(p_day date)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  v_clinic text;
  v_lang text;
  v_date text;
  v_queued int := 0; v_no_phone int := 0; v_already int := 0;
  r record; v_phone text; v_clock text; v_body text; v_new uuid; v_note uuid;
begin
  if private.current_app_role() not in ('owner','manager')
     and not exists (select 1 from cl_staff_roles where tenant_id = v_tenant and user_id = auth.uid() and clinical_role = 'reception') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_day is null or p_day < v_today or p_day > v_today + 1 then raise exception 'bad_day'; end if;

  select t.name, coalesce(t.default_lang, 'am') into v_clinic, v_lang from tenants t where t.id = v_tenant;
  if v_lang not in ('am','om','en') then v_lang := 'am'; end if;
  v_date := private.bot_eth_day(p_day, v_lang);

  for r in
    select b.id, b.starts_at, p.card_no, p.phone
    from bookings b
    join cl_patients p on p.tenant_id = b.tenant_id and p.customer_id = b.customer_id
    where b.tenant_id = v_tenant and b.resource_type = 'cl_doctor' and b.status = 'booked'
      and (b.starts_at at time zone 'Africa/Addis_Ababa')::date = p_day
    order by b.starts_at
  loop
    v_phone := regexp_replace(coalesce(r.phone, ''), '[\s-]', '', 'g');
    if v_phone !~ '^\+?[0-9]{9,15}$' then
      v_no_phone := v_no_phone + 1;
      continue;
    end if;
    v_new := null;
    insert into cl_appointment_reminders (tenant_id, booking_id) values (v_tenant, r.id)
    on conflict (tenant_id, booking_id) do nothing
    returning id into v_new;
    if v_new is null then
      v_already := v_already + 1;
      continue;
    end if;
    v_clock := to_char(r.starts_at at time zone 'Africa/Addis_Ababa', 'HH24:MI');
    v_body := case v_lang
      when 'om' then format('%s: Yaadachiisa beellamaa. %s, sa''aatii %s. Kaardii lak. %s.', v_clinic, v_date, v_clock, r.card_no)
      when 'en' then format('%s: Appointment reminder. %s at %s. Card no. %s.', v_clinic, v_date, v_clock, r.card_no)
      else format('%s፡ የቀጠሮ ማስታወሻ። %s ሰዓት %s። ካርድ ቁ. %s።', v_clinic, v_date, v_clock, r.card_no)
    end;
    v_note := private.bot_queue_notification(v_tenant, 'sms', v_phone, v_body);
    update cl_appointment_reminders set notification_id = v_note where id = v_new;
    v_queued := v_queued + 1;
  end loop;

  return jsonb_build_object('queued', v_queued, 'no_phone', v_no_phone, 'already', v_already);
end $$;
revoke all on function private.cl_queue_appointment_reminders(date) from public, anon;
grant execute on function private.cl_queue_appointment_reminders(date) to authenticated;

create function public.cl_queue_appointment_reminders(p_day date)
returns jsonb language sql security invoker set search_path = public, private as $$ select private.cl_queue_appointment_reminders(p_day) $$;
revoke all on function public.cl_queue_appointment_reminders(date) from public, anon;
grant execute on function public.cl_queue_appointment_reminders(date) to authenticated;
