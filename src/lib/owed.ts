export type OwedRow = {
  patientId: string;
  cardNo: number;
  fullName: string;
  phone: string | null;
  balance: number;
  oldestDebtAt: string | null;
};

/**
 * Joins core balances (already oldest debt first) to clinic patients by customer id. Keeps the balance
 * order, drops customers that are not patients of this clinic and anything not actually owed.
 */
export function mergeOwed(
  balances: { customer_id: string | null; balance: number | string | null; oldest_debt_at: string | null }[],
  patients: { id: string; card_no: number; full_name: string; phone: string | null; customer_id: string }[],
): OwedRow[] {
  const byCustomer = new Map(patients.map((p) => [p.customer_id, p]));
  return balances.flatMap((b) => {
    const p = b.customer_id ? byCustomer.get(b.customer_id) : undefined;
    const balance = Math.round(Number(b.balance ?? 0) * 100) / 100;
    if (!p || !(balance > 0)) return [];
    return [{ patientId: p.id, cardNo: p.card_no, fullName: p.full_name, phone: p.phone, balance, oldestDebtAt: b.oldest_debt_at }];
  });
}
