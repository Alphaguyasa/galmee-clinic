-- Test for cl_load_demo_appointments. Paste the migration above the test inside the same block
-- (or apply it first); everything rolls back and the final RAISE carries the result line.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); ta uuid; tb uuid; n int; r text := ''; ok boolean; err text;
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  insert into auth.users(id, aud, role, email) values (ua,'authenticated','authenticated','cl-dappt-a@test.invalid'),(ub,'authenticated','authenticated','cl-dappt-b@test.invalid');
  insert into public.tenants(name, vertical) values ('Galmee Clinic Demo','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('Other clinic','clinic') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'Demo owner','owner'),(ub,tb,'Other owner','owner');
  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  begin perform public.cl_load_demo_appointments(); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'other tenant=' || ok || ' ' || err || ' (expect false not_demo_tenant); ';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  begin perform public.cl_load_demo_appointments(); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'before loader=' || ok || ' ' || err || ' (expect false not_loaded); ';
  perform public.cl_load_demo_data();
  n := public.cl_load_demo_appointments(); r := r || 'booked=' || n || ' (expect 4..6); ';
  select count(*) into n from bookings where resource_type = 'cl_doctor' and (starts_at at time zone 'Africa/Addis_Ababa')::date = v_today + 1; r := r || 'tomorrow=' || n || ' (expect 4); ';
  select count(*) into n from bookings where resource_type = 'cl_doctor' and starts_at <= now(); r := r || 'in past=' || n || ' (expect 0); ';
  select count(*) into n from bookings where resource_type = 'cl_doctor' and resource_id <> ua; r := r || 'other doctor=' || n || ' (expect 0); ';
  select count(*) into n from bookings b where resource_type = 'cl_doctor' and not exists (select 1 from cl_patients p where p.customer_id = b.customer_id); r := r || 'no patient=' || n || ' (expect 0); ';
  select count(*) into n from bookings where resource_type = 'cl_doctor' and status = 'booked'; r := r || 'booked status=' || n || ' (expect = booked); ';
  begin perform public.cl_load_demo_appointments(); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'second=' || ok || ' ' || err || ' (expect false already_loaded); ';
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from bookings where resource_type = 'cl_doctor'; r := r || 'other tenant sees=' || n || ' (expect 0); ';
  raise exception 'RESULTS: %', r;
end $$;
