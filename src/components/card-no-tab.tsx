import { cn } from "@/lib/utils";

/** The manila folder tab with the patient's card number: the clinic's one bold thing. */
export function CardNoTab({ cardNo, label, className }: { cardNo: number; label: string; className?: string }) {
  return (
    <span
      aria-label={`${label} ${cardNo}`}
      className={cn(
        "num inline-flex h-7 min-w-14 items-center justify-center rounded-t-md rounded-b-sm bg-manila px-2 text-lg leading-none font-bold text-foreground",
        className,
      )}
    >
      {cardNo}
    </span>
  );
}
