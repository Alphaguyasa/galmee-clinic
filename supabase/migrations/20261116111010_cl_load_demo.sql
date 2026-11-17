-- Fills the empty tenant named exactly "Galmee Clinic Demo" with fictional data:
-- 10 services, 30 patients, a week of closed visits with lab results and doctor notes,
-- and today's queue (waiting, with the doctor, at the lab). Owner only, once.
-- The owner also gets the doctor, lab and reception roles so every screen can be tried.
create function private.cl_load_demo_data() returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.cl_require_tenant();
  v_owner uuid := auth.uid();
  v_name text;
  v_services uuid[] := '{}';
  v_patients uuid[] := '{}';
  v_customers uuid[] := '{}';
  v_id uuid; v_visit uuid; v_line uuid; v_order uuid;
  v_visits int := 0;
  d int; j int; n int; p int; s int; v_queue int;
  v_day date; v_when timestamptz; v_total numeric; v_paid numeric; v_status text;
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  first_names text[] := array['Abebech','Gutu','Hawi','Tesfaye','Meseret','Lencho','Aster','Dereje','Ifa','Mulu',
                               'Chala','Tsehay','Bontu','Kiros','Genet','Obsa','Hirut','Feyisa','Sintayehu','Kedir',
                               'Worknesh','Teshale','Ayantu','Mamo','Etenesh','Ebisa','Zenebech','Habtamu','Gadise','Shewit'];
  last_names text[] := array['Daba','Regassa','Mengistu','Tufa','Asfaw','Gudeta','Belay','Kebede','Wako','Shiferaw'];
  svc_names text[] := array['General consultation','Follow-up visit','CBC','Malaria blood film','Urinalysis',
                             'Blood glucose (FBS)','Stool examination','Widal test','Wound dressing','Injection'];
  svc_kinds text[] := array['consultation','consultation','lab','lab','lab','lab','lab','lab','procedure','procedure'];
  svc_prices numeric[] := array[150, 80, 250, 100, 120, 80, 100, 150, 100, 50];
  complaints text[] := array['Fever and headache for 3 days','Cough and sore throat','Abdominal pain after meals','Tiredness and dizziness',
                              'Burning on urination','Diarrhoea for 2 days','Cut on the left hand','Joint pain, worse in the morning',
                              'Thirsty and urinating often','Follow-up for blood pressure'];
  diagnoses text[] := array['Malaria (P. falciparum)','Upper respiratory tract infection','Dyspepsia','Iron deficiency anaemia',
                             'Urinary tract infection','Acute gastroenteritis','Laceration, cleaned and dressed','Arthralgia, rule out RA',
                             'Raised fasting glucose, review in 2 weeks','Hypertension, controlled'];
  treatments text[] := array['Artemether-lumefantrine 3 days, fluids','Paracetamol, warm fluids, review if worse','Omeprazole 2 weeks, small meals',
                              'Ferrous sulphate 3 months, diet advice','Ciprofloxacin 5 days, plenty of water','ORS and zinc, review in 2 days',
                              'Dressing changed every 2 days, TT given','Ibuprofen after food, review results','Diet advice, repeat FBS',
                              'Continue current tablets, salt reduction'];
  -- The lab test that goes with each complaint (index into svc_names), 0 for none.
  complaint_lab int[] := array[4, 0, 7, 3, 5, 7, 0, 3, 6, 0];
