import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-[#F0EBE4] overflow-hidden rounded-[12px] border border-[#E8E2DA] bg-white">
      {children}
    </div>
  );
}

export function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FDEEE2] text-[#C2410C]">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
        <p className={mono ? "truncate break-all font-mono text-[12.5px] text-[#111827]" : "truncate text-[14px] font-medium text-[#111827]"}>
          {value}
        </p>
      </div>
    </div>
  );
}
