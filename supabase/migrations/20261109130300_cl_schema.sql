-- Galmee Clinic schema: patients, visits, services, clinical notes, lab, attachments, card-view log.
-- Clinical roles live in cl_staff_roles because the core roles (owner, manager, staff) say nothing about
-- who may read clinical data. Clinical notes and lab data are visible only to the matching clinical role.

create table public.cl_staff_roles (
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clinical_role text not null check (clinical_role in ('doctor','lab','reception')),
  display_name text check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id, clinical_role)
);
create index cl_staff_roles_user_idx on public.cl_staff_roles (user_id);

create function private.cl_has_role(p_role text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.cl_staff_roles r
    where r.tenant_id = private.current_tenant() and r.user_id = auth.uid() and r.clinical_role = p_role
  );
$$;
revoke all on function private.cl_has_role(text) from public, anon;
grant execute on function private.cl_has_role(text) to authenticated;

create table public.cl_patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  card_no int not null check (card_no > 0),
  customer_id uuid not null references public.customers(id),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text check (char_length(phone) <= 20),
  sex text check (sex in ('female','male')),
  birth_date date check (birth_date >= date '1900-01-01'),
  address text check (char_length(address) <= 200),
  client_ref uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id, card_no),
  unique (tenant_id, client_ref),
  unique (tenant_id, id)
);
create index cl_patients_phone_idx on public.cl_patients (tenant_id, phone);
create index cl_patients_customer_idx on public.cl_patients (customer_id);

create table public.cl_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  kind text not null default 'consultation' check (kind in ('consultation','lab','procedure','other')),
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, id)
);

create table public.cl_visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  patient_id uuid not null,
  doctor_id uuid references auth.users(id),
  visit_date date not null default ((now() at time zone 'Africa/Addis_Ababa')::date),
  queue_no int not null check (queue_no > 0),
  status text not null default 'waiting' check (status in ('waiting','with_doctor','lab','done','cancelled')),
  services_total numeric(12,2) not null default 0 check (services_total >= 0),
  paid_total numeric(12,2) not null default 0 check (paid_total >= 0),
  debt_posted numeric(12,2) not null default 0 check (debt_posted >= 0),
  client_ref uuid,
  close_ref uuid,
  created_by uuid default auth.uid(),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (tenant_id, visit_date, queue_no),
  unique (tenant_id, client_ref),
  unique (tenant_id, close_ref),
  unique (tenant_id, id),
  foreign key (tenant_id, patient_id) references public.cl_patients(tenant_id, id)
);
create index cl_visits_queue_idx on public.cl_visits (tenant_id, visit_date, status);
create index cl_visits_patient_idx on public.cl_visits (tenant_id, patient_id, opened_at desc);
create index cl_visits_doctor_idx on public.cl_visits (doctor_id);
-- One open visit per patient at a time.
create unique index cl_visits_one_open_idx on public.cl_visits (tenant_id, patient_id) where status in ('waiting','with_doctor','lab');

-- Doctor-only. Kept apart from cl_visits so reception can run the queue without any clinical text.
create table public.cl_visit_notes (
  visit_id uuid primary key,
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  complaint text check (char_length(complaint) <= 2000),
  findings text check (char_length(findings) <= 4000),
  diagnosis text check (char_length(diagnosis) <= 2000),
  treatment text check (char_length(treatment) <= 4000),
  author_id uuid default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, visit_id) references public.cl_visits(tenant_id, id) on delete cascade
);
create index cl_visit_notes_tenant_idx on public.cl_visit_notes (tenant_id, visit_id);
create index cl_visit_notes_author_idx on public.cl_visit_notes (author_id);

create table public.cl_visit_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  visit_id uuid not null,
  service_id uuid not null,
  service_name text not null,
  kind text not null,
  qty numeric(8,2) not null default 1 check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(14,2) generated always as (round(qty * unit_price, 2)) stored,
  client_ref uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid,
  unique (tenant_id, client_ref),
  unique (tenant_id, id),
  foreign key (tenant_id, visit_id) references public.cl_visits(tenant_id, id) on delete cascade,
  foreign key (tenant_id, service_id) references public.cl_services(tenant_id, id)
);
create index cl_visit_services_visit_idx on public.cl_visit_services (tenant_id, visit_id);
create index cl_visit_services_service_idx on public.cl_visit_services (tenant_id, service_id);
create index cl_visit_services_day_idx on public.cl_visit_services (tenant_id, created_at);

create table public.cl_lab_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  visit_id uuid not null,
  patient_id uuid not null,
  visit_service_id uuid not null,
  test_name text not null,
  note text check (char_length(note) <= 500),
  status text not null default 'requested' check (status in ('requested','completed','cancelled')),
  requested_by uuid default auth.uid() references auth.users(id),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, visit_id) references public.cl_visits(tenant_id, id) on delete cascade,
  foreign key (tenant_id, patient_id) references public.cl_patients(tenant_id, id),
  foreign key (tenant_id, visit_service_id) references public.cl_visit_services(tenant_id, id)
);
create index cl_lab_orders_open_idx on public.cl_lab_orders (tenant_id, status, requested_at);
create index cl_lab_orders_visit_idx on public.cl_lab_orders (tenant_id, visit_id);
create index cl_lab_orders_patient_idx on public.cl_lab_orders (tenant_id, patient_id);
create index cl_lab_orders_service_idx on public.cl_lab_orders (tenant_id, visit_service_id);
create index cl_lab_orders_requester_idx on public.cl_lab_orders (requested_by);

