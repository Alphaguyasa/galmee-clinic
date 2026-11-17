import "server-only";
import { createClient } from "@/lib/supabase/server";
import { statementLines, type StatementLineDTO } from "@/lib/statement";
import type { VisitStatus } from "@/lib/visit-status";
import { getSession } from "./session";

export type PatientCardDTO = {
  id: string;
  cardNo: number;
  fullName: string;
  phone: string | null;
  sex: "female" | "male" | null;
  birthDate: string | null;
  address: string | null;
  registeredAt: string;
  customerId: string;
  /** What the patient still owes the clinic: debts minus repayments on the core credit ledger. */
  balance: number;
};

export type CardVisitDTO = {
  id: string;
  visitDate: string;
  queueNo: number;
  status: VisitStatus;
  servicesTotal: number;
  services: string[];
  /** Doctor's notes; null when the viewer is not a doctor (RLS hides them) or none were written. */
  notes: { complaint: string | null; diagnosis: string | null; treatment: string | null } | null;
};

export type CardLabDTO = {
  id: string;
  visitId: string;
  testName: string;
  status: "requested" | "completed" | "cancelled";
  requestedAt: string;
  results: { analyte: string; value: string; unit: string | null; referenceRange: string | null; flag: string | null }[];
};

export const CARD_VISIT_LIMIT = 30;

/**
 * Writes the card-view log line, then reads the card. Every opening is logged, so this must
 * never be cached or prefetched. Returns null when the patient is not in this clinic.
 */
export async function openPatientCard(patientId: string): Promise<PatientCardDTO | null> {
  await getSession();
  const supabase = await createClient();
  const { error: logError } = await supabase.rpc("cl_log_card_view", { p_patient: patientId });
  if (logError) {
    if (logError.message.includes("patient_not_found")) return null;
    // No card without its log line.
    throw new Error("card_view_log_failed");
  }
  const { data: p, error } = await supabase
    .from("cl_patients")
    .select("id, card_no, full_name, phone, sex, birth_date, address, created_at, customer_id")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw new Error("patient_failed");
  if (!p) return null;

  const balance = await customerBalance(p.customer_id);

  return {
    id: p.id,
    cardNo: p.card_no,
    fullName: p.full_name,
    phone: p.phone,
    sex: p.sex === "female" || p.sex === "male" ? p.sex : null,
    birthDate: p.birth_date,
    address: p.address,
    registeredAt: p.created_at,
    customerId: p.customer_id,
    balance,
  };
}

/** The patient's visits, newest first, with billed services and (for doctors) the notes. */
export async function getCardVisits(patientId: string): Promise<CardVisitDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_visits")
    .select(
      "id, visit_date, queue_no, status, services_total, opened_at, cl_visit_services(service_name, reversed_at), cl_visit_notes(complaint, diagnosis, treatment)",
    )
    .eq("patient_id", patientId)
    .order("opened_at", { ascending: false })
    .limit(CARD_VISIT_LIMIT);
  if (error) throw new Error("card_visits_failed");
  return data.map((v) => {
    const note = Array.isArray(v.cl_visit_notes) ? v.cl_visit_notes[0] : v.cl_visit_notes;
    return {
      id: v.id,
      visitDate: v.visit_date,
      queueNo: v.queue_no,
      status: v.status as VisitStatus,
      servicesTotal: Number(v.services_total),
      services: v.cl_visit_services.filter((s) => !s.reversed_at).map((s) => s.service_name),
      notes: note ? { complaint: note.complaint, diagnosis: note.diagnosis, treatment: note.treatment } : null,
    };
  });
}

/** Lab orders and results for the patient. Doctor and lab roles only (RLS); others get an empty list. */
export async function getCardLabs(patientId: string): Promise<CardLabDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_lab_orders")
    .select("id, visit_id, test_name, status, requested_at, cl_lab_results(analyte, value, unit, reference_range, flag, entered_at)")
    .eq("patient_id", patientId)
    .neq("status", "cancelled")
    .order("requested_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data.map((o) => ({
    id: o.id,
    visitId: o.visit_id,
    testName: o.test_name,
    status: o.status as CardLabDTO["status"],
    requestedAt: o.requested_at,
    results: [...o.cl_lab_results]
      .sort((a, b) => a.entered_at.localeCompare(b.entered_at))
      .map((r) => ({ analyte: r.analyte, value: r.value, unit: r.unit, referenceRange: r.reference_range, flag: r.flag })),
  }));
}

/** Debts minus repayments on the core credit ledger for one customer, rounded to cents. */
export async function customerBalance(customerId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("credit_ledger").select("type, amount").eq("customer_id", customerId).limit(2000);
  if (error) throw new Error("balance_failed");
  return statementLines(data.map((r) => ({ ...r, created_at: "" }))).balance;
}

/** The patient's credit statement: every debt and repayment, oldest first, with the running balance. */
export async function getStatement(customerId: string): Promise<StatementLineDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("type, amount, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error("statement_failed");
  return statementLines(data).lines;
}

export type RepaymentResult = { ok: true } | { ok: false; code: "tooMuch" | "nothingOwed" | "notFound" | "generic" };

/** Records a repayment through the core RPC, never more than the patient owes. */
export async function recordPatientRepayment(input: {
  patientId: string;
  amount: number;
  method: "cash" | "telebirr";
  reference?: string;
  clientRef: string;
}): Promise<RepaymentResult> {
  await getSession();
  const supabase = await createClient();
  const { data: p } = await supabase.from("cl_patients").select("customer_id").eq("id", input.patientId).maybeSingle();
  if (!p) return { ok: false, code: "notFound" };
  const owed = await customerBalance(p.customer_id);
  if (owed <= 0) return { ok: false, code: "nothingOwed" };
  if (input.amount > owed) return { ok: false, code: "tooMuch" };
  const { error } = await supabase.rpc("record_repayment", {
    p_customer: p.customer_id,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference,
    p_client_ref: input.clientRef,
  });
  return error ? { ok: false, code: "generic" } : { ok: true };
}
