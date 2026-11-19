import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatNaira, formatNairaCompact } from "@/lib/format";
import {
  formatActivityTime,
  type DashboardActivity,
  type DashboardPeriod,
  type DashboardPoint,
} from "@/lib/dashboard";

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

export function PeriodToggle({
  value,
  onChange,
  className,
}: {
  value: DashboardPeriod;
  onChange: (value: DashboardPeriod) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/70 bg-muted/50 p-0.5",
        className,
      )}
    >
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
            value === period.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

export function RevenueChartCard({
  points,
  period,
  onPeriodChange,
  totalRevenue,
}: {
  points: DashboardPoint[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  totalRevenue: number;
}) {
  const ticks = useMemo(() => {
    if (points.length <= 5) return points.map((point) => point.label);
    const indexes = [0, 0.25, 0.5, 0.75, 1];
    const labels = indexes.map(
      (fraction) => points[Math.round((points.length - 1) * fraction)]?.label ?? "",
    );
    return [...new Set(labels.filter(Boolean))];
  }, [points]);

  const dotEvery = Math.max(1, Math.ceil(points.length / 6));

  const dotRenderer = (props: {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: DashboardPoint;
  }) => {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null || !payload) return <g key={`dot-${index ?? 0}`} />;

    if (!payload.isPeak) {
      if ((index ?? 0) % dotEvery !== 0) return <g key={`dot-${index ?? 0}`} />;
      return (
        <circle
          key={`dot-${index ?? 0}`}
          cx={cx}
          cy={cy}
          r={3}
          fill="var(--color-card)"
          stroke="var(--color-revenue)"
          strokeWidth={2}
        />
      );
    }

    const label = formatNairaCompact(totalRevenue);
    const width = Math.max(54, label.length * 7 + 18);

    return (
      <g key={`peak-${payload.key}`}>
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="var(--color-revenue)"
          stroke="var(--color-card)"
          strokeWidth={2}
        />
        <g transform={`translate(${cx - width / 2}, ${cy - 38})`}>
          <rect width={width} height={24} rx={7} fill="var(--color-ink)" />
          <text
            x={width / 2}
            y={16}
            textAnchor="middle"
            fill="var(--color-ink-foreground)"
            fontSize={11}
            fontWeight={600}
          >
            {label}
          </text>
        </g>
      </g>
    );
  };

  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-elevated-lg transition-shadow duration-300 hover:shadow-elevated-lg">
      <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-primary/[0.08] blur-3xl" />

      <div className="relative flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <BarChart3 className="size-4" />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight">Sales Overview</h2>
        </div>
        <PeriodToggle value={period} onChange={onPeriodChange} />
      </div>

      <div className="relative flex min-h-[280px] flex-1 flex-col px-3 pt-3 pb-2 sm:px-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full min-h-[260px] w-full [&_.recharts-surface]:overflow-visible"
        >
          <AreaChart data={points} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                <stop offset="65%" stopColor="var(--color-revenue)" stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="4 6"
              strokeOpacity={0.8}
            />
            <XAxis
              dataKey="label"
              ticks={ticks}
              interval={0}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              width={46}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              allowDecimals={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              tickFormatter={(value: number) => {
                if (value === 0) return "0";
                if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
                if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                return String(value);
              }}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.18, 1)]}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_value, payload) => {
                    const point = payload?.[0]?.payload as DashboardPoint | undefined;
                    return point?.fullLabel ?? "";
                  }}
                  formatter={(value) => formatNaira(Number(value))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2.5}
              fill="url(#revenue-fill)"
              dot={dotRenderer}
              isAnimationActive={false}
              activeDot={{
                r: 5,
                fill: "var(--color-revenue)",
                stroke: "var(--color-card)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Card>
  );
}

type ActionTone = "primary" | "violet" | "info" | "success";

const actionToneClasses: Record<ActionTone, string> = {
  primary: "bg-primary-soft text-primary",
  violet: "bg-violet-soft text-violet",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
};

type QuickAction = {
  label: string;
  to: "/events/new" | "/events" | "/organizations" | "/transactions" | "/reports";
  icon: LucideIcon;
  tone: ActionTone;
};

export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { label: "Create event", to: "/events/new", icon: CalendarPlus, tone: "primary" },
  { label: "Organizations", to: "/organizations", icon: Building2, tone: "violet" },
  { label: "Transactions", to: "/transactions", icon: CreditCard, tone: "info" },
  { label: "Reports", to: "/reports", icon: BarChart3, tone: "success" },
];

export const ORG_QUICK_ACTIONS: QuickAction[] = [
  { label: "Create event", to: "/events/new", icon: CalendarPlus, tone: "primary" },
  { label: "My events", to: "/events", icon: CalendarDays, tone: "violet" },
  { label: "Transactions", to: "/transactions", icon: CreditCard, tone: "info" },
  { label: "Reports", to: "/reports", icon: BarChart3, tone: "success" },
];

export function QuickActionsCard({ actions = ADMIN_QUICK_ACTIONS }: { actions?: QuickAction[] }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-elevated">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">Quick Actions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Jump to the things you do most</p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Link to="/reports">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group/tile flex flex-col items-center gap-2 rounded-xl border border-transparent px-2 py-3 text-center transition-colors hover:border-border/70 hover:bg-muted/40"
          >
            <span
              className={cn(
                "grid size-10 place-items-center rounded-xl shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 group-hover/tile:-translate-y-0.5",
                actionToneClasses[action.tone],
              )}
            >
              <action.icon className="size-[18px]" />
            </span>
            <span className="text-[11px] leading-tight font-medium text-foreground">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function RecentActivityCard({
  activity,
  now,
}: {
  activity: DashboardActivity[];
  now: Date;
}) {
  return (
    <Card className="flex-1 gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-elevated">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The latest movement on the platform
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Link to="/audit">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {activity.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Activity will appear here as it happens.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {activity.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  item.kind === "payment" ? "bg-primary" : "bg-violet",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
                {formatActivityTime(item.at, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
