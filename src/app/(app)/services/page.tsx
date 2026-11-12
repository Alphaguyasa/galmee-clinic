import { getLocale, getTranslations } from "next-intl/server";
import { ListChecks } from "lucide-react";
import { toggleService } from "@/actions/services";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { ServiceForm } from "@/components/service-form";
import { Button } from "@/components/ui/button";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { listServices } from "@/server/dal/services";
import { getSession } from "@/server/dal/session";

/** The price list every visit is billed from. Owner and manager edit it; reception reads it. */
export default async function ServicesPage() {
  const [{ profile }, services, t, rawLocale] = await Promise.all([
    getSession(),
    listServices(),
    getTranslations("services"),
    getLocale(),
  ]);
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const canEdit = profile.role !== "staff";

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem] md:items-start">
      <div className="grid gap-4">
        <div className="grid gap-1">
          <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        {services.length === 0 ? (
          <EmptyState icon={ListChecks} message={canEdit ? t("empty") : t("emptyStaff")} />
        ) : (
          <ListSheet aria-label={t("title")}>
            {services.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                sub={
                  <span>
                    {t(`kinds.${s.kind}`)}
                    {s.active ? null : ` · ${t("inactive")}`}
                  </span>
                }
                className={s.active ? undefined : "opacity-60"}
                right={
                  <>
                    <span className="num font-semibold">{formatBirr(s.price, locale)}</span>
                    {canEdit ? (
                      <form action={toggleService}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={String(!s.active)} />
                        <Button type="submit" variant="ghost" size="sm" aria-label={`${s.active ? t("deactivate") : t("activate")}: ${s.name}`}>
                          {s.active ? t("deactivate") : t("activate")}
                        </Button>
                      </form>
                    ) : null}
                  </>
                }
              />
            ))}
          </ListSheet>
        )}
      </div>
      {canEdit ? (
        <section aria-labelledby="add-service" className="grid gap-3 rounded-md border bg-card p-4">
          <h2 id="add-service" className="text-lg font-bold">
            {t("addTitle")}
          </h2>
          <ServiceForm />
        </section>
      ) : null}
    </div>
  );
}
