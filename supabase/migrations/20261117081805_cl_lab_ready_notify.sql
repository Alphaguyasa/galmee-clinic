-- Tells the doctor on Telegram when a lab order is completed. The message goes to every active
-- owner/staff bot binding of the visit's doctor (or of whoever requested the test when the visit has
-- no doctor) in this clinic, in the language of the binding. It names the test, card and queue number
-- only: no patient name and no result values leave the system.
create function private.cl_lab_ready_notify() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_doctor uuid;
  v_card int;
  v_queue int;
  l record;
begin
  select coalesce(v.doctor_id, new.requested_by), p.card_no, v.queue_no
    into v_doctor, v_card, v_queue
  from cl_visits v join cl_patients p on p.tenant_id = v.tenant_id and p.id = v.patient_id
  where v.tenant_id = new.tenant_id and v.id = new.visit_id;
  if v_doctor is null then return new; end if;
  for l in
    select distinct on (b.chat_id) b.chat_id, b.lang
    from bot_links b
    where b.tenant_id = new.tenant_id and b.user_id = v_doctor and b.active and b.kind in ('owner','staff')
    order by b.chat_id, b.created_at desc
  loop
    perform private.bot_queue_notification(new.tenant_id, 'telegram', l.chat_id,
      case l.lang
        when 'am' then format('የላብራቶሪ ውጤት ደርሷል: %s · ካርድ ቁ. %s · ወረፋ ቁ. %s', new.test_name, v_card, v_queue)
        when 'om' then format('Bu''aan laaboraatorii qophaa''eera: %s · Kaardii lak. %s · Tarree lak. %s', new.test_name, v_card, v_queue)
        else format('Lab result ready: %s · Card no. %s · Queue no. %s', new.test_name, v_card, v_queue)
      end);
  end loop;
  return new;
end $$;
revoke all on function private.cl_lab_ready_notify() from public, anon, authenticated;

create trigger cl_lab_orders_ready_notify
  after update of status on public.cl_lab_orders
  for each row
  when (old.status = 'requested' and new.status = 'completed')
  execute function private.cl_lab_ready_notify();
