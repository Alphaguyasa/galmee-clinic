import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { HandCoins } from "lucide-react";
import { CardNoTab } from "@/components/card-no-tab";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { defaultLocale, isLocale } from "@/i18n/config";
import { daysBetween, formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { listPatientsWhoOwe } from "@/server/dal/owed";

// Balances change with every payment; always read fresh.
export const dynamic = "force-dynamic";

/** Owner and manager: every patient with an unpaid balance, oldest debt first, each linked to the card. */
export default async function OwedPage() {
  const [rows, t, tPatients, rawLocale] = await Promise.all([
    listPatientsWhoOwe(),
    getTranslations("owed"),
    getTranslations("patients"),
    getLocale(),
  ]);
  if (!rows) notFound();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const total = Math.round(rows.reduce((sum, r) => sum + r.balance, 0) * 100) / 100;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5 *:min-w-0">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>

      <MoneySummaryCard
        label={t("total")}
        figure={formatBirr(total, locale)}
        sub={t("patients", { count: rows.length })}
        tone={total > 0 ? "owed" : "band"}
      />

      {rows.length === 0 ? (
        <EmptyState icon={HandCoins} message={t("empty")} />
      ) : (
        <ListSheet>
          {rows.map((r) => {
            const days = r.oldestDebtAt ? -daysBetween(r.oldestDebtAt) : null;
            return (
              <ListRow
                key={r.patientId}
                href={`/patients/${r.patientId}`}
                prefetch={false}
                title={r.fullName}
                sub={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CardNoTab cardNo={r.cardNo} label={tPatients("cardNo")} className="h-6 text-base" />
                    {r.oldestDebtAt ? (
                      <span>
                        {t("since", { date: formatEthiopianDate(r.oldestDebtAt, locale, { withEra: false }) })}
                        {days !== null && days >= 30 ? ` · ${t("days", { count: days })}` : ""}
                      </span>
                    ) : null}
                  </span>
                }
                right={<span className="num font-semibold text-owed">{formatBirr(r.balance, locale)}</span>}
              />
            );
          })}
        </ListSheet>
      )}

      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
