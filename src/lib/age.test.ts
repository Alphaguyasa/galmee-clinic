import { describe, expect, it } from "vitest";
import { ageInYears, birthDateForAge } from "./age";
import { cleanPatientQuery, patientSchema } from "@/server/validation";

const today = new Date(Date.UTC(2026, 10, 12));

describe("age", () => {
  it("round-trips an age through the stored birth date", () => {
    expect(birthDateForAge(34, today)).toBe("1992-11-12");
    expect(ageInYears(birthDateForAge(34, today), today)).toBe(34);
    expect(ageInYears("2026-11-12", today)).toBe(0);
  });
  it("counts a birthday later in the year as not yet reached", () => {
    expect(ageInYears("2000-11-13", today)).toBe(25);
    expect(ageInYears("2000-11-12", today)).toBe(26);
  });
});

describe("patient search query", () => {
  it("keeps Ethiopic, Latin and digits and drops filter syntax", () => {
    expect(cleanPatientQuery("  አበበ  ")).toBe("አበበ");
    expect(cleanPatientQuery("card_no.eq.1),phone.like.*")).toBe("card no eq 1 phone like");
    expect(cleanPatientQuery("+251 911 234 567")).toBe("+251 911 234 567");
    expect(cleanPatientQuery(undefined)).toBe("");
    expect(cleanPatientQuery("x".repeat(100))).toHaveLength(60);
  });
});

describe("patient form", () => {
  const base = { fullName: "Lensa Tadesse", phone: "", sex: "", age: "", address: "", clientRef: crypto.randomUUID() };
  it("accepts a name alone", () => {
    const r = patientSchema.safeParse(base);
    expect(r.success && r.data).toMatchObject({ fullName: "Lensa Tadesse", phone: undefined, age: undefined });
  });
  it("rejects a bad phone and an impossible age", () => {
    expect(patientSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, age: "130" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, age: "4.5" }).success).toBe(false);
  });
});

describe("service price", () => {
  it("accepts birr with up to two decimals and thousands commas", async () => {
    const { serviceSchema } = await import("@/server/validation");
    expect(serviceSchema.parse({ name: "CBC", kind: "lab", price: "1,250.50" }).price).toBe(1250.5);
    expect(serviceSchema.safeParse({ name: "CBC", kind: "lab", price: "-5" }).success).toBe(false);
    expect(serviceSchema.safeParse({ name: "CBC", kind: "lab", price: "1.234" }).success).toBe(false);
    expect(serviceSchema.safeParse({ name: "CBC", kind: "xray", price: "10" }).success).toBe(false);
  });
});
