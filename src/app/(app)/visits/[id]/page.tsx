import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CardNoTab } from "@/components/card-no-tab";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { VisitStatusControl } from "@/components/visit-status-control";
import { getVisit } from "@/server/dal/visits";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [visit, t, tQueue] = await Promise.all([getVisit(id), getTranslations("visit"), getTranslations("queue")]);
  if (!visit) notFound();
  const open = visit.status === "waiting" || visit.status === "with_doctor" || visit.status === "lab";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToQueue")}
      </Link>

      <header className="flex items-start gap-3">
        <span className="num grid size-12 shrink-0 place-items-center rounded-md bg-primary text-xl font-bold text-primary-foreground">
          <span className="sr-only">{tQueue("queueNo")} </span>
          {visit.queueNo}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h1 className="text-[1.5625rem] leading-tight font-bold break-words">{visit.patient.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <CardNoTab cardNo={visit.patient.cardNo} label={tQueue("cardNo")} />
            <VisitStatusBadge status={visit.status} />
          </div>
          {visit.patient.phone ? <p className="num text-sm text-muted-foreground">{visit.patient.phone}</p> : null}
        </div>
      </header>

      {open ? (
        <section className="rounded-md border bg-card p-4">
          <VisitStatusControl visitId={visit.id} status={visit.status} />
        </section>
      ) : (
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">{t("closedNote")}</p>
      )}
    </div>
  );
}
