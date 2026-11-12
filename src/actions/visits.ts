"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/dal/session";
import { openVisit, type OpenVisitResult } from "@/server/dal/visits";

const openVisitSchema = z.object({ patientId: z.string().uuid(), clientRef: z.string().uuid() });

export async function addToQueue(input: unknown): Promise<OpenVisitResult> {
  const parsed = openVisitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  // Server Actions are public endpoints: re-check the session here, not only on the page.
  await getSession();
  const result = await openVisit(parsed.data);
  if (result.ok || result.code === "alreadyOpen") {
    revalidatePath("/");
    revalidatePath("/patients");
  }
  return result;
}
