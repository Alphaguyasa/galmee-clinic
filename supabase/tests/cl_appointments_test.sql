-- Appointments for Galmee Clinic. Run with Supabase `execute_sql`; everything rolls back and the
-- final RAISE carries the result line. Compare each value with its "expect".
do $$
declare ua uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); ur uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; pa uuid; pa2 uuid; pb uuid; ba uuid; ba2 uuid; bt uuid; v uuid; n int; r text := ''; ok boolean; e text;
  t0 timestamptz := date_trunc('hour', now()) + interval '2 days 3 hours';
  today timestamptz := now() + interval '1 minute';
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','cl-ap-a@test.invalid'),(ud,'authenticated','authenticated','cl-ap-d@test.invalid'),
    (ur,'authenticated','authenticated','cl-ap-r@test.invalid'),(ub,'authenticated','authenticated','cl-ap-b@test.invalid');
  insert into public.tenants(name, vertical) values ('CLAP A','clinic') returning id into ta;
  insert into public.tenants(name, vertical) values ('CLAP B','clinic') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua,ta,'A owner','owner'),(ud,ta,'A doctor','staff'),(ur,ta,'A reception','staff'),(ub,tb,'B owner','owner');
  insert into public.cl_staff_roles(tenant_id,user_id,clinical_role) values (ta,ud,'doctor'),(ta,ur,'reception');

  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role','authenticated')::text, true);
  pa := public.cl_register_patient('Patient AP1');
  pa2 := public.cl_register_patient('Patient AP2');
  ba := public.cl_book_appointment(pa, ud, t0, 30, 'Follow-up');
  r := r || 'reception books=' || (ba is not null) || ' (expect true); ';
  ba2 := public.cl_book_appointment(pa, ud, t0, 30, 'Follow-up');
  r := r || 'repeat tap same id=' || (ba = ba2) || ' (expect true); ';
  begin perform public.cl_book_appointment(pa2, ud, t0 + interval '15 minutes', 30, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'overlap other patient=' || e || ' (expect doctor_busy); ';
  begin perform public.cl_book_appointment(pa, ur, t0 + interval '1 day', 15, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'non-doctor=' || e || ' (expect doctor_not_found); ';
  begin perform public.cl_book_appointment(pa, ud, now() - interval '1 hour', 15, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'past=' || e || ' (expect in_past); ';
  begin perform public.cl_book_appointment(pa, ud, t0 + interval '1 day', 2, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'minutes=' || e || ' (expect bad_minutes); ';
  ok := public.cl_book_appointment(pa2, ud, t0 + interval '30 minutes', 15, null) is not null;
  r := r || 'back-to-back ok=' || ok || ' (expect true); ';
  begin insert into public.bookings(tenant_id, resource_type, resource_id, customer_id, starts_at, ends_at) values (ta,'cl_doctor',ud,null,t0 + interval '5 days',t0 + interval '5 days 15 minutes'); e := 'none'; exception when others then e := 'denied'; end;
  r := r || 'direct insert=' || e || ' (expect denied); ';

  -- Check-in on a today booking opens the visit with that doctor.
  bt := public.cl_book_appointment(pa2, ud, today, 15, null);
  v := public.cl_set_appointment_status(bt, 'checked_in');
  select count(*) into n from public.cl_visits where id = v and patient_id = pa2 and doctor_id = ud and status = 'waiting';
  r := r || 'check-in opens visit=' || n || ' (expect 1); ';
  begin perform public.cl_set_appointment_status(bt, 'cancelled'); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'cancel after check-in=' || e || ' (expect appointment_closed); ';
  begin perform public.cl_set_appointment_status(ba, 'checked_in'); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'check-in other day=' || e || ' (expect not_today); ';
  begin perform public.cl_set_appointment_status(ba, 'no_show'); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'no-show before time=' || e || ' (expect not_yet); ';
  perform public.cl_set_appointment_status(ba, 'cancelled');
  select count(*) into n from public.bookings where id = ba and status = 'cancelled'; r := r || 'cancel=' || n || ' (expect 1); ';
  ok := public.cl_book_appointment(pa2, ud, t0 + interval '15 minutes', 15, null) is not null;
  r := r || 'slot free after cancel=' || ok || ' (expect true); ';

  -- Clinic B sees and touches nothing of clinic A.
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into n from public.bookings where tenant_id = ta; r := r || 'B reads A bookings=' || n || ' (expect 0); ';
  begin perform public.cl_set_appointment_status(bt, 'cancelled'); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'B changes A booking=' || e || ' (expect appointment_not_found); ';
  begin perform public.cl_book_appointment(pa, ud, t0 + interval '3 days', 15, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'B books A patient=' || e || ' (expect patient_not_found); ';
  pb := public.cl_register_patient('Patient B');
  begin perform public.cl_book_appointment(pb, ud, t0 + interval '3 days', 15, null); e := 'none'; exception when others then e := sqlerrm; end;
  r := r || 'B books A doctor=' || e || ' (expect doctor_not_found); ';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin perform public.cl_book_appointment(pa, ud, t0 + interval '3 days', 15, null); e := 'none'; exception when others then e := 'denied'; end;
  r := r || 'anon=' || e || ' (expect denied); ';
  raise exception 'RESULT: %', r;
end $$;
