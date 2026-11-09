-- Cross-tenant, role-separation and billing test for Galmee Clinic. Run with Supabase `execute_sql`.
-- Everything rolls back: the final RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); ul uuid := gen_random_uuid(); ur uuid := gen_random_uuid();
  ta uuid; tb uuid; pa uuid; pb uuid; pc uuid; sa uuid; sl uuid; sb uuid; va uuid; vb uuid; oa uuid; ln uuid; n int; r text := ''; ok boolean; err text; v numeric; t text;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cl-a@test.invalid'),(ub,'authenticated','authenticated','cl-b@test.invalid'),(ud,'authenticated','authenticated','cl-d@test.invalid'),
    (ul,'authenticated','authenticated','cl-l@test.invalid'),(ur,'authenticated','authenticated','cl-r@test.invalid');
  insert into public.tenants(name, vertical) values ('CL A','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('CL B','clinic') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'A owner','owner'),(ub,tb,'B owner','owner'),(ud,ta,'A doctor','staff'),(ul,ta,'A lab','staff'),(ur,ta,'A reception','staff');
  insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ud,'doctor'),(ta,ul,'lab'),(ta,ur,'reception');
  insert into public.cl_services(tenant_id,name,kind,price) values (ta,'Consultation','consultation',200) returning id into sa;
  insert into public.cl_services(tenant_id,name,kind,price) values (ta,'CBC','lab',150) returning id into sl;
  insert into public.cl_services(tenant_id,name,kind,price) values (tb,'Consult B','consultation',100) returning id into sb;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  pb := public.cl_register_patient('Patient B','0911000002');
  vb := public.cl_open_visit(pb);

  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role','authenticated')::text, true);
  pa := public.cl_register_patient('Patient A','0911000001','female',null,null,'11111111-1111-1111-1111-111111111111');
  r := r || 'idempotent patient=' || (public.cl_register_patient('Patient A','0911000001','female',null,null,'11111111-1111-1111-1111-111111111111') = pa) || ' (expect true); ';
  pc := public.cl_register_patient('Patient C');
  select card_no into n from public.cl_patients where id = pc; r := r || 'card_no=' || n || ' (expect 2); ';
  va := public.cl_open_visit(pa, ud);
  begin perform public.cl_open_visit(pa); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'second open=' || ok || ' ' || err || ' (expect false visit_already_open); ';
  begin perform public.cl_open_visit(pb); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'open B patient=' || ok || ' ' || err || ' (expect false patient_not_found); ';
  begin perform public.cl_add_service(vb, sa); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'bill B visit=' || ok || ' ' || err || ' (expect false visit_not_found); ';
  begin perform public.cl_add_service(va, sb); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'B service=' || ok || ' ' || err || ' (expect false service_not_found); ';
  ln := public.cl_add_service(va, sa);
  begin perform public.cl_add_service(va, sa, 1, 1); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'reception price override=' || ok || ' ' || err || ' (expect false not_allowed); ';
  begin perform public.cl_request_lab(va, sl); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'reception requests lab=' || ok || ' ' || err || ' (expect false not_allowed); ';
  begin insert into public.cl_patients(tenant_id,card_no,customer_id,full_name) select ta,99,customer_id,'x' from public.cl_patients where id=pa; ok := true; exception when others then ok := false; end; r := r || 'direct patient insert=' || ok || ' (expect false); ';
  begin insert into public.cl_visit_notes(visit_id,complaint) values (va,'sneak'); ok := true; exception when others then ok := false; end; r := r || 'reception writes note=' || ok || ' (expect false); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ud, 'role','authenticated')::text, true);
  insert into public.cl_visit_notes(visit_id,complaint,diagnosis) values (va,'Fever','Malaria');
  select count(*) into n from public.cl_visit_notes; r := r || 'doctor sees notes=' || n || ' (expect 1); ';
  oa := public.cl_request_lab(va, sl, null, '22222222-2222-2222-2222-222222222222');
  r := r || 'idempotent lab=' || (public.cl_request_lab(va, sl, null, '22222222-2222-2222-2222-222222222222') = oa) || ' (expect true); ';
  select status, services_total into t, v from public.cl_visits where id=va; r := r || 'after lab ' || t || ' total=' || v || ' (expect lab 350); ';
  begin perform public.cl_enter_lab_results(oa, '[{"analyte":"WBC","value":"7.2"}]'); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'doctor enters result=' || ok || ' ' || err || ' (expect false not_allowed); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role','authenticated')::text, true);
  select count(*) into n from public.cl_visit_notes; r := r || 'reception notes=' || n || ' (expect 0); ';
  select count(*) into n from public.cl_lab_orders; r := r || 'reception orders=' || n || ' (expect 0); ';
  begin perform public.cl_close_visit_and_bill(va, 350, 'cash'); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'close with lab pending=' || ok || ' ' || err || ' (expect false lab_pending); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ul, 'role','authenticated')::text, true);
  select count(*) into n from public.cl_visit_notes; r := r || 'lab notes=' || n || ' (expect 0); ';
  select count(*) into n from public.cl_lab_orders; r := r || 'lab orders=' || n || ' (expect 1); ';
  perform public.cl_enter_lab_results(oa, '[{"analyte":"WBC","value":"7.2","unit":"10^9/L","flag":"normal"}]');
  select status into t from public.cl_visits where id=va; r := r || 'after result ' || t || ' (expect with_doctor); ';
  begin perform public.cl_enter_lab_results(oa, '[{"analyte":"RBC","value":"4"}]'); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'second result entry=' || ok || ' ' || err || ' (expect false order_closed); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  select count(*) into n from public.cl_visit_notes; r := r || 'owner notes=' || n || ' (expect 0, not a doctor); ';
  select count(*) into n from public.cl_patients; r := r || 'A patients=' || n || ' (expect 2); ';
  select count(*) into n from public.cl_patients where id=pb; r := r || 'A sees B patient=' || n || ' (expect 0); ';
  select count(*) into n from public.cl_visits where id=vb; r := r || 'A sees B visit=' || n || ' (expect 0); ';
  update public.cl_services set price=1 where id=sb; get diagnostics n = row_count; r := r || 'A updates B service=' || n || ' (expect 0); ';
  begin insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (tb,ua,'doctor'); ok := true; exception when others then ok := false; end; r := r || 'A role in B=' || ok || ' (expect false); ';
  begin insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ub,'doctor'); ok := true; exception when others then ok := false; end; r := r || 'outsider made doctor=' || ok || ' (expect false); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role','authenticated')::text, true);
  begin perform public.cl_close_visit_and_bill(va, 100, 'cash'); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'reception leaves credit=' || ok || ' ' || err || ' (expect false balance_due); ';
  begin insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ur,'doctor'); ok := true; exception when others then ok := false; end; r := r || 'reception self-promotes=' || ok || ' (expect false); ';
  perform public.cl_log_card_view(pa);
  select count(*) into n from public.cl_card_views; r := r || 'staff reads view log=' || n || ' (expect 0); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  select count(*) into n from public.cl_card_views where patient_id=pa; r := r || 'owner reads view log=' || n || ' (expect 1); ';
  begin perform public.cl_close_visit_and_bill(va, 351, 'cash'); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'overpay=' || ok || ' ' || err || ' (expect false overpayment); ';
  perform public.cl_close_visit_and_bill(va, 200, 'cash', null, null, '33333333-3333-3333-3333-333333333333');
  perform public.cl_close_visit_and_bill(va, 200, 'cash', null, null, '33333333-3333-3333-3333-333333333333');
  select status, debt_posted into t, v from public.cl_visits where id=va; r := r || 'closed ' || t || ' debt=' || v || ' (expect done 150); ';
  select count(*) into n from public.payments where ref_table='cl_visits' and ref_id=va; r := r || 'payments=' || n || ' (expect 1); ';
  select count(*) into n from public.credit_ledger where ref_table='cl_visits' and ref_id=va and type='debt' and amount=150; r := r || 'debt rows=' || n || ' (expect 1); ';
  begin perform public.cl_add_service(va, sa); ok := true; exception when others then ok := false; err := sqlerrm; end; r := r || 'add after close=' || ok || ' ' || err || ' (expect false visit_closed); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.cl_patients; exception when others then n := -1; end; r := r || 'anon patients=' || n || ' (expect 0 or -1); ';
  begin select count(*) into n from public.cl_visit_notes; exception when others then n := -1; end; r := r || 'anon notes=' || n || ' (expect 0 or -1); ';
  begin perform public.cl_register_patient('Anon X'); ok := true; exception when others then ok := false; end; r := r || 'anon registers=' || ok || ' (expect false); ';

  raise exception 'RESULT: %', r;
end $$;