begin
  select name into v_name from tenants where id = v_tenant;
  if v_name is distinct from 'Galmee Clinic Demo' then raise exception 'not_demo_tenant'; end if;
  if private.current_app_role() is distinct from 'owner' then raise exception 'not_allowed'; end if;
  if exists (select 1 from cl_patients where tenant_id = v_tenant) or exists (select 1 from cl_services where tenant_id = v_tenant) then
    raise exception 'already_loaded';
  end if;

  insert into cl_staff_roles(tenant_id, user_id, clinical_role, display_name)
  select v_tenant, v_owner, r, 'Dr. Demo Owner' from unnest(array['doctor','lab','reception']) r
  on conflict do nothing;

  for s in 1..10 loop
    insert into cl_services(tenant_id, name, kind, price) values (v_tenant, svc_names[s], svc_kinds[s], svc_prices[s])
    returning id into v_id;
    v_services := v_services || v_id;
  end loop;

  for p in 1..30 loop
    v_name := first_names[p] || ' ' || last_names[1 + (p * 7) % 10];
    insert into customers(tenant_id, name, phone) values (v_tenant, v_name, '09' || (31000000 + p * 2713)::text)
    returning id into v_id;
    v_customers := v_customers || v_id;
    insert into cl_patients(tenant_id, card_no, customer_id, full_name, phone, sex, birth_date, address, created_at)
    values (v_tenant, p, v_id, v_name, '09' || (31000000 + p * 2713)::text,
            case when p % 2 = 1 then 'female' else 'male' end,
            v_today - ((4 + (p * 13) % 68) * 365 + p * 11),
            (array['Kebele 01','Kebele 03','Kebele 05','Abosto','Arada','Kuyera'])[1 + p % 6],
            now() - interval '8 days' + p * interval '5 minutes')
    returning id into v_id;
    v_patients := v_patients || v_id;
  end loop;

  -- Six past days of closed visits, five or six a day, then today's queue.
  for d in reverse 6..0 loop
    v_day := v_today - d;
    n := case when d = 0 then 6 else 5 + d % 2 end;
    v_queue := 0;
    for j in 1..n loop
      v_queue := v_queue + 1;
      p := 1 + (d * 7 + j * 5) % 30;
      v_when := (v_day::timestamp + interval '8 hours 30 minutes' + j * interval '40 minutes') at time zone 'Africa/Addis_Ababa';
      s := 1 + (d * 3 + j * 7) % 10; -- complaint index
      v_status := case
        when d > 0 then 'done'
        when j <= 2 then 'done'
        when j = 3 then 'lab'
        when j = 4 then 'with_doctor'
        else 'waiting' end;

      insert into cl_visits(tenant_id, patient_id, doctor_id, visit_date, queue_no, status, opened_at)
      values (v_tenant, v_patients[p], v_owner, v_day, v_queue, case when v_status = 'done' then 'with_doctor' else v_status end, v_when)
      returning id into v_visit;
      v_visits := v_visits + 1;

      if v_status = 'waiting' then continue; end if;

      -- Consultation (follow-up for the blood pressure review), then the doctor's notes.
      insert into cl_visit_services(tenant_id, visit_id, service_id, service_name, kind, qty, unit_price, created_at)
      values (v_tenant, v_visit, v_services[case when s = 10 then 2 else 1 end], svc_names[case when s = 10 then 2 else 1 end],
              'consultation', 1, svc_prices[case when s = 10 then 2 else 1 end], v_when + interval '10 minutes');
      insert into cl_visit_notes(visit_id, tenant_id, complaint, findings, diagnosis, treatment, author_id, updated_at)
      values (v_visit, v_tenant, complaints[s],
              case when v_status = 'done' then format('Temp %s C, BP %s/%s', 36 + (j + d) % 3, 110 + (j * 7) % 40, 70 + (j * 3) % 20) end,
              case when v_status = 'done' then diagnoses[s] end,
              case when v_status = 'done' then treatments[s] end,
              v_owner, v_when + interval '20 minutes');

      if complaint_lab[s] > 0 then
        insert into cl_visit_services(tenant_id, visit_id, service_id, service_name, kind, qty, unit_price, created_at)
        values (v_tenant, v_visit, v_services[complaint_lab[s]], svc_names[complaint_lab[s]], 'lab', 1, svc_prices[complaint_lab[s]], v_when + interval '25 minutes')
        returning id into v_line;
        insert into cl_lab_orders(tenant_id, visit_id, patient_id, visit_service_id, test_name, note, status, requested_by, requested_at, completed_at)
        values (v_tenant, v_visit, v_patients[p], v_line, svc_names[complaint_lab[s]], null,
                case when v_status = 'lab' then 'requested' else 'completed' end, v_owner, v_when + interval '25 minutes',
                case when v_status = 'lab' then null else v_when + interval '55 minutes' end)
        returning id into v_order;
        if v_status <> 'lab' then
          insert into cl_lab_results(tenant_id, order_id, analyte, value, unit, reference_range, flag, entered_by, entered_at)
          select v_tenant, v_order, r.analyte, r.value, r.unit, r.ref, r.flag, v_owner, v_when + interval '55 minutes'
          from (values
            (4, 'Blood film', 'P. falciparum seen (+)', null, 'No parasites seen', 'abnormal'),
            (3, 'WBC', '6.8', '10^3/uL', '4.0-11.0', 'normal'),
            (3, 'Haemoglobin', '9.6', 'g/dL', '12.0-16.0', 'low'),
            (3, 'Platelets', '245', '10^3/uL', '150-450', 'normal'),
            (5, 'Leukocytes', '++', null, 'Negative', 'abnormal'),
            (5, 'Nitrite', 'Positive', null, 'Negative', 'abnormal'),
            (6, 'Fasting glucose', '128', 'mg/dL', '70-100', 'high'),
            (7, 'Stool microscopy', 'No ova or parasites seen', null, null, 'normal')
          ) as r(svc, analyte, value, unit, ref, flag)
          where r.svc = complaint_lab[s];
        end if;
      end if;
      if s = 7 then
        insert into cl_visit_services(tenant_id, visit_id, service_id, service_name, kind, qty, unit_price, created_at)
        values (v_tenant, v_visit, v_services[9], svc_names[9], 'procedure', 1, svc_prices[9], v_when + interval '30 minutes'),
               (v_tenant, v_visit, v_services[10], svc_names[10], 'procedure', 1, svc_prices[10], v_when + interval '32 minutes');
      end if;
      perform private.cl_recalc(v_visit);

      if v_status = 'done' then
        select services_total into v_total from cl_visits where id = v_visit;
        -- About one visit in eight leaves part of the bill on credit.
        v_paid := case when (d + j) % 8 = 3 then floor(v_total / 2) else v_total end;
        if v_paid > 0 then
          insert into payments(tenant_id, customer_id, amount, method, reference, ref_table, ref_id, user_id, created_at)
          values (v_tenant, v_customers[p], v_paid,
                  case when j % 3 = 0 then 'telebirr'::pay_method else 'cash'::pay_method end,
                  case when j % 3 = 0 then 'DEMO' || lpad((d * 10 + j)::text, 6, '0') end,
                  'cl_visits', v_visit, v_owner, v_when + interval '70 minutes');
        end if;
        if v_total - v_paid > 0 then
          insert into credit_ledger(tenant_id, customer_id, type, amount, due_date, ref_table, ref_id, user_id, created_at)
          values (v_tenant, v_customers[p], 'debt', v_total - v_paid, v_day + 14, 'cl_visits', v_visit, v_owner, v_when + interval '70 minutes');
        end if;
        update cl_visits set status = 'done', paid_total = v_paid, debt_posted = v_total - v_paid, closed_at = v_when + interval '70 minutes'
        where id = v_visit;
      end if;
    end loop;
  end loop;
  return v_visits;
end $$;
revoke all on function private.cl_load_demo_data() from public, anon;
grant execute on function private.cl_load_demo_data() to authenticated;

create function public.cl_load_demo_data() returns int language sql security invoker set search_path = public, private as $$ select private.cl_load_demo_data() $$;
revoke all on function public.cl_load_demo_data() from public, anon;
grant execute on function public.cl_load_demo_data() to authenticated;
