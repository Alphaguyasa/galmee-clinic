-- Galmee Clinic server logic. Writes run as private SECURITY DEFINER functions with explicit tenant and
-- role checks; each is exposed through a SECURITY INVOKER wrapper in public.

create function private.cl_require_tenant() returns uuid
language plpgsql stable set search_path = public, private as $$
declare v uuid := private.current_tenant();
begin
  if v is null then raise exception 'not_a_member' using errcode = '42501'; end if;
  return v;
end $$;
revoke all on function private.cl_require_tenant() from public, anon;
grant execute on function private.cl_require_tenant() to authenticated;

create function private.cl_lock_visit(p_visit uuid, p_tenant uuid) returns public.cl_visits
language plpgsql set search_path = public, private as $$
declare v cl_visits%rowtype;
begin
  select * into v from cl_visits where id = p_visit and tenant_id = p_tenant for update;
  if not found then raise exception 'visit_not_found'; end if;
  return v;
end $$;
revoke all on function private.cl_lock_visit(uuid, uuid) from public, anon, authenticated;

create function private.cl_recalc(p_visit uuid) returns void
language sql set search_path = public, private as $$
  update cl_visits v set services_total = coalesce((select sum(line_total) from cl_visit_services s where s.visit_id = v.id and s.reversed_at is null), 0)
  where v.id = p_visit;
$$;
revoke all on function private.cl_recalc(uuid) from public, anon, authenticated;

-- Registers a patient and the matching core customer; the card number is the next free one in this clinic.
create function private.cl_register_patient(p_full_name text, p_phone text, p_sex text, p_birth_date date, p_address text, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_id uuid;
  v_customer uuid;
  v_no int;
begin
  if p_client_ref is not null then
    select id into v_id from cl_patients where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) < 2 then raise exception 'bad_name'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cl_card_no:' || v_tenant::text, 0));
  select coalesce(max(card_no), 0) + 1 into v_no from cl_patients where tenant_id = v_tenant;
  insert into customers(tenant_id, name, phone) values (v_tenant, btrim(p_full_name), nullif(btrim(p_phone), '')) returning id into v_customer;
  insert into cl_patients(tenant_id, card_no, customer_id, full_name, phone, sex, birth_date, address, client_ref)
  values (v_tenant, v_no, v_customer, btrim(p_full_name), nullif(btrim(p_phone), ''), p_sex, p_birth_date, nullif(btrim(p_address), ''), p_client_ref)
  returning id into v_id;
  return v_id;
end $$;

