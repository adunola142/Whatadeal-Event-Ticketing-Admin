import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, CheckCircle2, Ticket, Wallet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, StatCard } from "@/components/dashboard/page";
import {
  QuickActionsCard,
  RecentActivityCard,
  RevenueChartCard,
} from "@/components/dashboard/overview";
import { buildDashboardData, type DashboardPeriod } from "@/lib/dashboard";
import { apiGet, apiGetList } from "@/lib/api";
import { useCurrentUser } from "@/lib/hooks";
import { OrgOverview } from "@/components/dashboard/org-overview";
import { formatNaira, formatNumber } from "@/lib/format";
import type { EventItem, Organization, Transaction } from "@/lib/types";

function Overview() {
  const { user, isSuperAdmin } = useCurrentUser();
  if (!user) return null;
  return isSuperAdmin ? <AdminOverview /> : <OrgOverview />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Whatadeal Ticketing Admin" },
      {
        name: "description",
        content: "Platform-wide ticket sales, approvals and POS activity at a glance.",
      },
    ],
  }),
  component: Overview,
});

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function AdminOverview() {
  const { isSuperAdmin } = useCurrentUser();
  const [period, setPeriod] = useState<DashboardPeriod>(30);
  const now = useMemo(() => new Date(), []);

  const adminStatsQuery = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: () => apiGet<Record<string, unknown>>("/api/v1/dashboard/admin"),
    enabled: isSuperAdmin,
    retry: false,
    staleTime: 60_000,
  });

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations"),
    enabled: isSuperAdmin,
    retry: false,
    staleTime: 60_000,
  });

  const eventsQuery = useQuery({
    queryKey: ["events", "overview"],
    queryFn: () => apiGetList<EventItem>("/api/v1/events"),
    retry: false,
    staleTime: 60_000,
  });

  const transactions: Transaction[] = [];
  const organizations = organizationsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const stats = adminStatsQuery.data ?? {};

  const data = useMemo(() => {
    const base = buildDashboardData({ transactions, organizations, period, now });

    const grossSales =
      num(stats["grossSales"] ?? stats["totalRevenue"] ?? stats["revenue"] ?? stats["totalSales"], base.kpis.grossSales);
    const ticketsSold =
      num(stats["ticketsSold"] ?? stats["totalTickets"] ?? stats["tickets"] ?? stats["totalTicketsSold"], base.kpis.ticketsSold);
    const orgCount =
      num(stats["organizations"] ?? stats["totalOrganizations"] ?? stats["organizationCount"], organizations.length || base.kpis.organizations);
    const activeOrganizations =
      num(
        stats["activeOrganizations"] ?? stats["activeOrganizationCount"],
        organizations.filter((o) => (o as any).status === "active" || (o as any).isActive === true).length || base.kpis.activeOrganizations,
      );
    const successRate =
      num(stats["paymentSuccessRate"] ?? stats["successRate"] ?? stats["paymentSuccess"], base.kpis.successRate);
    const failedPayments =
      num(stats["failedPayments"] ?? stats["failedTransactions"] ?? stats["failed"], base.kpis.failedPayments);

    const series = Array.isArray(stats["salesSeries"])
      ? (stats["salesSeries"] as any[])
      : Array.isArray(stats["revenueSeries"])
        ? (stats["revenueSeries"] as any[])
        : Array.isArray(stats["chart"])
          ? (stats["chart"] as any[])
          : null;

    const points =
      series && series.length
        ? series.map((p, i) => ({
            key: String(p?.key ?? p?.date ?? p?.day ?? i),
            label: String(p?.label ?? p?.date ?? p?.day ?? ""),
            fullLabel: String(p?.fullLabel ?? p?.label ?? p?.date ?? p?.day ?? ""),
            revenue: num(p?.revenue ?? p?.amount ?? p?.value ?? p?.total ?? 0),
            tickets: num(p?.tickets ?? p?.quantity ?? 0),
            ok: num(p?.ok ?? p?.successful ?? 0),
            failed: num(p?.failed ?? 0),
            successRate: num(p?.successRate ?? 0),
            isPeak: i === series.length - 1 && series.length > 1,
          }))
        : base.points;

    const recentRaw = Array.isArray(stats["recentActivity"])
      ? (stats["recentActivity"] as any[])
      : Array.isArray(stats["activities"])
        ? (stats["activities"] as any[])
        : null;

    const activity = recentRaw?.length
      ? recentRaw.slice(0, 6).map((a, i) => ({
          id: String(a?.id ?? i),
          kind: String(a?.kind ?? a?.type ?? "").includes("org") ? ("organization" as const) : ("payment" as const),
          title: String(a?.title ?? a?.action ?? a?.message ?? "Activity"),
          detail: String(a?.detail ?? a?.description ?? a?.target ?? ""),
          at: String(a?.at ?? a?.createdAt ?? a?.timestamp ?? new Date().toISOString()),
        }))
      : [
          ...organizations.slice(0, 3).map((o) => ({
            id: `org-${o.id}`,
            kind: "organization" as const,
            title: "Organization",
            detail: (o as any).name ?? "—",
            at: String((o as any).createdAt ?? (o as any).joinedAt ?? new Date().toISOString()),
          })),
          ...events.slice(0, 3).map((e) => ({
            id: `ev-${e.id}`,
            kind: "payment" as const,
            title: "Event",
            detail: (e as any).title ?? (e as any).name ?? "—",
            at: String((e as any).createdAt ?? (e as any).startDate ?? new Date().toISOString()),
          })),
        ]
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 4);

    return {
      ...base,
      points,
      activity,
      totalRevenue: grossSales || base.totalRevenue,
      now,
      kpis: {
        ...base.kpis,
        grossSales,
        ticketsSold,
        organizations: orgCount,
        activeOrganizations,
        successRate,
        failedPayments,
      },
    };
  }, [transactions, organizations, events, period, now, stats]);

  const { kpis } = data;
  const loading = adminStatsQuery.isLoading || organizationsQuery.isLoading;
  const loadError = adminStatsQuery.error ?? organizationsQuery.error;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        description="Here's what's happening across your platform."
        actions={
          <Select
            value={String(period)}
            onValueChange={(value) => setPeriod(Number(value) as DashboardPeriod)}
          >
            <SelectTrigger className="h-10 w-[158px] rounded-xl border-border/70 bg-card shadow-card">
              <CalendarDays className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {loadError ? (
        <div className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#991B1B]">
          {loadError instanceof Error ? loadError.message : "Could not load dashboard data."}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross Sales"
          value={loading && !adminStatsQuery.data ? "—" : formatNaira(kpis.grossSales)}
          icon={<Wallet />}
          iconTone="primary"
        />
        <StatCard
          label="Tickets Sold"
          value={loading && !adminStatsQuery.data ? "—" : formatNumber(kpis.ticketsSold)}
          icon={<Ticket />}
          iconTone="violet"
        />
        <StatCard
          label="Organizations"
          value={loading && !organizationsQuery.data && !adminStatsQuery.data ? "—" : formatNumber(kpis.organizations)}
          icon={<Building2 />}
          iconTone="success"
        />
        <StatCard
          label="Payment Success"
          value={loading && !adminStatsQuery.data ? "—" : `${kpis.successRate.toFixed(1)}%`}
          icon={<CheckCircle2 />}
          iconTone="info"
        />
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <RevenueChartCard
          points={data.points}
          period={period}
          onPeriodChange={setPeriod}
          totalRevenue={data.totalRevenue}
        />

        <div className="flex flex-col gap-6">
          <QuickActionsCard />
          <RecentActivityCard activity={data.activity} now={data.now} />
        </div>
      </div>
    </div>
  );
}
