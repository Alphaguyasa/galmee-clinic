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
