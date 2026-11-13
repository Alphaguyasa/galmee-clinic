import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "./session";

export type LabOrderStatus = "requested" | "completed" | "cancelled";
export type LabOrderDTO = { id: string; testName: string; note: string | null; status: LabOrderStatus; requestedAt: string };

/** Lab orders on a visit. Only doctor and lab roles can read them (RLS); others get an empty list. */
export async function getVisitLabOrders(visitId: string): Promise<LabOrderDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_lab_orders")
    .select("id, test_name, note, status, requested_at")
    .eq("visit_id", visitId)
    .order("requested_at", { ascending: true });
  if (error) return [];
  return data.map((o) => ({
    id: o.id,
    testName: o.test_name,
    note: o.note,
    status: o.status as LabOrderStatus,
    requestedAt: o.requested_at,
  }));
}

export type RequestLabResult = { ok: true } | { ok: false; code: "notAllowed" | "closed" | "notFound" | "generic" };

export async function requestLab(input: { visitId: string; serviceId: string; note?: string; clientRef: string }): Promise<RequestLabResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_request_lab", {
    p_visit: input.visitId,
    p_service: input.serviceId,
    p_note: input.note,
    p_client_ref: input.clientRef,
  });
  if (!error) return { ok: true };
  const msg = error.message;
  const code = msg.includes("not_allowed")
    ? "notAllowed"
    : msg.includes("visit_closed")
      ? "closed"
      : msg.includes("not_found")
        ? "notFound"
        : "generic";
  return { ok: false, code };
}

export type LabQueueRowDTO = {
  id: string;
  testName: string;
  note: string | null;
  requestedAt: string;
  patient: { cardNo: number; fullName: string; sex: string | null };
  queueNo: number | null;
};

/** Lab orders still waiting for a result, oldest first. Lab and doctor roles only (RLS). */
export async function getLabQueue(): Promise<LabQueueRowDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_lab_orders")
    .select("id, test_name, note, requested_at, cl_patients(card_no, full_name, sex), cl_visits(queue_no)")
    .eq("status", "requested")
    .order("requested_at", { ascending: true })
    .limit(200);
  if (error) return [];
  return data.map((o) => ({
    id: o.id,
    testName: o.test_name,
    note: o.note,
    requestedAt: o.requested_at,
    patient: { cardNo: o.cl_patients?.card_no ?? 0, fullName: o.cl_patients?.full_name ?? "", sex: o.cl_patients?.sex ?? null },
    queueNo: o.cl_visits?.queue_no ?? null,
  }));
}

export type LabOrderDetailDTO = LabQueueRowDTO & {
  status: LabOrderStatus;
  visitId: string;
  results: { analyte: string; value: string; unit: string | null; referenceRange: string | null; flag: string | null }[];
};

export async function getLabOrder(id: string): Promise<LabOrderDetailDTO | null> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_lab_orders")
    .select(
      "id, visit_id, test_name, note, status, requested_at, cl_patients(card_no, full_name, sex), cl_visits(queue_no), cl_lab_results(analyte, value, unit, reference_range, flag, entered_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    visitId: data.visit_id,
    testName: data.test_name,
    note: data.note,
    status: data.status as LabOrderStatus,
    requestedAt: data.requested_at,
    patient: {
      cardNo: data.cl_patients?.card_no ?? 0,
      fullName: data.cl_patients?.full_name ?? "",
      sex: data.cl_patients?.sex ?? null,
    },
    queueNo: data.cl_visits?.queue_no ?? null,
    results: [...data.cl_lab_results]
      .sort((a, b) => a.entered_at.localeCompare(b.entered_at))
      .map((r) => ({ analyte: r.analyte, value: r.value, unit: r.unit, referenceRange: r.reference_range, flag: r.flag })),
  };
}

export type EnterResultsResult = { ok: true } | { ok: false; code: "notAllowed" | "closed" | "duplicate" | "generic" };

export async function enterLabResults(input: {
  orderId: string;
  results: { analyte: string; value: string; unit: string; reference_range: string; flag: string }[];
}): Promise<EnterResultsResult> {
  await getSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cl_enter_lab_results", { p_order: input.orderId, p_results: input.results });
  if (!error) return { ok: true };
  const msg = error.message;
  const code = msg.includes("not_allowed")
    ? "notAllowed"
    : msg.includes("order_closed") || msg.includes("visit_closed")
      ? "closed"
      : msg.includes("duplicate key")
        ? "duplicate"
        : "generic";
  return { ok: false, code };
}
