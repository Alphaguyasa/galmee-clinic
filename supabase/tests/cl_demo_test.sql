-- Demo loader test for Galmee Clinic. Run with Supabase `execute_sql`; everything rolls back and the final
-- RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); ta uuid; tb uuid; n int; r text := ''; ok boolean; err text;
begin
  insert into auth.users(id, aud, role, email) values (ua,'authenticated','authenticated','cl-demo-a@test.invalid'),(ub,'authenticated','authenticated','cl-demo-b@test.invalid');
  insert into public.tenants(name, vertical) values ('Galmee Clinic Demo','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('Other clinic','clinic') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'Demo owner','owner'),(ub,tb,'Other owner','owner');
  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  begin perform public.cl_load_demo_data(); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'other tenant=' || ok || ' ' || err || ' (expect false not_demo_tenant); ';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  n := public.cl_load_demo_data(); r := r || 'visits=' || n || ' (expect 39); ';
  select count(*) into n from cl_patients; r := r || 'patients=' || n || ' (expect 30); ';
  select count(*) into n from cl_services; r := r || 'services=' || n || ' (expect 10); ';
  select count(*) into n from cl_visits where status='done'; r := r || 'done=' || n || ' (expect 35); ';
  select count(*) into n from cl_lab_orders where status='requested'; r := r || 'lab waiting=' || n || ' (expect 1); ';
  select count(*) into n from cl_visits where status='done' and paid_total + debt_posted <> services_total; r := r || 'unbalanced=' || n || ' (expect 0); ';
  begin perform public.cl_load_demo_data(); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'second load=' || ok || ' ' || err || ' (expect false already_loaded); ';
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from cl_patients; r := r || 'other tenant sees patients=' || n || ' (expect 0); ';
  raise exception 'RESULT: %', r;
end $$;
