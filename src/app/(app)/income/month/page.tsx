import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IncomePeriod } from "@/components/income-period";
import { defaultLocale, isLocale } from "@/i18n/config";
import { ETHIOPIAN_MONTHS } from "@/lib/ethiopian-date";
import { formatMonthParam, monthOf, pickMonth, shiftMonth } from "@/lib/month-report";
import { getMonthlyIncome } from "@/server/dal/income";
import { clinicToday } from "@/server/dal/visits";

/** Owner and manager: one Ethiopian month of income, by service and by day, with a CSV download. */
export default async function MonthlyIncomePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const today = clinicToday();
  const month = pickMonth((await searchParams).m, today);
  const [report, t, rawLocale] = await Promise.all([getMonthlyIncome(month), getTranslations("income"), getLocale()]);
  if (!report) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const current = monthOf(today);
  const isCurrent = month.year === current.year && month.month === current.month;
  const param = formatMonthParam(month);

  return (
    <IncomePeriod
      title={t("month.title")}
      links={[
        { href: "/income", label: t("month.byDayLink") },
        { href: "/income/week", label: t("week.link") },
      ]}
      navLabel={t("month.pickMonth")}
      previous={{ href: `/income/month?m=${formatMonthParam(shiftMonth(month, -1))}`, label: t("month.previousMonth") }}
      next={isCurrent ? null : { href: `/income/month?m=${formatMonthParam(shiftMonth(month, 1))}`, label: t("month.nextMonth") }}
      periodLabel={`${ETHIOPIAN_MONTHS[locale][month.month - 1]} ${month.year}`}
      currentLabel={isCurrent ? t("month.thisMonth") : null}
      report={report}
      csvHref={`/income/month/csv?m=${param}`}
      emptyMessage={isCurrent ? t("month.emptyThisMonth") : t("month.empty")}
      locale={locale}
    />
  );
}
