import { getLocale, getTranslations } from "next-intl/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatMonthParam, monthlyIncomeCsv, pickMonth } from "@/lib/month-report";
import { getMonthlyIncome } from "@/server/dal/income";
import { clinicToday } from "@/server/dal/visits";

const KINDS = ["consultation", "lab", "procedure", "other"] as const;

/** The monthly income report as a CSV file. Owner and manager only (the data call checks the role). */
export async function GET(request: Request) {
  const month = pickMonth(new URL(request.url).searchParams.get("m") ?? undefined, clinicToday());
  const report = await getMonthlyIncome(month);
  if (!report) return new Response("Not found", { status: 404 });

  const [t, tKinds, rawLocale] = await Promise.all([
    getTranslations("income.month.csv"),
    getTranslations("services.kinds"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const csv = monthlyIncomeCsv(
    report,
    {
      section: { totals: t("totals"), services: t("services"), days: t("days") },
      columns: {
        service: t("service"),
        kind: t("kind"),
        count: t("count"),
        total: t("total"),
        day: t("day"),
        dayEth: t("dayEth"),
        visits: t("visits"),
        billed: t("billed"),
        paid: t("paid"),
        credit: t("credit"),
      },
    },
    (k) => ((KINDS as readonly string[]).includes(k) ? tKinds(k as (typeof KINDS)[number]) : k),
    (d) => formatEthiopianDate(d, locale, { withEra: false }),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clinic-income-${formatMonthParam(month)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
