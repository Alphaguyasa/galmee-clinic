"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { ReceiptPreview, type ReceiptLine, type ReceiptWidth } from "@/components/galmee/receipt-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WIDTH_KEY = "galmee_receipt_width";
const WIDTHS: readonly ReceiptWidth[] = [58, 80];
const listeners = new Set<() => void>();
/** Used only when the browser refuses storage. */
let memory: ReceiptWidth | null = null;

/** The paper width is the clinic's printer, so it is remembered on this device. */
function readWidth(): ReceiptWidth {
  try {
    return window.localStorage.getItem(WIDTH_KEY) === "80" ? 80 : 58;
  } catch {
    return 58;
  }
}

function saveWidth(width: ReceiptWidth) {
  try {
    window.localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    // Private mode or blocked storage: the choice lasts until the page closes.
    memory = width;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The visit's thermal receipt (58 or 80 mm paper) with a print button; print CSS sends only the receipt to the printer. */
export function VisitReceipt(props: {
  tenantName: string;
  title: string;
  dateLabel: string;
  lines: ReceiptLine[];
  totals: { label: string; amount: string }[];
  footer: string;
}) {
  const t = useTranslations("visit");
  const width = useSyncExternalStore(
    subscribe,
    () => memory ?? readWidth(),
    () => 58 as ReceiptWidth,
  );
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("receiptWidth")}>
        <span className="text-sm text-muted-foreground">{t("receiptWidth")}</span>
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={w === width}
            onClick={() => saveWidth(w)}
            className={cn(
              "num h-10 min-w-16 rounded-md border px-3 text-sm font-semibold",
              w === width ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {t(w === 80 ? "receiptWidth80" : "receiptWidth58")}
          </button>
        ))}
      </div>
      <ReceiptPreview {...props} width={width} />
      <Button type="button" variant="outline" className="h-12 w-full" onClick={() => window.print()}>
        <Printer aria-hidden />
        {t("receiptPrint")}
      </Button>
    </div>
  );
}