create table public.cl_lab_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  order_id uuid not null,
  analyte text not null check (char_length(btrim(analyte)) between 1 and 120),
  value text not null check (char_length(btrim(value)) between 1 and 200),
  unit text check (char_length(unit) <= 40),
  reference_range text check (char_length(reference_range) <= 80),
  flag text check (flag in ('normal','low','high','abnormal')),
  entered_by uuid default auth.uid() references auth.users(id),
  entered_at timestamptz not null default now(),
  unique (tenant_id, order_id, analyte),
  foreign key (tenant_id, order_id) references public.cl_lab_orders(tenant_id, id) on delete cascade
);
create index cl_lab_results_enterer_idx on public.cl_lab_results (entered_by);

create table public.cl_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  patient_id uuid not null,
  visit_id uuid,
  storage_path text not null check (char_length(storage_path) <= 400),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  mime_type text check (char_length(mime_type) <= 100),
  uploaded_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (tenant_id, storage_path),
  foreign key (tenant_id, patient_id) references public.cl_patients(tenant_id, id),
  foreign key (tenant_id, visit_id) references public.cl_visits(tenant_id, id) on delete cascade
);
create index cl_attachments_patient_idx on public.cl_attachments (tenant_id, patient_id);
create index cl_attachments_visit_idx on public.cl_attachments (tenant_id, visit_id);
create index cl_attachments_uploader_idx on public.cl_attachments (uploaded_by);

create table public.cl_card_views (
  id bigint generated always as identity primary key,
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  patient_id uuid not null,
  viewer_id uuid not null default auth.uid() references auth.users(id),
  viewed_at timestamptz not null default now(),
  foreign key (tenant_id, patient_id) references public.cl_patients(tenant_id, id) on delete cascade
);
create index cl_card_views_patient_idx on public.cl_card_views (tenant_id, patient_id, viewed_at desc);
create index cl_card_views_viewer_idx on public.cl_card_views (viewer_id);

alter table public.cl_staff_roles enable row level security;
alter table public.cl_patients enable row level security;
alter table public.cl_services enable row level security;
alter table public.cl_visits enable row level security;
alter table public.cl_visit_notes enable row level security;
alter table public.cl_visit_services enable row level security;
alter table public.cl_lab_orders enable row level security;
alter table public.cl_lab_results enable row level security;
alter table public.cl_attachments enable row level security;
alter table public.cl_card_views enable row level security;

-- Staff roles: everyone sees who is who in their own clinic; only the owner assigns roles.
create policy cl_staff_roles_read on public.cl_staff_roles for select to authenticated
  using (tenant_id = (select private.current_tenant()));
create policy cl_staff_roles_owner_insert on public.cl_staff_roles for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner'
    and exists (select 1 from public.profiles p where p.user_id = cl_staff_roles.user_id and p.tenant_id = cl_staff_roles.tenant_id));
create policy cl_staff_roles_owner_update on public.cl_staff_roles for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner')
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner');
create policy cl_staff_roles_owner_delete on public.cl_staff_roles for delete to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner');

-- Name, phone and queue are open to the whole clinic; everything clinical is below.
create policy cl_patients_read on public.cl_patients for select to authenticated
  using (tenant_id = (select private.current_tenant()));
create policy cl_visits_read on public.cl_visits for select to authenticated
  using (tenant_id = (select private.current_tenant()));
create policy cl_visit_services_read on public.cl_visit_services for select to authenticated
  using (tenant_id = (select private.current_tenant()));

create policy cl_services_read on public.cl_services for select to authenticated
  using (tenant_id = (select private.current_tenant()));
create policy cl_services_manage_insert on public.cl_services for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy cl_services_manage_update on public.cl_services for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));

-- Clinical notes: doctors of this clinic only, whatever their core role.
create policy cl_visit_notes_doctor_read on public.cl_visit_notes for select to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.cl_has_role('doctor')));
create policy cl_visit_notes_doctor_insert on public.cl_visit_notes for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.cl_has_role('doctor')));
create policy cl_visit_notes_doctor_update on public.cl_visit_notes for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.cl_has_role('doctor')))
  with check (tenant_id = (select private.current_tenant()) and (select private.cl_has_role('doctor')));

-- Lab data: doctors and lab staff.
create policy cl_lab_orders_read on public.cl_lab_orders for select to authenticated
  using (tenant_id = (select private.current_tenant()) and ((select private.cl_has_role('doctor')) or (select private.cl_has_role('lab'))));
create policy cl_lab_results_read on public.cl_lab_results for select to authenticated
  using (tenant_id = (select private.current_tenant()) and ((select private.cl_has_role('doctor')) or (select private.cl_has_role('lab'))));
create policy cl_attachments_read on public.cl_attachments for select to authenticated
  using (tenant_id = (select private.current_tenant()) and ((select private.cl_has_role('doctor')) or (select private.cl_has_role('lab'))));
create policy cl_attachments_insert on public.cl_attachments for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and ((select private.cl_has_role('doctor')) or (select private.cl_has_role('lab'))));

-- Who opened which card: owner and manager only.
create policy cl_card_views_read on public.cl_card_views for select to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));

revoke all on public.cl_staff_roles, public.cl_patients, public.cl_services, public.cl_visits, public.cl_visit_notes,
  public.cl_visit_services, public.cl_lab_orders, public.cl_lab_results, public.cl_attachments, public.cl_card_views from anon;
-- Written only through the cl_* functions.
revoke insert, update, delete, truncate on public.cl_patients, public.cl_visits, public.cl_visit_services,
  public.cl_lab_orders, public.cl_lab_results, public.cl_card_views from authenticated;
revoke delete, truncate on public.cl_services, public.cl_visit_notes from authenticated;
revoke update, delete, truncate on public.cl_attachments from authenticated;
revoke truncate on public.cl_staff_roles from authenticated;
