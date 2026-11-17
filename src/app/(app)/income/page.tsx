import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { pickIncomeDay, shiftDay } from "@/lib/income";
import { formatBirr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getDailyIncome } from "@/server/dal/income";
import { clinicToday } from "@/server/dal/visits";

const KINDS = ["consultation", "lab", "procedure", "other"] as const;

/** Owner and manager: what the clinic earned on one day, service by service. */
export default async function IncomePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const today = clinicToday();
  const day = pickIncomeDay((await searchParams).d, today);
  const [income, t, tKinds, rawLocale] = await Promise.all([
    getDailyIncome(day),
    getTranslations("income"),
    getTranslations("services.kinds"),
    getLocale(),
  ]);
  if (!income) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const isToday = day === today;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>

      <nav aria-label={t("pickDay")} className="flex items-center justify-between gap-2 rounded-md border bg-card p-1">
        <Link
          href={`/income?d=${shiftDay(day, -1)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
          aria-label={t("previousDay")}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <p className="text-center font-semibold">
          {formatEthiopianDate(day, locale)}
          {isToday ? <span className="block text-xs font-normal text-muted-foreground">{t("today")}</span> : null}
        </p>
        {isToday ? (
          <span className="size-11" aria-hidden />
        ) : (
          <Link
            href={`/income?d=${shiftDay(day, 1)}`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11")}
            aria-label={t("nextDay")}
          >
            <ChevronRight aria-hidden />
          </Link>
        )}
      </nav>

      <MoneySummaryCard
        label={t("billed")}
        figure={formatBirr(income.billed, locale)}
        sub={t("visitsClosed", { count: income.visits })}
        tone="in"
      />

      <dl className="grid grid-cols-2 divide-x rounded-md border bg-card">
        <div className="grid gap-0.5 p-3">
          <dt className="text-sm text-muted-foreground">{t("paid")}</dt>
          <dd className="num text-lg font-bold">{formatBirr(income.paid, locale)}</dd>
        </div>
        <div className="grid gap-0.5 p-3">
          <dt className="text-sm text-muted-foreground">{t("credit")}</dt>
          <dd className={cn("num text-lg font-bold", income.credit > 0 && "text-owed")}>{formatBirr(income.credit, locale)}</dd>
        </div>
      </dl>

      <section aria-labelledby="by-service" className="grid gap-2">
        <h2 id="by-service" className="text-lg font-bold">
          {t("byService")}
        </h2>
        {income.services.length === 0 ? (
          <EmptyState icon={Receipt} message={isToday ? t("emptyToday") : t("emptyDay")} />
        ) : (
          <ListSheet>
            {income.services.map((s) => (
              <ListRow
                key={s.serviceId}
                title={s.serviceName}
                sub={
                  <span>
                    {(KINDS as readonly string[]).includes(s.kind) ? tKinds(s.kind as (typeof KINDS)[number]) : s.kind} ·{" "}
                    {t("times", { count: s.count })}
                  </span>
                }
                right={<span className="num font-semibold">{formatBirr(s.total, locale)}</span>}
              />
            ))}
          </ListSheet>
        )}
      </section>

      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
