import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Download, Receipt } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/i18n/config";
import { ETHIOPIAN_MONTHS, formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { formatMonthParam, monthOf, pickMonth, shiftMonth } from "@/lib/month-report";
import { cn } from "@/lib/utils";
import { getMonthlyIncome } from "@/server/dal/income";
import { clinicToday } from "@/server/dal/visits";

const KINDS = ["consultation", "lab", "procedure", "other"] as const;

/** Owner and manager: one Ethiopian month of income, by service and by day, with a CSV download. */
export default async function MonthlyIncomePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const today = clinicToday();
  const month = pickMonth((await searchParams).m, today);
  const [report, t, tDay, tKinds, rawLocale] = await Promise.all([
    getMonthlyIncome(month),
    getTranslations("income.month"),
    getTranslations("income"),
    getTranslations("services.kinds"),
    getLocale(),
  ]);
  if (!report) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const current = monthOf(today);
  const isCurrent = month.year === current.year && month.month === current.month;
  const label = `${ETHIOPIAN_MONTHS[locale][month.month - 1]} ${month.year}`;
  const param = formatMonthParam(month);
  const kind = (k: string) => ((KINDS as readonly string[]).includes(k) ? tKinds(k as (typeof KINDS)[number]) : k);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <Link href="/income" prefetch={false} className="inline-flex h-11 items-center text-sm font-medium text-primary">
          {t("byDayLink")}
        </Link>
      </div>

      <nav aria-label={t("pickMonth")} className="flex items-center justify-between gap-2 rounded-md border bg-card p-1">
        <Link
          href={`/income/month?m=${formatMonthParam(shiftMonth(month, -1))}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
          aria-label={t("previousMonth")}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <p className="text-center font-semibold">
          {label}
          {isCurrent ? <span className="block text-xs font-normal text-muted-foreground">{t("thisMonth")}</span> : null}
        </p>
        {isCurrent ? (
          <span className="size-11" aria-hidden />
        ) : (
          <Link
            href={`/income/month?m=${formatMonthParam(shiftMonth(month, 1))}`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
            aria-label={t("nextMonth")}
          >
            <ChevronRight aria-hidden />
          </Link>
        )}
      </nav>

      <MoneySummaryCard
        label={tDay("billed")}
        figure={formatBirr(report.billed, locale)}
        sub={tDay("visitsClosed", { count: report.visits })}
        tone="in"
      />

      <dl className="grid grid-cols-2 divide-x rounded-md border bg-card">
        <div className="grid gap-0.5 p-3">
          <dt className="text-sm text-muted-foreground">{tDay("paid")}</dt>
          <dd className="num text-lg font-bold">{formatBirr(report.paid, locale)}</dd>
        </div>
        <div className="grid gap-0.5 p-3">
          <dt className="text-sm text-muted-foreground">{tDay("credit")}</dt>
          <dd className={cn("num text-lg font-bold", report.credit > 0 && "text-owed")}>{formatBirr(report.credit, locale)}</dd>
        </div>
      </dl>

      {report.visits > 0 ? (
        <a
          href={`/income/month/csv?m=${param}`}
          download
          className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-self-start")}
        >
          <Download aria-hidden />
          {t("download")}
        </a>
      ) : null}

      {report.visits === 0 ? (
        <EmptyState icon={Receipt} message={isCurrent ? t("emptyThisMonth") : t("empty")} />
      ) : (
        <>
          <section aria-labelledby="month-by-service" className="grid gap-2">
            <h2 id="month-by-service" className="text-lg font-bold">
              {tDay("byService")}
            </h2>
            <ListSheet>
              {report.services.map((s) => (
                <ListRow
                  key={s.serviceId}
                  title={s.serviceName}
                  sub={
                    <span>
                      {kind(s.kind)} · {tDay("times", { count: s.count })}
                    </span>
                  }
                  right={<span className="num font-semibold">{formatBirr(s.total, locale)}</span>}
                />
              ))}
            </ListSheet>
          </section>

          <section aria-labelledby="month-by-day" className="grid gap-2">
            <h2 id="month-by-day" className="text-lg font-bold">
              {t("byDay")}
            </h2>
            <ListSheet>
              {report.days.map((d) => (
                <ListRow
                  key={d.day}
                  href={`/income?d=${d.day}`}
                  title={formatEthiopianDate(d.day, locale, { withEra: false })}
                  sub={
                    <span>
                      {tDay("visitsClosed", { count: d.visits })}
                      {d.credit > 0 ? ` · ${tDay("credit")} ${formatBirr(d.credit, locale)}` : ""}
                    </span>
                  }
                  right={<span className="num font-semibold">{formatBirr(d.billed, locale)}</span>}
                />
              ))}
            </ListSheet>
          </section>
        </>
      )}

      <p className="text-xs text-muted-foreground">{tDay("note")}</p>
    </div>
  );
}
