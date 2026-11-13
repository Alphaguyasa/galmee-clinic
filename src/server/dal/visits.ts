import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "./session";

import { OPEN_STATUSES, type MovableStatus, type VisitStatus } from "@/lib/visit-status";

export type QueueRowDTO = {
  id: string;
  queueNo: number;
  status: VisitStatus;
  patientId: string;
  cardNo: number;
  fullName: string;
  openedAt: string;
};

/** Today's date at the clinic (Addis Ababa), as stored in `cl_visits.visit_date`. */
export function clinicToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(now);
}

/** Today's queue in arrival order, cancelled visits left out. */
export async function getTodayQueue(): Promise<QueueRowDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visits")
    .select("id, queue_no, status, patient_id, opened_at, cl_patients(card_no, full_name)")
    .eq("visit_date", clinicToday())
    .neq("status", "cancelled")
    .order("queue_no", { ascending: true })
    .limit(300);
  if (error) throw new Error("queue_failed");
  return data.map((v) => ({
    id: v.id,
    queueNo: v.queue_no,
    status: v.status as VisitStatus,
    patientId: v.patient_id,
    cardNo: v.cl_patients?.card_no ?? 0,
    fullName: v.cl_patients?.full_name ?? "",
    openedAt: v.opened_at,
  }));
}

/** Queue numbers of the open visits for these patients, keyed by patient id. */
export async function getOpenVisits(patientIds: string[]): Promise<Map<string, number>> {
  if (patientIds.length === 0) return new Map();
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visits")
    .select("patient_id, queue_no")
    .in("patient_id", patientIds)
    .in("status", [...OPEN_STATUSES]);
  if (error) throw new Error("open_visits_failed");
  return new Map(data.map((v) => [v.patient_id, v.queue_no]));
}

export type OpenVisitResult = { ok: true; queueNo: number } | { ok: false; code: "alreadyOpen" | "notFound" | "generic" };

export async function openVisit(input: { patientId: string; clientRef: string }): Promise<OpenVisitResult> {
  await getSession();
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("cl_open_visit", {
    p_patient: input.patientId,
    p_client_ref: input.clientRef,
  });
  if (error || !id) {
    const msg = error?.message ?? "";
    return { ok: false, code: msg.includes("visit_already_open") ? "alreadyOpen" : msg.includes("patient_not_found") ? "notFound" : "generic" };
  }
  const { data: row } = await supabase.from("cl_visits").select("queue_no").eq("id", id).maybeSingle();
  return row ? { ok: true, queueNo: row.queue_no } : { ok: false, code: "generic" };
}

export type VisitDTO = {
  id: string;
  queueNo: number;
  status: VisitStatus;
  visitDate: string;
  servicesTotal: number;
  paidTotal: number;
  debtPosted: number;
  closedAt: string | null;
  patient: { id: string; cardNo: number; fullName: string; phone: string | null };
};

export async function getVisit(id: string): Promise<VisitDTO | null> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visits")
    .select("id, queue_no, status, visit_date, services_total, paid_total, debt_posted, closed_at, cl_patients(id, card_no, full_name, phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("visit_failed");
  if (!data || !data.cl_patients) return null;
  return {
    id: data.id,
    queueNo: data.queue_no,
    status: data.status as VisitStatus,
    visitDate: data.visit_date,
    servicesTotal: Number(data.services_total),
    paidTotal: Number(data.paid_total),
    debtPosted: Number(data.debt_posted),
    closedAt: data.closed_at,
    patient: {
      id: data.cl_patients.id,
      cardNo: data.cl_patients.card_no,
      fullName: data.cl_patients.full_name,
      phone: data.cl_patients.phone,
    },
  };
}

export type SetStatusResult = { ok: true } | { ok: false; code: "closed" | "notAllowed" | "generic" };

export async function setVisitStatus(input: { visitId: string; status: MovableStatus }): Promise<SetStatusResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_set_visit_status", { p_visit: input.visitId, p_status: input.status });
  if (!error) return { ok: true };
  const msg = error.message;
  return { ok: false, code: msg.includes("visit_closed") ? "closed" : msg.includes("not_allowed") ? "notAllowed" : "generic" };
}

export type VisitLineDTO = { id: string; serviceName: string; kind: string; qty: number; unitPrice: number; lineTotal: number };

/** Billable lines still on the visit (reversed lines left out). */
export async function getVisitLines(visitId: string): Promise<VisitLineDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visit_services")
    .select("id, service_name, kind, qty, unit_price, line_total")
    .eq("visit_id", visitId)
    .is("reversed_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error("visit_lines_failed");
  return data.map((l) => ({
    id: l.id,
    serviceName: l.service_name,
    kind: l.kind,
    qty: Number(l.qty),
    unitPrice: Number(l.unit_price),
    lineTotal: Number(l.line_total ?? 0),
  }));
}

export type LineResult = { ok: true } | { ok: false; code: "closed" | "notFound" | "generic" };

function lineError(message: string): LineResult {
  return { ok: false, code: message.includes("visit_closed") ? "closed" : message.includes("not_found") ? "notFound" : "generic" };
}

export async function addVisitService(input: { visitId: string; serviceId: string; clientRef: string }): Promise<LineResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_add_service", {
    p_visit: input.visitId,
    p_service: input.serviceId,
    p_client_ref: input.clientRef,
  });
  return error ? lineError(error.message) : { ok: true };
}

export async function reverseVisitService(lineId: string): Promise<LineResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_reverse_service", { p_line: lineId });
  return error ? lineError(error.message) : { ok: true };
}

/** Lab orders on this visit still waiting for results; billing is refused while any is open. */
export async function countPendingLabs(visitId: string): Promise<number> {
  await getSession();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("cl_lab_orders")
    .select("id", { count: "exact", head: true })
    .eq("visit_id", visitId)
    .eq("status", "requested");
  // Reception cannot read lab orders (RLS); the database still blocks billing, so 0 here is safe.
  if (error) return 0;
  return count ?? 0;
}

export type CloseResult =
  | { ok: true }
  | { ok: false; code: "closed" | "labPending" | "overpayment" | "balanceDue" | "generic" };

export async function closeVisitAndBill(input: {
  visitId: string;
  paid: number;
  method: "cash" | "telebirr";
  reference?: string;
  due?: string;
  closeRef: string;
}): Promise<CloseResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_close_visit_and_bill", {
    p_visit: input.visitId,
    p_paid: input.paid,
    p_method: input.method,
    p_reference: input.reference,
    p_due: input.due,
    p_close_ref: input.closeRef,
  });
  if (!error) return { ok: true };
  const msg = error.message;
  const code = msg.includes("visit_closed")
    ? "closed"
    : msg.includes("lab_pending")
      ? "labPending"
      : msg.includes("overpayment")
        ? "overpayment"
        : msg.includes("balance_due")
          ? "balanceDue"
          : "generic";
  return { ok: false, code };
}

export type VisitPaymentDTO = { method: string; reference: string | null; amount: number };

/** Money taken when the visit was billed (from core `payments`), for the receipt. */
export async function getVisitPayments(visitId: string): Promise<VisitPaymentDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("method, reference, amount")
    .eq("ref_table", "cl_visits")
    .eq("ref_id", visitId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data.map((p) => ({ method: p.method, reference: p.reference, amount: Number(p.amount) }));
}
