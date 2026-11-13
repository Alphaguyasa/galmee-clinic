import { getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { CardNoTab } from "@/components/card-no-tab";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getLabQueue } from "@/server/dal/labs";

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });

/** The lab bench: tests waiting for a result, oldest first. */
export default async function LabQueuePage() {
  const [roles, t, tQueue] = await Promise.all([getClinicalRoles(), getTranslations("lab"), getTranslations("queue")]);
  const allowed = roles.has("lab") || roles.has("doctor");
  const queue = allowed ? await getLabQueue() : [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{allowed ? t("intro") : t("notAllowed")}</p>
      </div>

      {!allowed ? null : queue.length === 0 ? (
        <EmptyState icon={FlaskConical} message={t("empty")} />
      ) : (
        <ListSheet aria-label={t("title")}>
          {queue.map((o) => (
            <ListRow
              key={o.id}
              href={`/lab/${o.id}`}
              mark={
                <span className="num grid size-10 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
                  <span className="sr-only">{tQueue("queueNo")} </span>
                  {o.queueNo ?? "–"}
                </span>
              }
              title={o.testName}
              sub={
                <span className="flex flex-wrap items-center gap-2">
                  <CardNoTab cardNo={o.patient.cardNo} label={tQueue("cardNo")} className="h-6 min-w-10 text-sm" />
                  <span className="break-words">{o.patient.fullName}</span>
                </span>
              }
              right={<span className="num text-sm text-muted-foreground">{TIME.format(new Date(o.requestedAt))}</span>}
            />
          ))}
        </ListSheet>
      )}
    </div>
  );
}
