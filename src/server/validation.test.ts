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
