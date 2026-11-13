"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CLINICAL_ROLES, setClinicalRole, type SetRoleResult } from "@/server/dal/clinical-roles";

const schema = z.object({ userId: z.string().uuid(), role: z.enum(CLINICAL_ROLES), on: z.boolean() });

export async function toggleClinicalRole(input: unknown): Promise<SetRoleResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  // setClinicalRole re-checks the session and the owner role; RLS checks again.
  const result = await setClinicalRole(parsed.data);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
