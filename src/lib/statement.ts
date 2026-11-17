export type StatementLineDTO = { at: string; type: "debt" | "repayment"; amount: number; balanceAfter: number };

/** Turns ledger rows (oldest first) into statement lines with the running balance. */
export function statementLines(rows: { type: string; amount: number | string; created_at: string }[]): {
  lines: StatementLineDTO[];
  balance: number;
} {
  let balance = 0;
  const lines: StatementLineDTO[] = [];
  for (const r of rows) {
    if (r.type !== "debt" && r.type !== "repayment") continue;
    const amount = Number(r.amount);
    balance = Math.round((balance + (r.type === "debt" ? amount : -amount)) * 100) / 100;
    lines.push({ at: r.created_at, type: r.type, amount, balanceAfter: balance });
  }
  return { lines, balance };
}
