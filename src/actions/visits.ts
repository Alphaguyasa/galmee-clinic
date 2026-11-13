"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/dal/session";
import { MOVABLE_STATUSES } from "@/lib/visit-status";
import { closeVisitSchema } from "@/server/validation";
import {
  addVisitService,
  closeVisitAndBill,
  type CloseResult,
  openVisit,
  reverseVisitService,
  setVisitStatus,
  type LineResult,
  type OpenVisitResult,
  type SetStatusResult,
} from "@/server/dal/visits";

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

const statusSchema = z.object({ visitId: z.string().uuid(), status: z.enum(MOVABLE_STATUSES) });

export async function moveVisit(input: unknown): Promise<SetStatusResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  await getSession();
  const result = await setVisitStatus(parsed.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/visits/${parsed.data.visitId}`);
  }
  return result;
}

const addLineSchema = z.object({ visitId: z.string().uuid(), serviceId: z.string().uuid(), clientRef: z.string().uuid() });

export async function addLine(input: unknown): Promise<LineResult> {
  const parsed = addLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  await getSession();
  const result = await addVisitService(parsed.data);
  if (result.ok) revalidatePath(`/visits/${parsed.data.visitId}`);
  return result;
}

const reverseSchema = z.object({ visitId: z.string().uuid(), lineId: z.string().uuid() });

export async function removeLine(input: unknown): Promise<LineResult> {
  const parsed = reverseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "generic" };
  await getSession();
  const result = await reverseVisitService(parsed.data.lineId);
  if (result.ok) revalidatePath(`/visits/${parsed.data.visitId}`);
  return result;
}

export type CloseActionResult = CloseResult | { ok: false; code: "reference" | "amount" };

export async function closeAndBill(input: unknown): Promise<CloseActionResult> {
  const parsed = closeVisitSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, code: field === "reference" ? "reference" : field === "paid" ? "amount" : "generic" };
  }
  await getSession();
  const result = await closeVisitAndBill(parsed.data);
  if (result.ok || result.code === "closed") {
    revalidatePath("/");
    revalidatePath(`/visits/${parsed.data.visitId}`);
  }
  return result;
}
