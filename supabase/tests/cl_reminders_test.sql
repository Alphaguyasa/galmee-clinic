-- Day-before appointment SMS for Galmee Clinic. Run with Supabase `execute_sql`; everything rolls back and the
-- final RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); ur uuid := gen_random_uuid(); ul uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; p1 uuid; p2 uuid; p3 uuid; b3 uuid; n int; r text := ''; j jsonb; e text; body text;
  tomorrow date := (now() at time zone 'Africa/Addis_Ababa')::date + 1;
  at9 timestamptz := ((now() at time zone 'Africa/Addis_Ababa')::date + 1 + time '09:00') at time zone 'Africa/Addis_Ababa';
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cl-rm-a@test.invalid'),(ud,'authenticated','authenticated','cl-rm-d@test.invalid'),
    (ur,'authenticated','authenticated','cl-rm-r@test.invalid'),(ul,'authenticated','authenticated','cl-rm-l@test.invalid'),
    (ub,'authenticated','authenticated','cl-rm-b@test.invalid');
  insert into public.tenants(name, vertical) values ('CLRM A','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('CLRM B','clinic') returning id into tb;
  update public.tenants set default_lang = 'en' where id = ta;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'A owner','owner'),(ud,ta,'A doctor','staff'),(ur,ta,'A reception','staff'),(ul,ta,'A lab','staff'),(ub,tb,'B owner','owner');
  insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ud,'doctor'),(ta,ur,'reception'),(ta,ul,'lab');

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role','authenticated')::text, true);
  p1 := public.cl_register_patient('Patient RM1', '0911000001');
  p2 := public.cl_register_patient('Patient RM2');
  p3 := public.cl_register_patient('Patient RM3', '0911000003');
  perform public.cl_book_appointment(p1, ud, at9, 15, 'Secret reason');
  perform public.cl_book_appointment(p2, ud, at9 + interval '15 minutes', 15, null);
  b3 := public.cl_book_appointment(p3, ud, at9 + interval '30 minutes', 15, null);
  perform public.cl_set_appointment_status(b3, 'cancelled');

  j := public.cl_queue_appointment_reminders(tomorrow);
  r := r || 'first=' || j::text || ' (expect queued 1, no_phone 1, already 0); ';
  j := public.cl_queue_appointment_reminders(tomorrow);
  r := r || 'second=' || j::text || ' (expect queued 0, already 1); ';
  begin perform public.cl_queue_appointment_reminders(tomorrow + 1); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'two days ahead=' || e || ' (expect bad_day); ';

  perform set_config('role','postgres', true);
  select count(*), max(n2.body) into n, body from public.notifications n2 where n2.tenant_id = ta and n2.channel = 'sms';
  r := r || 'sms rows=' || n || ' (expect 1); body=' || body || '; ';
  r := r || 'no reason in body=' || (position('Secret' in body) = 0) || ' (expect true); ';
  r := r || 'no name in body=' || (position('RM1' in body) = 0) || ' (expect true); ';
  select count(*) into n from public.notifications where tenant_id = ta and to_addr = '0911000003'; r := r || 'cancelled texted=' || n || ' (expect 0); ';

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ul, 'role','authenticated')::text, true);
  begin perform public.cl_queue_appointment_reminders(tomorrow); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'lab-only staff=' || e || ' (expect not_allowed); ';
  begin insert into public.cl_appointment_reminders(tenant_id, booking_id) values (ta, b3); e := 'none'; exception when others then e := 'denied'; end;
  r := r || 'direct insert=' || e || ' (expect denied); ';
  select count(*) into n from public.cl_appointment_reminders; r := r || 'A staff reads own=' || n || ' (expect 1); ';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from public.cl_appointment_reminders where tenant_id = ta; r := r || 'B reads A=' || n || ' (expect 0); ';
  j := public.cl_queue_appointment_reminders(tomorrow);
  r := r || 'B run=' || j::text || ' (expect queued 0); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin perform public.cl_queue_appointment_reminders(tomorrow); e := 'none'; exception when others then e := 'denied'; end;
  r := r || 'anon=' || e || ' (expect denied); ';
  raise exception 'RESULT: %', r;
end $$;
