import { formatMonthParam, pickMonth } from "@/lib/month-report";
import { getMonthlyIncome } from "@/server/dal/income";
import { incomeCsvResponse } from "@/server/income-csv";
import { clinicToday } from "@/server/dal/visits";

/** The monthly income report as a CSV file. Owner and manager only (the data call checks the role). */
export async function GET(request: Request) {
  const month = pickMonth(new URL(request.url).searchParams.get("m") ?? undefined, clinicToday());
  return incomeCsvResponse(await getMonthlyIncome(month), `clinic-income-${formatMonthParam(month)}.csv`);
}
