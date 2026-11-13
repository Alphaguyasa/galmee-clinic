"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { ReceiptPreview, type ReceiptLine } from "@/components/galmee/receipt-preview";
import { Button } from "@/components/ui/button";

/** The visit's 58 mm receipt with a print button; print CSS sends only the receipt to the printer. */
export function VisitReceipt(props: {
  tenantName: string;
  title: string;
  dateLabel: string;
  lines: ReceiptLine[];
  totals: { label: string; amount: string }[];
  footer: string;
}) {
  const t = useTranslations("visit");
  return (
    <div className="grid gap-3">
      <ReceiptPreview {...props} />
      <Button type="button" variant="outline" className="h-12 w-full" onClick={() => window.print()}>
        <Printer aria-hidden />
        {t("receiptPrint")}
      </Button>
    </div>
  );
}