create function private.cl_update_patient(p_patient uuid, p_full_name text, p_phone text, p_sex text, p_birth_date date, p_address text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_customer uuid;
begin
  if p_full_name is null or char_length(btrim(p_full_name)) < 2 then raise exception 'bad_name'; end if;
  update cl_patients set full_name = btrim(p_full_name), phone = nullif(btrim(p_phone), ''), sex = p_sex, birth_date = p_birth_date, address = nullif(btrim(p_address), '')
  where id = p_patient and tenant_id = v_tenant returning customer_id into v_customer;
  if not found then raise exception 'patient_not_found'; end if;
  update customers set name = btrim(p_full_name), phone = nullif(btrim(p_phone), '') where id = v_customer and tenant_id = v_tenant;
end $$;

-- Puts a patient in today's queue. One open visit per patient.
create function private.cl_open_visit(p_patient uuid, p_doctor uuid, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_id uuid;
  v_no int;
  v_day date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  if p_client_ref is not null then
    select id into v_id from cl_visits where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  perform 1 from cl_patients where id = p_patient and tenant_id = v_tenant for update;
  if not found then raise exception 'patient_not_found'; end if;
  if p_doctor is not null and not exists (select 1 from cl_staff_roles where tenant_id = v_tenant and user_id = p_doctor and clinical_role = 'doctor') then
    raise exception 'doctor_not_found';
  end if;
  if exists (select 1 from cl_visits where tenant_id = v_tenant and patient_id = p_patient and status in ('waiting','with_doctor','lab')) then
    raise exception 'visit_already_open';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cl_queue:' || v_tenant::text || v_day::text, 0));
  select coalesce(max(queue_no), 0) + 1 into v_no from cl_visits where tenant_id = v_tenant and visit_date = v_day;
  insert into cl_visits(tenant_id, patient_id, doctor_id, visit_date, queue_no, client_ref)
  values (v_tenant, p_patient, p_doctor, v_day, v_no, p_client_ref) returning id into v_id;
  return v_id;
end $$;

-- Moves a visit along the queue. 'done' only happens through billing.
create function private.cl_set_visit_status(p_visit uuid, p_status text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_visit cl_visits%rowtype;
begin
  if p_status not in ('waiting','with_doctor','lab','cancelled') then raise exception 'bad_status'; end if;
  v_visit := private.cl_lock_visit(p_visit, v_tenant);
  if v_visit.status in ('done','cancelled') then raise exception 'visit_closed'; end if;
  if p_status = 'cancelled' then
    if private.current_app_role() not in ('owner','manager') and v_visit.services_total > 0 then raise exception 'not_allowed'; end if;
    update cl_lab_orders set status = 'cancelled' where tenant_id = v_tenant and visit_id = p_visit and status = 'requested';
    update cl_visits set status = 'cancelled', closed_at = now() where id = p_visit;
  else
    update cl_visits set status = p_status where id = p_visit;
  end if;
end $$;

-- Adds a billable line. Only owner or manager may change the listed price.
create function private.cl_add_service(p_visit uuid, p_service uuid, p_qty numeric, p_unit_price numeric, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_visit cl_visits%rowtype;
  v_service cl_services%rowtype;
  v_id uuid;
begin
  if p_client_ref is not null then
    select id into v_id from cl_visit_services where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  if p_qty is null or p_qty <= 0 then raise exception 'bad_quantity'; end if;
  v_visit := private.cl_lock_visit(p_visit, v_tenant);
  if v_visit.status in ('done','cancelled') then raise exception 'visit_closed'; end if;
  select * into v_service from cl_services where id = p_service and tenant_id = v_tenant and active;
  if not found then raise exception 'service_not_found'; end if;
  if p_unit_price is not null and p_unit_price <> v_service.price and private.current_app_role() not in ('owner','manager') then
    raise exception 'not_allowed';
  end if;
  if p_unit_price is not null and p_unit_price < 0 then raise exception 'bad_amount'; end if;
  insert into cl_visit_services(tenant_id, visit_id, service_id, service_name, kind, qty, unit_price, client_ref)
  values (v_tenant, p_visit, p_service, v_service.name, v_service.kind, p_qty, coalesce(p_unit_price, v_service.price), p_client_ref)
  returning id into v_id;
  perform private.cl_recalc(p_visit);
  return v_id;
end $$;

create function private.cl_reverse_service(p_line uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_line cl_visit_services%rowtype;
  v_visit cl_visits%rowtype;
begin
  select * into v_line from cl_visit_services where id = p_line and tenant_id = v_tenant;
  if not found then raise exception 'line_not_found'; end if;
  v_visit := private.cl_lock_visit(v_line.visit_id, v_tenant);
  if v_visit.status in ('done','cancelled') then raise exception 'visit_closed'; end if;
  update cl_visit_services set reversed_at = now(), reversed_by = auth.uid() where id = p_line and reversed_at is null;
  if not found then raise exception 'already_reversed'; end if;
  update cl_lab_orders set status = 'cancelled' where tenant_id = v_tenant and visit_service_id = p_line and status = 'requested';
  perform private.cl_recalc(v_line.visit_id);
end $$;

-- Closes the visit: money received goes to core payments, anything left to the patient's credit.
-- Only owner or manager may leave a balance on credit.
create function private.cl_close_visit_and_bill(p_visit uuid, p_paid numeric, p_method pay_method, p_reference text, p_due date, p_close_ref uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_visit cl_visits%rowtype;
  v_customer uuid;
  v_paid numeric := coalesce(p_paid, 0);
  v_left numeric;
begin
  if p_close_ref is not null and exists (select 1 from cl_visits where tenant_id = v_tenant and close_ref = p_close_ref) then return; end if;
  v_visit := private.cl_lock_visit(p_visit, v_tenant);
  if v_visit.status in ('done','cancelled') then raise exception 'visit_closed'; end if;
  if exists (select 1 from cl_lab_orders where tenant_id = v_tenant and visit_id = p_visit and status = 'requested') then raise exception 'lab_pending'; end if;
  if v_paid < 0 then raise exception 'bad_amount'; end if;
  if v_paid > v_visit.services_total then raise exception 'overpayment'; end if;
  v_left := v_visit.services_total - v_paid;
  if v_left > 0 and private.current_app_role() not in ('owner','manager') then raise exception 'balance_due'; end if;
  select customer_id into v_customer from cl_patients where id = v_visit.patient_id and tenant_id = v_tenant;
  if v_paid > 0 then
    insert into payments(tenant_id, customer_id, amount, method, reference, ref_table, ref_id, user_id)
    values (v_tenant, v_customer, v_paid, p_method, nullif(btrim(p_reference), ''), 'cl_visits', p_visit, auth.uid());
  end if;
  if v_left > 0 then
    insert into credit_ledger(tenant_id, customer_id, type, amount, due_date, ref_table, ref_id, user_id)
    values (v_tenant, v_customer, 'debt', v_left, p_due, 'cl_visits', p_visit, auth.uid());
  end if;
  update cl_visits set status = 'done', paid_total = v_paid, debt_posted = v_left, close_ref = p_close_ref, closed_at = now() where id = p_visit;
end $$;

-- Doctor requests a lab test: bills the test and sends the patient to the lab.
create function private.cl_request_lab(p_visit uuid, p_service uuid, p_note text, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_visit cl_visits%rowtype;
  v_service cl_services%rowtype;
  v_line uuid;
  v_id uuid;
begin
  if not private.cl_has_role('doctor') then raise exception 'not_allowed'; end if;
  if p_client_ref is not null then
    select o.id into v_id from cl_lab_orders o join cl_visit_services s on s.id = o.visit_service_id where o.tenant_id = v_tenant and s.client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  select * into v_service from cl_services where id = p_service and tenant_id = v_tenant and active and kind = 'lab';
  if not found then raise exception 'service_not_found'; end if;
  v_line := private.cl_add_service(p_visit, p_service, 1, null, p_client_ref);
  v_visit := private.cl_lock_visit(p_visit, v_tenant);
  insert into cl_lab_orders(tenant_id, visit_id, patient_id, visit_service_id, test_name, note)
  values (v_tenant, p_visit, v_visit.patient_id, v_line, v_service.name, nullif(btrim(p_note), '')) returning id into v_id;
  update cl_visits set status = 'lab' where id = p_visit;
  return v_id;
end $$;

-- Lab enters the results of one order (a list of analytes). The patient goes back to the doctor when no test is left.
create function private.cl_enter_lab_results(p_order uuid, p_results jsonb)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_order cl_lab_orders%rowtype;
  v_visit cl_visits%rowtype;
  r jsonb;
begin
  if not private.cl_has_role('lab') then raise exception 'not_allowed'; end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) = 0 then raise exception 'bad_results'; end if;
  select * into v_order from cl_lab_orders where id = p_order and tenant_id = v_tenant;
  if not found then raise exception 'order_not_found'; end if;
  v_visit := private.cl_lock_visit(v_order.visit_id, v_tenant);
  if v_order.status <> 'requested' then raise exception 'order_closed'; end if;
  for r in select * from jsonb_array_elements(p_results) loop
    insert into cl_lab_results(tenant_id, order_id, analyte, value, unit, reference_range, flag)
    values (v_tenant, p_order, btrim(r->>'analyte'), btrim(r->>'value'), nullif(btrim(r->>'unit'), ''), nullif(btrim(r->>'reference_range'), ''), nullif(r->>'flag', ''));
  end loop;
  update cl_lab_orders set status = 'completed', completed_at = now() where id = p_order;
  if v_visit.status = 'lab' and not exists (select 1 from cl_lab_orders where tenant_id = v_tenant and visit_id = v_order.visit_id and status = 'requested') then
    update cl_visits set status = 'with_doctor' where id = v_order.visit_id;
  end if;
end $$;

-- Every opening of a patient card is written down.
create function private.cl_log_card_view(p_patient uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.cl_require_tenant();
begin
  if not exists (select 1 from cl_patients where id = p_patient and tenant_id = v_tenant) then raise exception 'patient_not_found'; end if;
  insert into cl_card_views(tenant_id, patient_id, viewer_id) values (v_tenant, p_patient, auth.uid());
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'cl_register_patient(text,text,text,date,text,uuid)',
    'cl_update_patient(uuid,text,text,text,date,text)',
    'cl_open_visit(uuid,uuid,uuid)',
    'cl_set_visit_status(uuid,text)',
    'cl_add_service(uuid,uuid,numeric,numeric,uuid)',
    'cl_reverse_service(uuid)',
    'cl_close_visit_and_bill(uuid,numeric,pay_method,text,date,uuid)',
    'cl_request_lab(uuid,uuid,text,uuid)',
    'cl_enter_lab_results(uuid,jsonb)',
    'cl_log_card_view(uuid)'
  ] loop
    execute format('revoke all on function private.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
  end loop;
end $$;

create function public.cl_register_patient(p_full_name text, p_phone text default null, p_sex text default null, p_birth_date date default null, p_address text default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_register_patient(p_full_name, p_phone, p_sex, p_birth_date, p_address, p_client_ref) $$;
create function public.cl_update_patient(p_patient uuid, p_full_name text, p_phone text default null, p_sex text default null, p_birth_date date default null, p_address text default null)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_update_patient(p_patient, p_full_name, p_phone, p_sex, p_birth_date, p_address) $$;
create function public.cl_open_visit(p_patient uuid, p_doctor uuid default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_open_visit(p_patient, p_doctor, p_client_ref) $$;
create function public.cl_set_visit_status(p_visit uuid, p_status text)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_set_visit_status(p_visit, p_status) $$;
create function public.cl_add_service(p_visit uuid, p_service uuid, p_qty numeric default 1, p_unit_price numeric default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_add_service(p_visit, p_service, p_qty, p_unit_price, p_client_ref) $$;
create function public.cl_reverse_service(p_line uuid)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_reverse_service(p_line) $$;
create function public.cl_close_visit_and_bill(p_visit uuid, p_paid numeric, p_method pay_method default 'cash', p_reference text default null, p_due date default null, p_close_ref uuid default null)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_close_visit_and_bill(p_visit, p_paid, p_method, p_reference, p_due, p_close_ref) $$;
create function public.cl_request_lab(p_visit uuid, p_service uuid, p_note text default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.cl_request_lab(p_visit, p_service, p_note, p_client_ref) $$;
create function public.cl_enter_lab_results(p_order uuid, p_results jsonb)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_enter_lab_results(p_order, p_results) $$;
create function public.cl_log_card_view(p_patient uuid)
returns void language sql security invoker set search_path = public, private as $$ select private.cl_log_card_view(p_patient) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'cl_register_patient(text,text,text,date,text,uuid)',
    'cl_update_patient(uuid,text,text,text,date,text)',
    'cl_open_visit(uuid,uuid,uuid)',
    'cl_set_visit_status(uuid,text)',
    'cl_add_service(uuid,uuid,numeric,numeric,uuid)',
    'cl_reverse_service(uuid)',
    'cl_close_visit_and_bill(uuid,numeric,pay_method,text,date,uuid)',
    'cl_request_lab(uuid,uuid,text,uuid)',
    'cl_enter_lab_results(uuid,jsonb)',
    'cl_log_card_view(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
