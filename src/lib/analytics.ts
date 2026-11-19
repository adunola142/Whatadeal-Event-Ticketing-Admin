import { dayKey, formatShortDate } from "./format";
import type { Transaction } from "./types";

export function summarize(txs: Transaction[]) {
  let gross = 0;
  let tickets = 0;
  let ok = 0;
  let failed = 0;
  let pending = 0;
  let refunded = 0;
  for (const t of txs) {
    if (t.status === "successful") {
      gross += t.amount;
      tickets += t.quantity;
      ok++;
    } else if (t.status === "failed") failed++;
    else if (t.status === "pending") pending++;
    else if (t.status === "refunded") refunded += t.amount;
  }
  const attempts = ok + failed;
  return {
    gross,
    tickets,
    ok,
    failed,
    pending,
    refunded,
    count: txs.length,
    successRate: attempts ? ok / attempts : 0,
    avgOrder: ok ? gross / ok : 0,
  };
}

export function withinDays(txs: Transaction[], days: number | null, now: Date) {
  if (days == null) return txs;
  const from = now.getTime() - days * 86_400_000;
  return txs.filter((t) => new Date(t.createdAt).getTime() >= from);
}

export function revenueByDay(txs: Transaction[], days: number, now: Date) {
  const buckets = new Map<string, { revenue: number; tickets: number; failed: number }>();
  const order: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = new Date(now.getTime() - i * 86_400_000).toISOString();
    const key = dayKey(iso);
    buckets.set(key, { revenue: 0, tickets: 0, failed: 0 });
    order.push({ key, label: formatShortDate(iso) });
  }
  for (const t of txs) {
    const b = buckets.get(dayKey(t.createdAt));
    if (!b) continue;
    if (t.status === "successful") {
      b.revenue += t.amount;
      b.tickets += t.quantity;
    } else if (t.status === "failed") b.failed++;
  }
  return order.map(({ key, label }) => ({ day: label, ...buckets.get(key)! }));
}

export function groupBy<K extends string>(
  txs: Transaction[],
  key: (t: Transaction) => K,
) {
  const m = new Map<K, { revenue: number; tickets: number; count: number; failed: number }>();
  for (const t of txs) {
    const k = key(t);
    const row = m.get(k) ?? { revenue: 0, tickets: 0, count: 0, failed: 0 };
    row.count++;
    if (t.status === "successful") {
      row.revenue += t.amount;
      row.tickets += t.quantity;
    } else if (t.status === "failed") row.failed++;
    m.set(k, row);
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.revenue - a.revenue);
}
