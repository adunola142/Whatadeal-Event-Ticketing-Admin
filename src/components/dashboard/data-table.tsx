import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Building2, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TableCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border border-[#E9EDF2] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type SegmentTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: SegmentTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-[12px] border border-[#E9EDF2] bg-white p-1",
        className,
      )}
      role="tablist"
      aria-label="Status filters"
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              active
                ? "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "bg-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-white/20 text-primary-foreground" : "bg-[#F1F5F9] text-[#475569]",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TableToolbar({
  left,
  right,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#E9EDF2] px-4 py-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}

export function TableSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full md:w-[280px]", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

export const TableFilterButton = forwardRef<
  HTMLButtonElement,
  {
    onClick?: () => void;
    active?: boolean;
    label?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, active, label = "Filter", className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-11 rounded-[10px] border-[#E9EDF2] bg-white px-3.5 text-[13px] font-medium text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]",
        active && "border-primary/30 bg-primary/5 text-primary",
        className,
      )}
      aria-pressed={active}
      {...props}
    >
      <Filter className="size-4" />
      {label}
    </Button>
  );
});
TableFilterButton.displayName = "TableFilterButton";

export function TableEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-[14px] bg-[#F3EFEA] text-[#6B7280]">
        {icon ?? <Building2 className="size-5" />}
      </div>
      <h3 className="font-display text-[16px] font-semibold text-[#111827]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[14px] leading-5 text-[#6B7280]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function pageItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push("…");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "results",
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);
  const items = pageItems(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[#E9EDF2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-[13px] text-[#64748B]">
        Showing <span className="font-medium text-[#334155]">{start}–{end}</span> of{" "}
        <span className="font-medium text-[#334155]">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E9EDF2] bg-white text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        {items.map((item, i) =>
          item === "…" ? (
            <span key={`e-${i}`} className="px-1 text-[13px] text-[#94A3B8]">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === safePage ? "page" : undefined}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[13px] font-medium transition-colors",
                item === safePage
                  ? "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  : "border border-[#E9EDF2] bg-white text-[#334155] hover:bg-[#F8FAFC]",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E9EDF2] bg-white text-[#334155] transition-colors hover:bg-[#F8FAFC] disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
