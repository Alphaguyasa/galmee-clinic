"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HandCoins } from "lucide-react";
import { payBalance } from "@/actions/repayments";
import { BirrInput } from "@/components/galmee/birr-input";
import { Sheet } from "@/components/galmee/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultLocale, isLocale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { PAY_METHODS } from "@/server/validation";

const ERROR_KEYS: Record<string, string> = {
  tooMuch: "payErrorTooMuch",
  nothingOwed: "payErrorNothing",
  amount: "payErrorAmount",
  reference: "payErrorReference",
};

function typedAmount(raw: string): number | null {
  const v = raw.replace(/,/g, "").trim();
  return /^\d{1,9}(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? Number(v) : null;
}

/** A patient pays off all or part of what they owe, by cash or Telebirr. */
export function PayBalance({ patientId, owed }: { patientId: string; owed: number }) {
  const t = useTranslations("card");
  const tVisit = useTranslations("visit");
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(owed.toFixed(2));
  const [method, setMethod] = useState<(typeof PAY_METHODS)[number]>("cash");
  const [reference, setReference] = useState("");
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const value = typedAmount(amount);
  const over = value !== null && value > owed;
  const left = value === null || over ? null : Math.round((owed - value) * 100) / 100;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full"
        onClick={() => {
          setAmount(owed.toFixed(2));
          setError(null);
          setDone(null);
          setClientRef(crypto.randomUUID());
          setOpen(true);
        }}
      >
        <HandCoins aria-hidden />
        {t("pay")}
      </Button>
      {done ? (
        <p role="status" className="text-sm font-medium">
          {done}
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("pay")} closeLabel={tVisit("billCancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const r = await payBalance({ patientId, amount, method, reference, clientRef });
              if (r.ok) {
                setDone(t("paidDone", { amount: formatBirr(value ?? 0, locale) }));
                setOpen(false);
              } else setError(t(ERROR_KEYS[r.code] ?? "payErrorGeneric"));
            });
          }}
        >
          <div className="flex items-baseline justify-between rounded-md bg-band px-3 py-2">
            <span className="font-semibold">{t("balance")}</span>
            <span className="num text-xl font-bold">{formatBirr(owed, locale)}</span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pay-amount">{t("payAmount")}</Label>
            <BirrInput
              id="pay-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              unitLabel={tVisit("birr")}
              aria-invalid={value === null || over}
              aria-describedby="pay-left"
              required
            />
            <p id="pay-left" className="text-sm" aria-live="polite">
              {value === null ? (
                <span className="text-destructive">{t("payErrorAmount")}</span>
              ) : over ? (
                <span className="text-destructive">{t("payErrorTooMuch")}</span>
              ) : left && left > 0 ? (
                <span className="font-medium text-warning">{t("payLeft", { amount: formatBirr(left, locale) })}</span>
              ) : (
                <span className="text-muted-foreground">{t("payClears")}</span>
              )}
            </p>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{tVisit("billMethod")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <label
                  key={m}
                  className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card font-medium has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input
                    type="radio"
                    name="pay-method"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="size-4 accent-primary"
                  />
                  {tVisit(`billMethods.${m}`)}
                </label>
              ))}
            </div>
          </fieldset>

          {method === "telebirr" ? (
            <div className="grid gap-2">
              <Label htmlFor="pay-reference">{tVisit("billReference")}</Label>
              <Input
                id="pay-reference"
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

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-12" disabled={pending || value === null || over}>
            {pending ? tVisit("billSaving") : t("payConfirm")}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
