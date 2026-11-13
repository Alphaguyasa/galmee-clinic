import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "./session";

export type ClinicalRole = "doctor" | "lab" | "reception";

/** The signed-in user's clinical roles in this clinic. The database enforces them; this only decides what to show. */
export const getClinicalRoles = cache(async (): Promise<Set<ClinicalRole>> => {
  const { userId } = await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase.from("cl_staff_roles").select("clinical_role").eq("user_id", userId);
  if (error) return new Set();
  return new Set(data.map((r) => r.clinical_role as ClinicalRole));
});

export const CLINICAL_ROLES = ["doctor", "lab", "reception"] as const;

export type StaffRolesDTO = {
  userId: string;
  fullName: string;
  appRole: "owner" | "manager" | "staff";
  active: boolean;
  roles: ClinicalRole[];
};

/** Everyone in the clinic with their clinical roles, owner first then by name. */
export async function listStaffRoles(): Promise<StaffRolesDTO[]> {
  await getSession();
  const supabase = await createClient();
  const [people, roles] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, role, active").order("full_name").limit(200),
    supabase.from("cl_staff_roles").select("user_id, clinical_role").limit(1000),
  ]);
  if (people.error || roles.error) throw new Error("staff_failed");
  const byUser = new Map<string, ClinicalRole[]>();
  for (const r of roles.data) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.clinical_role as ClinicalRole]);
  const rank = { owner: 0, manager: 1, staff: 2 } as const;
  return people.data
    .map((p) => ({
      userId: p.user_id,
      fullName: p.full_name,
      appRole: p.role,
      active: p.active,
      roles: CLINICAL_ROLES.filter((c) => byUser.get(p.user_id)?.includes(c)),
    }))
    .sort((a, b) => rank[a.appRole] - rank[b.appRole] || a.fullName.localeCompare(b.fullName));
}

export type SetRoleResult = { ok: true } | { ok: false; code: "notAllowed" | "generic" };

/** Give or take one clinical role. Owner only: RLS refuses anyone else, and the insert also checks the person is in this clinic. */
export async function setClinicalRole(input: { userId: string; role: ClinicalRole; on: boolean }): Promise<SetRoleResult> {
  const { profile } = await getSession();
  if (profile.role !== "owner") return { ok: false, code: "notAllowed" };
  const supabase = await createClient();
  const { error } = input.on
    ? await supabase
        .from("cl_staff_roles")
        .upsert({ user_id: input.userId, clinical_role: input.role }, { onConflict: "tenant_id,user_id,clinical_role", ignoreDuplicates: true })
    : await supabase.from("cl_staff_roles").delete().eq("user_id", input.userId).eq("clinical_role", input.role);
  if (!error) return { ok: true };
  return { ok: false, code: error.code === "42501" ? "notAllowed" : "generic" };
}
