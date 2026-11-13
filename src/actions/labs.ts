"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/dal/session";
import { requestLab, type RequestLabResult } from "@/server/dal/labs";
import { labRequestSchema } from "@/server/validation";

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
