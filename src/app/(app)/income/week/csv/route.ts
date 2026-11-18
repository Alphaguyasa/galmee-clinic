import { pickWeek } from "@/lib/month-report";
import { getWeeklyIncome } from "@/server/dal/income";
import { incomeCsvResponse } from "@/server/income-csv";
import { clinicToday } from "@/server/dal/visits";

/** The weekly income report as a CSV file. Owner and manager only (the data call checks the role). */
export async function GET(request: Request) {
  const monday = pickWeek(new URL(request.url).searchParams.get("w") ?? undefined, clinicToday());
  return incomeCsvResponse(await getWeeklyIncome(monday), `clinic-income-week-${monday}.csv`);
}
