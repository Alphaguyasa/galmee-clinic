"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clock, FlaskConical, Stethoscope, X } from "lucide-react";
import { moveVisit } from "@/actions/visits";
import { Button } from "@/components/ui/button";
import type { MovableStatus, VisitStatus } from "@/lib/visit-status";
import { cn } from "@/lib/utils";

const STEPS = [
  { status: "waiting", icon: Clock },
  { status: "with_doctor", icon: Stethoscope },
  { status: "lab", icon: FlaskConical },
] as const;

/** Moves an open visit along the bench: waiting → with doctor → lab. Billing closes it. */
export function VisitStatusControl({ visitId, status }: { visitId: string; status: VisitStatus }) {
  const t = useTranslations("visit");
  const tStatus = useTranslations("queue.status");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const move = (next: MovableStatus) =>
    start(async () => {
      setError(null);
      const result = await moveVisit({ visitId, status: next });
      if (!result.ok) setError(t(result.code === "notAllowed" ? "errorNotAllowed" : result.code === "closed" ? "errorClosed" : "errorGeneric"));
      setConfirmCancel(false);
    });

  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-2" disabled={pending}>
        <legend className="mb-1 text-sm font-semibold">{t("moveTo")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map(({ status: s, icon: Icon }) => {
            const current = s === status;
            return (
              <Button
                key={s}
                type="button"
                variant={current ? "default" : "outline"}
                aria-pressed={current}
                className={cn("h-auto min-h-14 flex-col gap-1 px-2 py-2 text-center whitespace-normal", current && "pointer-events-none")}
                onClick={() => move(s)}
              >
                <Icon className="size-5" aria-hidden />
                {tStatus(s)}
              </Button>
            );
          })}
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {confirmCancel ? (
        <div className="grid gap-2 rounded-md border border-destructive/40 p-3">
          <p className="text-sm">{t("cancelConfirm")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmCancel(false)} disabled={pending}>
              {t("keep")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => move("cancelled")} disabled={pending}>
              {t("cancelVisit")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="ghost" className="justify-self-start text-destructive" onClick={() => setConfirmCancel(true)}>
          <X aria-hidden />
          {t("cancelVisit")}
        </Button>
      )}
    </div>
  );
}
