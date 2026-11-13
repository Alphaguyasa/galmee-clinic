"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical } from "lucide-react";
import { requestLabTest } from "@/actions/labs";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string; priceText: string };
type Order = { id: string; testName: string; note: string | null; status: "requested" | "completed" | "cancelled" };

const ERROR_KEYS: Record<string, string> = {
  notAllowed: "labErrorNotAllowed",
  closed: "errorClosed",
  notFound: "labErrorNotFound",
};

/**
 * Lab tests on a visit. The doctor orders a test from the lab price list: it is
 * billed on the visit and the patient moves to the lab queue.
 */
export function VisitLabs({
  visitId,
  orders,
  options,
  canRequest,
}: {
  visitId: string;
  orders: Order[];
  options: Option[];
  canRequest: boolean;
}) {
  const t = useTranslations("visit");
  const [serviceId, setServiceId] = useState("");
  const [note, setNote] = useState("");
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {orders.length > 0 ? (
        <ListSheet aria-label={t("labs")}>
          {orders.map((o) => (
            <ListRow
              key={o.id}
              title={o.testName}
              sub={o.note ?? undefined}
              right={
                <span
                  className={
                    o.status === "requested"
                      ? "rounded-sm bg-warning/15 px-2 py-0.5 text-sm font-medium text-warning"
                      : "rounded-sm bg-band px-2 py-0.5 text-sm font-medium"
                  }
                >
                  {t(`labStatus.${o.status}`)}
                </span>
              }
            />
          ))}
        </ListSheet>
      ) : (
        <p className="text-sm text-muted-foreground">{t("labsNone")}</p>
      )}

      {canRequest ? (
        options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("labsNoPriceList")}</p>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!serviceId) return;
              start(async () => {
                setError(null);
                const r = await requestLabTest({ visitId, serviceId, note, clientRef });
                if (r.ok) {
                  setServiceId("");
                  setNote("");
                  setClientRef(crypto.randomUUID());
                } else setError(t(ERROR_KEYS[r.code] ?? "errorGeneric"));
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="lab-test">{t("labRequest")}</Label>
              <select
                id="lab-test"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="h-12 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="">{t("labChoose")}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.priceText}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lab-note">
                {t("labNote")} <span className="font-normal text-muted-foreground">{t("billOptional")}</span>
              </Label>
              <Input id="lab-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </div>
            <Button type="submit" className="h-12" disabled={pending || !serviceId}>
              <FlaskConical aria-hidden />
              {pending ? t("billSaving") : t("labSend")}
            </Button>
          </form>
        )
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
