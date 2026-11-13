import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CardNoTab } from "@/components/card-no-tab";
import { LabResultsForm } from "@/components/lab-results-form";
import { getClinicalRoles } from "@/server/dal/clinical-roles";
import { getLabOrder } from "@/server/dal/labs";

export default async function LabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [roles, order, t, tQueue] = await Promise.all([
    getClinicalRoles(),
    getLabOrder(id),
    getTranslations("lab"),
    getTranslations("queue"),
  ]);
  if (!order) notFound();

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 *:min-w-0">
      <Link href="/lab" className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

      <header className="grid gap-1.5">
        <h1 className="text-[1.5625rem] leading-tight font-bold break-words">{order.testName}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <CardNoTab cardNo={order.patient.cardNo} label={tQueue("cardNo")} />
          <span className="font-medium break-words">{order.patient.fullName}</span>
          {order.patient.sex ? <span className="text-sm text-muted-foreground">{t(`sex.${order.patient.sex}`)}</span> : null}
        </div>
        {order.note ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <span className="font-semibold">{t("doctorNote")}: </span>
            {order.note}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="results" className="grid gap-3 rounded-md border bg-card p-4">
        <h2 id="results" className="text-lg font-bold">
          {t("results")}
        </h2>
        {order.status === "requested" ? (
          roles.has("lab") ? (
            <LabResultsForm orderId={order.id} testName={order.testName} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("waiting")}</p>
          )
        ) : order.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(`status.${order.status}`)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-medium">{t("analyte")}</th>
                <th className="py-1 pr-2 font-medium">{t("value")}</th>
                <th className="py-1 font-medium">{t("range")}</th>
              </tr>
            </thead>
            <tbody>
              {order.results.map((r) => (
                <tr key={r.analyte} className="border-t align-top">
                  <td className="py-2 pr-2 break-words">{r.analyte}</td>
                  <td className="num py-2 pr-2 font-semibold">
                    {r.value} {r.unit}
                    {r.flag && r.flag !== "normal" ? (
                      <span className="ml-1 rounded-sm bg-warning/15 px-1 text-xs text-warning">{t(`flags.${r.flag}`)}</span>
                    ) : null}
                  </td>
                  <td className="num py-2 text-muted-foreground">{r.referenceRange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
