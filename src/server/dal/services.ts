import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ServiceInput } from "@/server/validation";
import { getSession } from "./session";

export type ServiceKind = ServiceInput["kind"];
export type ServiceDTO = { id: string; name: string; kind: ServiceKind; price: number; active: boolean };

/** The clinic's price list, active services first, then by name. */
export async function listServices(): Promise<ServiceDTO[]> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cl_services")
    .select("id, name, kind, price, active")
    .order("active", { ascending: false })
    .order("kind")
    .order("name")
    .limit(500);
  if (error) throw new Error("services_failed");
  return data.map((s) => ({ ...s, kind: s.kind as ServiceKind, price: Number(s.price) }));
}

export type ServiceWriteResult = { ok: true } | { ok: false; code: "duplicate" | "notAllowed" | "generic" };

/** Owner or manager only; the database policy enforces it as well. */
export async function createService(input: ServiceInput): Promise<ServiceWriteResult> {
  const { profile } = await getSession();
  if (profile.role === "staff") return { ok: false, code: "notAllowed" };
  const supabase = await createClient();
  const { error } = await supabase.from("cl_services").insert({ name: input.name, kind: input.kind, price: input.price });
  if (!error) return { ok: true };
  return { ok: false, code: error.code === "23505" ? "duplicate" : error.code === "42501" ? "notAllowed" : "generic" };
}

export async function setServiceActive(id: string, active: boolean): Promise<ServiceWriteResult> {
  const { profile } = await getSession();
  if (profile.role === "staff") return { ok: false, code: "notAllowed" };
  const supabase = await createClient();
  const { error, count } = await supabase.from("cl_services").update({ active }, { count: "exact" }).eq("id", id);
  if (error || count === 0) return { ok: false, code: "generic" };
  return { ok: true };
}
