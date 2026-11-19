import { dayKey, formatDate, formatNaira, formatShortDate, relativeTime } from "./format";
import type { Organization, Transaction } from "./types";

const DAY = 86_400_000;

export type DashboardPeriod = 7 | 30 | 90;

export interface DashboardPoint {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  tickets: number;
  ok: number;
  failed: number;
  successRate: number;
  isPeak?: boolean;
}

export interface DashboardKpis {
  grossSales: number;
  ticketsSold: number;
  organizations: number;
  activeOrganizations: number;
  successRate: number;
  failedPayments: number;
  grossDelta: number;
  ticketsDelta: number;
  organizationsDelta: number;
  successDelta: number;
  grossSpark: number[];
  ticketsSpark: number[];
  organizationsSpark: number[];
  successSpark: number[];
}

export interface DashboardActivity {
  id: string;
  kind: "organization" | "payment";
  title: string;
  detail: string;
  at: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  points: DashboardPoint[];
  activity: DashboardActivity[];
  peak: DashboardPoint;
  totalRevenue: number;
  periodLabel: string;
}

interface BuildDashboardInput {
  transactions: Transaction[];
  organizations: Organization[];
  period: DashboardPeriod;
  now: Date;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function sampleSeries(values: number[], maxPoints = 24) {
  if (values.length <= maxPoints) return values;
  const step = (values.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => values[Math.round(index * step)] ?? 0);
}

function joinedAt(organization: Organization) {
  const value = organization.joinedAt ?? organization.createdAt;
  return value ? new Date(value).getTime() : 0;
}

/**
 * Turns the raw transactions/organizations feed into the shape the overview
 * needs: KPI totals with period-over-period deltas, a daily revenue series and
 * a small recent-activity feed.
 */
export function buildDashboardData({
  transactions,
  organizations,
  period,
  now,
}: BuildDashboardInput): DashboardData {
  const nowMs = now.getTime();
  const fromMs = nowMs - period * DAY;
  const previousFromMs = fromMs - period * DAY;

  const inWindow = (iso: string, start: number, end: number) => {
    const value = new Date(iso).getTime();
    return value >= start && value < end;
  };

  const currentTx = transactions.filter((transaction) =>
    inWindow(transaction.createdAt, fromMs, nowMs + 1),
  );
  const previousTx = transactions.filter((transaction) =>
    inWindow(transaction.createdAt, previousFromMs, fromMs),
  );

  const currentOk = currentTx.filter((transaction) => transaction.status === "successful");
  const previousOk = previousTx.filter((transaction) => transaction.status === "successful");
  const currentFailed = currentTx.filter((transaction) => transaction.status === "failed").length;
  const previousFailed = previousTx.filter((transaction) => transaction.status === "failed").length;

  const grossSales = sum(currentOk.map((transaction) => transaction.amount));
  const previousGross = sum(previousOk.map((transaction) => transaction.amount));
  const ticketsSold = sum(currentOk.map((transaction) => transaction.quantity));
  const previousTickets = sum(previousOk.map((transaction) => transaction.quantity));

  const attempts = currentOk.length + currentFailed;
  const previousAttempts = previousOk.length + previousFailed;
  const successRate = attempts ? (currentOk.length / attempts) * 100 : 0;
  const previousSuccessRate = previousAttempts ? (previousOk.length / previousAttempts) * 100 : 0;

  const organizationsNow = organizations.length;
  const organizationsBefore = organizations.filter(
    (organization) => joinedAt(organization) < fromMs,
  ).length;

  const points = buildPoints(transactions, period, now);
  const peak = pickPeak(points);
  const markedPoints = points.map((point) =>
    point.key === peak.key ? { ...point, isPeak: true } : point,
  );

  const orgJoins = new Map<string, number>();
  for (const organization of organizations) {
    const joined = joinedAt(organization);
    if (!joined) continue;
    const key = dayKey(new Date(joined).toISOString());
    orgJoins.set(key, (orgJoins.get(key) ?? 0) + 1);
  }
  let cumulativeOrganizations = organizationsBefore;
  const organizationsSeries = markedPoints.map((point) => {
    cumulativeOrganizations += orgJoins.get(point.key) ?? 0;
    return cumulativeOrganizations;
  });

  let cumulativeOk = 0;
  let cumulativeAttempts = 0;
  const successSeries = markedPoints.map((point) => {
    cumulativeOk += point.ok;
    cumulativeAttempts += point.ok + point.failed;
    return cumulativeAttempts ? (cumulativeOk / cumulativeAttempts) * 100 : 100;
  });

  const activity = buildActivity(transactions, organizations, now);

  return {
    kpis: {
      grossSales,
      ticketsSold,
      organizations: organizationsNow,
      activeOrganizations: organizations.filter((organization) => organization.status === "active")
        .length,
      successRate,
      failedPayments: currentFailed,
      grossDelta: percentDelta(grossSales, previousGross),
      ticketsDelta: percentDelta(ticketsSold, previousTickets),
      organizationsDelta: percentDelta(organizationsNow, organizationsBefore),
      successDelta: successRate - previousSuccessRate,
      grossSpark: sampleSeries(markedPoints.map((point) => point.revenue)),
      ticketsSpark: sampleSeries(markedPoints.map((point) => point.tickets)),
      organizationsSpark: sampleSeries(organizationsSeries),
      successSpark: sampleSeries(successSeries),
    },
    points: markedPoints,
    activity,
    peak,
    totalRevenue: grossSales,
    periodLabel: `Last ${period} days`,
  };
}

function buildPoints(transactions: Transaction[], days: number, now: Date): DashboardPoint[] {
  const buckets = new Map<
    string,
    { revenue: number; tickets: number; ok: number; failed: number }
  >();
  const order: { key: string; label: string; fullLabel: string }[] = [];

  for (let index = days - 1; index >= 0; index--) {
    const date = new Date(now.getTime() - index * DAY);
    const iso = date.toISOString();
    const key = dayKey(iso);
    buckets.set(key, { revenue: 0, tickets: 0, ok: 0, failed: 0 });
    order.push({ key, label: formatShortDate(iso), fullLabel: formatDate(iso) });
  }

  for (const transaction of transactions) {
    const bucket = buckets.get(dayKey(transaction.createdAt));
    if (!bucket) continue;
    if (transaction.status === "successful") {
      bucket.revenue += transaction.amount;
      bucket.tickets += transaction.quantity;
      bucket.ok += 1;
    } else if (transaction.status === "failed") {
      bucket.failed += 1;
    }
  }

  return order.map(({ key, label, fullLabel }) => {
    const bucket = buckets.get(key) ?? { revenue: 0, tickets: 0, ok: 0, failed: 0 };
    const attempts = bucket.ok + bucket.failed;
    return {
      key,
      label,
      fullLabel,
      revenue: bucket.revenue,
      tickets: bucket.tickets,
      ok: bucket.ok,
      failed: bucket.failed,
      successRate: attempts ? (bucket.ok / attempts) * 100 : 0,
    };
  });
}

function pickPeak(points: DashboardPoint[]) {
  const interior = points.slice(1, -1);
  const candidates = interior.length ? interior : points;
  return candidates.reduce(
    (best, point) => (point.revenue > best.revenue ? point : best),
    candidates[0] ?? points[0]!,
  );
}

function buildActivity(
  transactions: Transaction[],
  organizations: Organization[],
  now: Date,
): DashboardActivity[] {
  const orgNames = new Map(
    organizations.map((organization) => [organization.id, organization.name]),
  );
  const items: DashboardActivity[] = [];

  for (const transaction of transactions) {
    if (transaction.status !== "successful") continue;
    items.push({
      id: `tx-${transaction.id}`,
      kind: "payment",
      title: "Payment received",
      detail: `${formatNaira(transaction.amount)} · ${orgNames.get(transaction.orgId) ?? "Whatadeal"}`,
      at: transaction.createdAt,
    });
  }

  for (const organization of organizations) {
    const joined = organization.joinedAt ?? organization.createdAt;
    if (!joined) continue;
    items.push({
      id: `org-${organization.id}`,
      kind: "organization",
      title: "New organization onboarded",
      detail: organization.name,
      at: joined,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 2)
    .map((item) => ({ ...item, detail: item.detail }));
}

export function formatActivityTime(at: string, now: Date) {
  return relativeTime(at, now);
}
