import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Ticket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard, StatCard } from "@/components/dashboard/page";
import { EventStatusBadge } from "@/components/dashboard/status";
import { QuickActionsCard, ORG_QUICK_ACTIONS } from "@/components/dashboard/overview";
import { apiGet, apiGetList } from "@/lib/api";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import type { EventItem } from "@/lib/types";

interface Organization {
  id: string;
  name: string;
  memberRole?: string;
}

interface OrgStats {
  totalEvents: number;
  activeEvents: number;
  pendingApproval: number;
  totalRevenue: number;
  totalTransactions: number;
  totalTicketsSold: number;
}

/** Overview for organization admins: only their organization's numbers and actions. */
export function OrgOverview() {
  const orgsQuery = useQuery({
    queryKey: ["my-organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations/my"),
    retry: false,
    staleTime: 60_000,
  });
  const org = orgsQuery.data?.[0];

  const statsQuery = useQuery({
    queryKey: ["dashboard", "org", org?.id],
    queryFn: () => apiGet<OrgStats>(`/api/v1/dashboard/org/${org!.id}`),
    enabled: !!org?.id,
    retry: false,
  });

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGetList<EventItem>("/api/v1/events", { limit: 100 }),
    retry: false,
  });

  const stats = statsQuery.data;
  const value = (n: number | undefined, render: (v: number) => string) => (stats ? render(n ?? 0) : "—");

  const now = Date.now();
  const upcoming = (eventsQuery.data ?? [])
    .filter((e) => new Date(e.endDate ?? e.endsAt ?? 0).getTime() >= now)
    .sort((a, b) => new Date(a.startDate ?? a.startsAt ?? 0).getTime() - new Date(b.startDate ?? b.startsAt ?? 0).getTime())
    .slice(0, 5);

  const error = orgsQuery.error ?? statsQuery.error;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        description={
          org
            ? `Here's what's happening with ${org.name}.`
            : orgsQuery.isLoading
              ? "Loading your organization..."
              : "Your account is not linked to an organization yet."
        }
      />

      {error ? (
        <div className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#991B1B]">
          {error instanceof Error ? error.message : "Could not load your organization's data."}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross sales"
          value={value(stats?.totalRevenue, formatNaira)}
          icon={<Wallet />}
          iconTone="primary"
        />
        <StatCard
          label="Tickets sold"
          value={value(stats?.totalTicketsSold, formatNumber)}
          icon={<Ticket />}
          iconTone="violet"
        />
        <StatCard
          label="My events"
          value={value(stats?.totalEvents, formatNumber)}
          hint={stats ? `${formatNumber(stats.activeEvents ?? 0)} active` : undefined}
          icon={<CalendarDays />}
          iconTone="success"
        />
        <StatCard
          label="Pending approval"
          value={value(stats?.pendingApproval, formatNumber)}
          hint="Awaiting Whatadeal review"
          icon={<Clock3 />}
          iconTone="info"
        />
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <SectionCard
          title="Upcoming events"
          description="Your next events and their approval status"
          action={
            <Button asChild variant="ghost" size="sm" className="-mr-2 h-7 gap-1 px-2 text-xs text-muted-foreground">
              <Link to="/events">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <CheckCircle2 className="size-5" />
              </span>
              <p className="text-sm font-medium text-[#111827]">No upcoming events</p>
              <p className="text-xs text-[#6B7280]">Create an event and submit it for approval to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0EBE4]">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827]">{e.title ?? e.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                      {formatDate(e.startDate ?? e.startsAt ?? "")}
                      {e.venue ? ` · ${e.venue}` : ""}
                    </p>
                  </div>
                  <EventStatusBadge event={e} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <QuickActionsCard actions={ORG_QUICK_ACTIONS} />
      </div>
    </div>
  );
}
