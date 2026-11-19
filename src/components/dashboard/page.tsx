import { useId, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  eyebrowTone = "primary",
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  eyebrowTone?: "primary" | "muted";
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p
            className={cn(
              "mb-1.5 text-xs font-semibold tracking-[0.14em] uppercase",
              eyebrowTone === "muted" ? "text-muted-foreground" : "text-primary",
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold text-foreground md:text-[2.1rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type StatTone = "primary" | "violet" | "success" | "info" | "ink";

const iconToneClasses: Record<StatTone, string> = {
  primary: "bg-primary-soft text-primary",
  violet: "bg-violet-soft text-violet",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  ink: "bg-ink/10 text-ink",
};

const sparkToneClasses: Record<StatTone, string> = {
  primary: "text-primary",
  violet: "text-violet",
  success: "text-success",
  info: "text-info",
  ink: "text-ink",
};

const accentBarClasses: Record<StatTone, string> = {
  primary: "bg-gradient-to-b from-[#F97316] to-[#EA580C] shadow-[2px_0_10px_rgba(249,115,22,0.35)]",
  violet: "bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] shadow-[2px_0_10px_rgba(139,92,246,0.35)]",
  success: "bg-gradient-to-b from-[#10B981] to-[#059669] shadow-[2px_0_10px_rgba(16,185,129,0.35)]",
  info: "bg-gradient-to-b from-[#3B82F6] to-[#2563EB] shadow-[2px_0_10px_rgba(59,130,246,0.35)]",
  ink: "bg-gradient-to-b from-[#334155] to-[#0F172A] shadow-[2px_0_10px_rgba(15,23,42,0.28)]",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  iconTone = "primary",
  delta,
  deltaSuffix = "%",
  sparkline,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "ink" | "brand";
  iconTone?: StatTone;
  delta?: number;
  deltaSuffix?: string;
  sparkline?: number[];
  /** Show a 3D colored accent strip on the left (default true for default tone). */
  accent?: boolean;
  className?: string;
}) {
  const dark = tone !== "default";
  const showAccent = accent ?? tone === "default";

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden rounded-[16px] border p-5 pl-6 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-shadow duration-[180ms]",
        tone === "ink" && "border-transparent bg-ink-gradient text-ink-foreground",
        tone === "brand" && "border-transparent bg-brand-gradient text-primary-foreground",
        tone === "default" && "border-[#E9EDF2] bg-white",
        className,
      )}
    >
      {showAccent ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-[5px] rounded-l-[16px]",
            dark ? "bg-white/25 shadow-[2px_0_8px_rgba(255,255,255,0.12)]" : accentBarClasses[iconTone],
          )}
        />
      ) : null}
      <div className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        {icon && (
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] [&_svg]:size-[18px]",
              dark ? "bg-background/15" : iconToneClasses[iconTone],
            )}
          >
            {icon}
          </span>
        )}
        {sparkline && sparkline.length > 1 ? (
          <Sparkline
            data={sparkline}
            className={cn(
              "h-9 w-24 opacity-90",
              dark ? "text-primary" : sparkToneClasses[iconTone],
            )}
          />
        ) : null}
      </div>
      <p
        className={cn(
          "relative mt-4 text-xs font-medium",
          dark ? "opacity-75" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <div className="relative mt-1 flex flex-wrap items-end justify-between gap-2">
        <p className="font-display text-[1.55rem] leading-tight font-semibold tracking-tight tabular">
          {value}
        </p>
        {delta !== undefined ? <DeltaBadge value={delta} suffix={deltaSuffix} inverted={dark} /> : null}
      </div>
      {hint ? (
        <p className={cn("relative mt-1 text-xs", dark ? "opacity-70" : "text-muted-foreground")}>
          {hint}
        </p>
      ) : null}
    </Card>
  );
}

export function DeltaBadge({
  value,
  suffix = "%",
  inverted = false,
}: {
  value: number;
  suffix?: string;
  inverted?: boolean;
}) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const formatted =
    Math.abs(value) >= 10 ? Math.round(Math.abs(value)).toString() : Math.abs(value).toFixed(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular",
        inverted
          ? "bg-background/15 text-background"
          : up
            ? "bg-success-soft text-success"
            : "bg-destructive-soft text-destructive",
      )}
    >
      <Icon className="size-3" />
      {up ? "+" : "−"}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Compact inline trend line used inside the KPI cards. Deliberately SVG-only so
 * four sparklines stay cheap to render alongside the main revenue chart.
 */
export function Sparkline({
  data,
  className,
  strokeWidth = 2,
}: {
  data: number[];
  className?: string;
  strokeWidth?: number;
}) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const values = data.length > 1 ? data : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 120;
  const height = 36;
  const step = width / (values.length - 1);
  const coords = values.map(
    (value, index) => [index * step, height - 4 - ((value - min) / span) * (height - 8)] as const,
  );
  const line = smoothPath(coords);
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1] ?? [width, height / 2];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />
    </svg>
  );
}

function smoothPath(coords: readonly (readonly [number, number])[]) {
  if (coords.length === 0) return "";
  if (coords.length === 1) {
    const [x, y] = coords[0]!;
    return `M${x},${y}`;
  }

  let path = `M${coords[0]![0]},${coords[0]![1]}`;
  for (let index = 0; index < coords.length - 1; index++) {
    const p0 = coords[index - 1] ?? coords[index]!;
    const p1 = coords[index]!;
    const p2 = coords[index + 1]!;
    const p3 = coords[index + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return path;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-[16px] border border-[#E9EDF2] bg-white p-0 shadow-[0_4px_16px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-[#E9EDF2] px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-base font-semibold tracking-tight text-[#111827]">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-xs text-[#6B7280]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </Card>
  );
}

export function Restricted({ what }: { what: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold">Whatadeal admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {what} is only available to Whatadeal Super Admins. Organizer accounts can't see this
          area.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}

export function SuperAdminGate({ what, children }: { what: string; children: ReactNode }) {
  const { user, isSuperAdmin } = useCurrentUser();
  if (!user) return null;
  if (!isSuperAdmin) return <Restricted what={what} />;
  return <>{children}</>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr className="hover:bg-transparent">
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-[#6B7280]">
        {children}
      </td>
    </tr>
  );
}

export function EventThumb({
  hue,
  url,
  className,
}: {
  hue: number;
  url?: string | undefined;
  className?: string | undefined;
}) {
  if (url) return <img src={url} alt="" className={cn("rounded-lg object-cover", className)} />;
  return (
    <div
      className={cn("rounded-lg", className)}
      // Event artwork placeholder: hue is per-event data, not a theme color.
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.72 0.16 ${hue}), oklch(0.42 0.14 ${(hue + 40) % 360}))`,
      }}
    />
  );
}
