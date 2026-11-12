import { z } from "zod";

export const MIN_PASSWORD = 10;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(128),
});

export const signupSchema = credentialsSchema.extend({
  password: z.string().min(MIN_PASSWORD).max(128),
});

// Ethiopian mobile/landline: 09xxxxxxxx, 07xxxxxxxx or +2519xxxxxxxx; spaces and dashes allowed.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+251|0)[1-9]\d{8}$/));

export const onboardingSchema = z.object({
  clinicName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export function formToObject(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k) ?? ""]));
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v));

export const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.union([z.literal("").transform(() => undefined), phoneSchema]),
  sex: z.enum(["female", "male", ""]).transform((v) => (v === "" ? undefined : v)),
  age: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : Number(v)))
    .pipe(z.number().int().min(0).max(120).optional()),
  address: optionalText(200),
  clientRef: z.string().uuid(),
});
export type PatientInput = z.output<typeof patientSchema>;

/** Search text for patients: letters (any script), digits, spaces and + only, at most 60 characters. */
export function cleanPatientQuery(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
