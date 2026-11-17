-- Lab-ready Telegram notice for Galmee Clinic. Run with Supabase `execute_sql`; everything rolls back and the
-- final RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); ul uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; sa uuid; sl uuid; pa uuid; va uuid; oa uuid; n int; r text := ''; b text; ok boolean;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cl-n-a@test.invalid'),(ud,'authenticated','authenticated','cl-n-d@test.invalid'),
    (ul,'authenticated','authenticated','cl-n-l@test.invalid'),(ub,'authenticated','authenticated','cl-n-b@test.invalid');
  insert into public.tenants(name, vertical) values ('CLN A','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('CLN B','clinic') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'A owner','owner'),(ud,ta,'A doctor','staff'),(ul,ta,'A lab','staff'),(ub,tb,'B owner','owner');
  insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ud,'doctor'),(ta,ul,'lab'),(ta,ua,'reception');
  insert into public.cl_services(tenant_id,name,kind,price) values (ta,'Consultation','consultation',150) returning id into sa;
  insert into public.cl_services(tenant_id,name,kind,price) values (ta,'Malaria film','lab',100) returning id into sl;
  -- The doctor is bound to the bot in Amharic; the same chat also holds a binding in clinic B (must not matter);
  -- the lab person has a binding too (must get nothing).
  insert into public.bot_links(tenant_id, kind, user_id, chat_id, lang, active) values
    (ta,'staff',ud,'7000001','am',true),(tb,'owner',ub,'7000001','en',true),(ta,'staff',ul,'7000002','en',true);

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  pa := public.cl_register_patient('Patient N');
  va := public.cl_open_visit(pa, ud);
  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role','authenticated')::text, true);
  perform public.cl_add_service(va, sa);
  oa := public.cl_request_lab(va, sl);
  perform set_config('role','postgres', true);
  select count(*) into n from public.notifications where to_addr in ('7000001','7000002'); r := r || 'on request=' || n || ' (expect 0); ';

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ul, 'role','authenticated')::text, true);
  perform public.cl_enter_lab_results(oa, '[{"analyte":"Blood film","value":"Negative","flag":"normal"}]'::jsonb);
  perform set_config('role','postgres', true);
  select count(*) into n from public.notifications where to_addr = '7000001'; r := r || 'doctor notices=' || n || ' (expect 1); ';
  select count(*) into n from public.notifications where to_addr = '7000001' and tenant_id = ta; r := r || 'in clinic A=' || n || ' (expect 1); ';
  select count(*) into n from public.notifications where to_addr = '7000002'; r := r || 'lab person notices=' || n || ' (expect 0); ';
  select body into b from public.notifications where to_addr = '7000001'; r := r || 'body=' || b || '; ';
  r := r || 'no name in body=' || (position('Patient N' in b) = 0) || ' (expect true); ';
  r := r || 'no result in body=' || (position('Negative' in b) = 0) || ' (expect true); ';

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from public.notifications where to_addr = '7000001'; r := r || 'clinic B reads A notice=' || n || ' (expect 0); ';
  begin perform private.cl_lab_ready_notify(); ok := true; exception when others then ok := false; end; r := r || 'call trigger fn directly=' || ok || ' (expect false); ';
  raise exception 'RESULT: %', r;
end $$;
