"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createService, setServiceActive } from "@/server/dal/services";
import { getSession } from "@/server/dal/session";
import { formToObject, serviceSchema } from "@/server/validation";

export type ServiceFormState =
  | { ok?: boolean; error?: "errorName" | "errorPrice" | "errorDuplicate" | "errorNotAllowed" | "errorGeneric" }
  | undefined;

export async function addService(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const parsed = serviceSchema.safeParse(formToObject(formData, ["name", "kind", "price"]));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "price" ? "errorPrice" : field === "name" ? "errorName" : "errorGeneric" };
  }
  await getSession();
  const result = await createService(parsed.data);
  if (!result.ok) {
    return { error: result.code === "duplicate" ? "errorDuplicate" : result.code === "notAllowed" ? "errorNotAllowed" : "errorGeneric" };
  }
  revalidatePath("/services");
  return { ok: true };
}

const toggleSchema = z.object({ id: z.string().uuid(), active: z.enum(["true", "false"]) });

export async function toggleService(formData: FormData): Promise<void> {
  const parsed = toggleSchema.safeParse(formToObject(formData, ["id", "active"]));
  if (!parsed.success) return;
  await getSession();
  await setServiceActive(parsed.data.id, parsed.data.active === "true");
  revalidatePath("/services");
}
