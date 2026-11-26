import { getTranslations } from "next-intl/server";
import { clinicExportSheets } from "@/lib/clinic-export";
import { parseGregorian } from "@/lib/ethiopian-date";
import { buildXlsx } from "@/lib/xlsx";
import { EXPORT_ROW_CAP, exportClinicData } from "@/server/dal/export";

/** Every record of this clinic as one Excel workbook. Owner only (checked in the DAL). */
export async function GET() {
  const [result, t] = await Promise.all([exportClinicData(), getTranslations()]);
  if (!result.ok) {
    return new Response(t("export.error"), {
      status: result.code === "forbidden" ? 403 : 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }

  const now = new Date();
  const file = buildXlsx(clinicExportSheets(result.data, (key, values) => t(key, values), now.toISOString(), EXPORT_ROW_CAP));
  const { year, month, day } = parseGregorian(now);
  const stamp = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return new Response(file.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="galmee-clinic-all-data-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
