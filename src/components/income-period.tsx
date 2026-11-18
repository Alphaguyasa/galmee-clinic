import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Download, Receipt } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import type { MonthlyIncome } from "@/lib/month-report";
import { cn } from "@/lib/utils";

const KINDS = ["consultation", "lab", "procedure", "other"] as const;

/** One period of income (a week or an Ethiopian month): totals, CSV download, by service, by day. */
export async function IncomePeriod({
  title,
  links,
  navLabel,
  previous,
  next,
  periodLabel,
  currentLabel,
  report,
  csvHref,
  emptyMessage,
  locale,
}: {
  title: string;
  links: { href: string; label: string }[];
  navLabel: string;
  previous: { href: string; label: string };
  /** Null for the current period: there is no future to step into. */
  next: { href: string; label: string } | null;
  periodLabel: string;
  currentLabel: string | null;
  report: MonthlyIncome;
  csvHref: string;
  emptyMessage: string;
  locale: Locale;
}) {
  const [t, tDay, tKinds] = await Promise.all([
    getTranslations("income.month"),
    getTranslations("income"),
    getTranslations("services.kinds"),
  ]);
  const kind = (k: string) => ((KINDS as readonly string[]).includes(k) ? tKinds(k as (typeof KINDS)[number]) : k);
  const navButton = cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11");

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{title}</h1>
        <div className="flex gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} prefetch={false} className="inline-flex h-11 items-center text-sm font-medium text-primary">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <nav aria-label={navLabel} className="flex items-center justify-between gap-2 rounded-md border bg-card p-1">
        <Link href={previous.href} className={navButton} aria-label={previous.label}>
          <ChevronLeft aria-hidden />
        </Link>
        <p className="text-center font-semibold">
          {periodLabel}
          {currentLabel ? <span className="block text-xs font-normal text-muted-foreground">{currentLabel}</span> : null}
        </p>
        {next ? (
          <Link href={next.href} className={navButton} aria-label={next.label}>
            <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className="size-11" aria-hidden />
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

      {report.visits === 0 ? (
        <EmptyState icon={Receipt} message={emptyMessage} />
      ) : (
        <>
          <a href={csvHref} download className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-self-start")}>
            <Download aria-hidden />
            {t("download")}
          </a>

          <section aria-labelledby="period-by-service" className="grid gap-2">
            <h2 id="period-by-service" className="text-lg font-bold">
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

          <section aria-labelledby="period-by-day" className="grid gap-2">
            <h2 id="period-by-day" className="text-lg font-bold">
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
