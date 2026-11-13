"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ReceiptText } from "lucide-react";
import { closeAndBill } from "@/actions/visits";
import { BirrInput } from "@/components/galmee/birr-input";
import { Sheet } from "@/components/galmee/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { PAY_METHODS } from "@/server/validation";

const ERROR_KEYS: Record<string, string> = {
  closed: "errorClosed",
  labPending: "billErrorLab",
  overpayment: "billErrorOver",
  balanceDue: "billErrorBalance",
  reference: "billErrorReference",
  amount: "billErrorAmount",
};

/** Parse what the cashier typed, for the live "left on credit" line only; the database does the real math. */
function typedAmount(raw: string): number | null {
  const v = raw.replace(/,/g, "").trim();
  return /^\d{1,9}(\.\d{1,2})?$/.test(v) ? Number(v) : null;
}

/**
 * Close the visit and take the money: paid now by cash or Telebirr, any rest
 * goes to the patient's credit (owner or manager only, the database enforces it).
 */
export function CloseVisit({
  visitId,
  total,
  canCredit,
  labPending,
}: {
  visitId: string;
  total: number;
  canCredit: boolean;
  labPending: boolean;
}) {
  const t = useTranslations("visit");
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(total.toFixed(2));
  const [method, setMethod] = useState<(typeof PAY_METHODS)[number]>("cash");
  const [reference, setReference] = useState("");
  const [due, setDue] = useState("");
  const [closeRef] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amount = typedAmount(paid);
  const left = amount === null ? null : Math.round((total - amount) * 100) / 100;
  const over = left !== null && left < 0;
  const credit = left !== null && left > 0;

  const openSheet = () => {
    setPaid(total.toFixed(2));
    setError(null);
    setOpen(true);
  };

  return (
    <>
      {labPending ? <p className="text-sm text-muted-foreground">{t("billLabWaiting")}</p> : null}
      <Button type="button" className="h-12 w-full" disabled={labPending} onClick={openSheet}>
        <ReceiptText aria-hidden />
        {t("closeAndBill")}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("closeAndBill")} closeLabel={t("billCancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const r = await closeAndBill({ visitId, paid, method, reference, due: credit ? due : "", closeRef });
              if (r.ok) setOpen(false);
              else setError(t(ERROR_KEYS[r.code] ?? "errorGeneric"));
            });
          }}
        >
          <div className="flex items-baseline justify-between rounded-md bg-band px-3 py-2">
            <span className="font-semibold">{t("total")}</span>
            <span className="num text-xl font-bold">{formatBirr(total, locale)}</span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paid">{t("billPaid")}</Label>
            <BirrInput
              id="paid"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              unitLabel={t("birr")}
              aria-invalid={amount === null || over}
              aria-describedby="left-line"
              required
            />
            <p id="left-line" className="text-sm" aria-live="polite">
              {amount === null ? (
                <span className="text-destructive">{t("billErrorAmount")}</span>
              ) : over ? (
                <span className="text-destructive">{t("billErrorOver")}</span>
              ) : credit ? (
                <span className="font-medium text-warning">
                  {t("billLeft", { amount: formatBirr(left, locale) })}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("billPaidInFull")}</span>
              )}
            </p>
          </div>

          {amount !== null && amount > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{t("billMethod")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <label
                    key={m}
                    className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card font-medium has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="size-4 accent-primary"
                    />
                    {t(`billMethods.${m}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {method === "telebirr" && amount !== null && amount > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="reference">{t("billReference")}</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                maxLength={60}
                className="num uppercase"
                required
              />
            </div>
          ) : null}

          {credit ? (
            canCredit ? (
              <div className="grid gap-2">
                <Label htmlFor="due">
                  {t("billDue")} <span className="font-normal text-muted-foreground">{t("billOptional")}</span>
                </Label>
                <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            ) : (
              <p className="rounded-md border border-warning bg-warning/10 p-3 text-sm">{t("billErrorBalance")}</p>
            )
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-12" disabled={pending || amount === null || over || (credit && !canCredit)}>
            {pending ? t("billSaving") : credit ? t("billConfirmCredit") : t("billConfirm")}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
