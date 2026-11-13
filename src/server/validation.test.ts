import { describe, expect, it } from "vitest";
import { closeVisitSchema } from "./validation";

const base = {
  visitId: "6f1c2a3e-1b2c-4d5e-8f90-123456789abc",
  closeRef: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  method: "cash",
  reference: "",
  due: "",
};

describe("closeVisitSchema", () => {
  it("accepts a cash payment with thousands separators", () => {
    const r = closeVisitSchema.safeParse({ ...base, paid: "1,250.50" });
    expect(r.success && r.data.paid).toBe(1250.5);
  });

  it("rejects negative, text and three-decimal amounts", () => {
    for (const paid of ["-5", "abc", "10.555", ""]) expect(closeVisitSchema.safeParse({ ...base, paid }).success).toBe(false);
  });

  it("asks for the Telebirr transaction number when money was taken by Telebirr", () => {
    expect(closeVisitSchema.safeParse({ ...base, paid: "200", method: "telebirr" }).success).toBe(false);
    expect(closeVisitSchema.safeParse({ ...base, paid: "200", method: "telebirr", reference: "CK41A2B3" }).success).toBe(true);
    expect(closeVisitSchema.safeParse({ ...base, paid: "0", method: "telebirr" }).success).toBe(true);
  });

  it("accepts an empty or ISO due date only", () => {
    expect(closeVisitSchema.safeParse({ ...base, paid: "0", due: "2026-12-01" }).success).toBe(true);
    expect(closeVisitSchema.safeParse({ ...base, paid: "0", due: "01/12/2026" }).success).toBe(false);
  });

  it("rejects other payment methods", () => {
    expect(closeVisitSchema.safeParse({ ...base, paid: "10", method: "chapa" }).success).toBe(false);
  });
});

describe("labRequestSchema", () => {
  const ids = { visitId: base.visitId, serviceId: base.closeRef, clientRef: base.visitId };
  it("drops an empty note and keeps a real one trimmed", async () => {
    const { labRequestSchema } = await import("./validation");
    const empty = labRequestSchema.safeParse({ ...ids, note: "  " });
    expect(empty.success && empty.data.note).toBe(undefined);
    const note = labRequestSchema.safeParse({ ...ids, note: " fasting " });
    expect(note.success && note.data.note).toBe("fasting");
  });
  it("rejects a note over 500 characters", async () => {
    const { labRequestSchema } = await import("./validation");
    expect(labRequestSchema.safeParse({ ...ids, note: "x".repeat(501) }).success).toBe(false);
  });
});

describe("labResultsSchema", () => {
  const row = { analyte: "Hemoglobin", value: "13.2", unit: "g/dL", reference_range: "12-16", flag: "normal" };
  it("accepts a result line and trims it", async () => {
    const { labResultsSchema } = await import("./validation");
    const r = labResultsSchema.safeParse({ orderId: base.visitId, results: [{ ...row, value: " 13.2 " }] });
    expect(r.success && r.data.results[0].value).toBe("13.2");
  });
  it("rejects no lines, an empty value, an unknown flag and the same analyte twice", async () => {
    const { labResultsSchema } = await import("./validation");
    expect(labResultsSchema.safeParse({ orderId: base.visitId, results: [] }).success).toBe(false);
    expect(labResultsSchema.safeParse({ orderId: base.visitId, results: [{ ...row, value: " " }] }).success).toBe(false);
    expect(labResultsSchema.safeParse({ orderId: base.visitId, results: [{ ...row, flag: "bad" }] }).success).toBe(false);
    expect(
      labResultsSchema.safeParse({ orderId: base.visitId, results: [row, { ...row, analyte: "hemoglobin" }] }).success,
    ).toBe(false);
  });
});
