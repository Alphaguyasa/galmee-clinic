"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/dal/session";
import { enterLabResults, requestLab, type EnterResultsResult, type RequestLabResult } from "@/server/dal/labs";
import { labRequestSchema, labResultsSchema } from "@/server/validation";

export async function requestLabTest(input: unknown): Promise<RequestLabResult> {
  const parsed = labRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  // Server Actions are public endpoints: re-check the session; the RPC re-checks the doctor role.
  await getSession();
  const result = await requestLab(parsed.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/visits/${parsed.data.visitId}`);
  }
  return result;
}

export async function saveLabResults(input: unknown): Promise<EnterResultsResult | { ok: false; code: "invalid" }> {
  const parsed = labResultsSchema.safeParse(input);
  if (!parsed.success) {
    const dup = parsed.error.issues.some((i) => i.message === "duplicate");
    return { ok: false, code: dup ? "duplicate" : "invalid" };
  }
  await getSession();
  const result = await enterLabResults(parsed.data);
  if (result.ok || result.code === "closed") {
    revalidatePath("/lab");
    revalidatePath(`/lab/${parsed.data.orderId}`);
    revalidatePath("/");
  }
  return result;
}
