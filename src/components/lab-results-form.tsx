"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { saveLabResults } from "@/actions/labs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LAB_FLAGS } from "@/server/validation";

type Row = { key: string; analyte: string; value: string; unit: string; reference_range: string; flag: string };

const ERROR_KEYS: Record<string, string> = {
  notAllowed: "errorNotAllowed",
  closed: "errorClosed",
  duplicate: "errorDuplicate",
  invalid: "errorInvalid",
};

const newRow = (analyte = ""): Row => ({
  key: crypto.randomUUID(),
  analyte,
  value: "",
  unit: "",
  reference_range: "",
  flag: "",
});

/**
 * Result lines for one lab order. A single-value test needs one line (its name
 * is filled in); a panel such as CBC gets a line per analyte. Saving completes
 * the order and sends the patient back to the doctor.
 */
export function LabResultsForm({ orderId, testName }: { orderId: string; testName: string }) {
  const t = useTranslations("lab");
  const router = useRouter();
  // Label ids must match between server and client render, so they come from useId, not the random row keys.
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(() => [newRow(testName)]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, field: keyof Omit<Row, "key">, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const results = rows.map((r) => ({
            analyte: r.analyte,
            value: r.value,
            unit: r.unit,
            reference_range: r.reference_range,
            flag: r.flag,
          }));
          const res = await saveLabResults({ orderId, results });
          if (res.ok) router.push("/lab");
          else setError(t(ERROR_KEYS[res.code] ?? "errorGeneric"));
        });
      }}
    >
      {rows.map((r, i) => (
        <fieldset key={r.key} className="grid gap-3 rounded-md border p-3">
          <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-semibold">
            <span>{t("line", { n: i + 1 })}</span>
          </legend>
          <div className="grid gap-2">
            <Label htmlFor={`${uid}-analyte-${i}`}>{t("analyte")}</Label>
            <Input
              id={`${uid}-analyte-${i}`}
              value={r.analyte}
              onChange={(e) => update(r.key, "analyte", e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-value-${i}`}>{t("value")}</Label>
              <Input
                id={`${uid}-value-${i}`}
                value={r.value}
                onChange={(e) => update(r.key, "value", e.target.value)}
                maxLength={200}
                className="num"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-unit-${i}`}>{t("unit")}</Label>
              <Input
                id={`${uid}-unit-${i}`}
                value={r.unit}
                onChange={(e) => update(r.key, "unit", e.target.value)}
                maxLength={40}
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-range-${i}`}>{t("range")}</Label>
              <Input
                id={`${uid}-range-${i}`}
                value={r.reference_range}
                onChange={(e) => update(r.key, "reference_range", e.target.value)}
                maxLength={80}
                className="num"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-flag-${i}`}>{t("flag")}</Label>
              <select
                id={`${uid}-flag-${i}`}
                value={r.flag}
                onChange={(e) => update(r.key, "flag", e.target.value)}
                className="h-12 w-full min-w-0 rounded-md border border-input bg-card px-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="">–</option>
                {LAB_FLAGS.map((f) => (
                  <option key={f} value={f}>
                    {t(`flags.${f}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 justify-self-start text-destructive"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            >
              <Trash2 aria-hidden />
              {t("removeLine", { n: i + 1 })}
            </Button>
          ) : null}
        </fieldset>
      ))}

      {rows.length < 30 ? (
        <Button type="button" variant="outline" className="h-12" onClick={() => setRows((rs) => [...rs, newRow()])}>
          <Plus aria-hidden />
          {t("addLine")}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-12" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
