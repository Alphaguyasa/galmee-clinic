"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Undo2 } from "lucide-react";
import { addLine, removeLine } from "@/actions/visits";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string; priceText: string };
type Line = { id: string; serviceName: string; qty: number; totalText: string };

/** Billable services on an open visit: pick from the price list, take back a mistake. */
export function VisitServices({
  visitId,
  options,
  lines,
  totalText,
}: {
  visitId: string;
  options: Option[];
  lines: Line[];
  totalText: string;
}) {
  const t = useTranslations("visit");
  const [serviceId, setServiceId] = useState("");
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fail = (code: string) => setError(t(code === "closed" ? "errorClosed" : "errorGeneric"));

  return (
    <div className="grid gap-4">
      {lines.length > 0 ? (
        <ListSheet aria-label={t("services")}>
          {lines.map((l) => (
            <ListRow
              key={l.id}
              title={l.serviceName}
              sub={l.qty !== 1 ? <span className="num">× {l.qty}</span> : undefined}
              right={
                <div className="flex items-center gap-1">
                  <span className="num font-semibold">{l.totalText}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={pending}
                    aria-label={t("removeLine", { name: l.serviceName })}
                    onClick={() =>
                      start(async () => {
                        setError(null);
                        const r = await removeLine({ visitId, lineId: l.id });
                        if (!r.ok) fail(r.code);
                      })
                    }
                  >
                    <Undo2 aria-hidden />
                  </Button>
                </div>
              }
            />
          ))}
        </ListSheet>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noServices")}</p>
      )}

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-semibold">{t("total")}</span>
        <span className="num text-xl font-bold" aria-live="polite">
          {totalText}
        </span>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noPriceList")}</p>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!serviceId) return;
            start(async () => {
              setError(null);
              const r = await addLine({ visitId, serviceId, clientRef });
              if (r.ok) {
                setServiceId("");
                setClientRef(crypto.randomUUID());
              } else fail(r.code);
            });
          }}
        >
          <Label htmlFor="service">{t("addService")}</Label>
          <div className="flex gap-2">
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="h-12 w-0 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <option value="">{t("chooseService")}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.priceText}
                </option>
              ))}
            </select>
            <Button type="submit" size="icon" disabled={pending || !serviceId} aria-label={t("addService")}>
              <Plus aria-hidden />
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
