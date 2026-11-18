import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { IncomePeriod } from "@/components/income-period";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatMonthParam, monthOf, pickWeek, shiftWeek, weekEnd, weekStart } from "@/lib/month-report";
import { getWeeklyIncome } from "@/server/dal/income";
import { clinicToday } from "@/server/dal/visits";

/** Owner and manager: one week (Monday to Sunday) of income, by service and by day, with a CSV download. */
export default async function WeeklyIncomePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const today = clinicToday();
  const monday = pickWeek((await searchParams).w, today);
  const [report, t, rawLocale] = await Promise.all([getWeeklyIncome(monday), getTranslations("income"), getLocale()]);
  if (!report) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const isCurrent = monday === weekStart(today);

  return (
    <IncomePeriod
      title={t("week.title")}
      links={[
        { href: "/income", label: t("month.byDayLink") },
        { href: `/income/month?m=${formatMonthParam(monthOf(monday))}`, label: t("month.link") },
      ]}
      navLabel={t("week.pickWeek")}
      previous={{ href: `/income/week?w=${shiftWeek(monday, -1)}`, label: t("week.previousWeek") }}
      next={isCurrent ? null : { href: `/income/week?w=${shiftWeek(monday, 1)}`, label: t("week.nextWeek") }}
      periodLabel={`${formatEthiopianDate(monday, locale, { withEra: false })} – ${formatEthiopianDate(weekEnd(monday), locale, { withEra: false })}`}
      currentLabel={isCurrent ? t("week.thisWeek") : null}
      report={report}
      csvHref={`/income/week/csv?w=${monday}`}
      emptyMessage={isCurrent ? t("week.emptyThisWeek") : t("week.empty")}
      locale={locale}
    />
  );
}
