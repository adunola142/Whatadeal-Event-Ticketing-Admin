import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Ticket,
  TrendingUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard, StatCard } from "@/components/dashboard/page";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatNaira, formatNairaCompact, formatNumber } from "@/lib/format";
import { apiGetList } from "@/lib/api";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [{ title: "Reports · Whatadeal Admin" }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    apiGetList<any>("/api/v1/pos/transactions")
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const days = parseInt(period);
  const cutoff = now - days * 86_400_000;
  const periodTx = transactions.filter((t) => {
    const d = t?.createdAt ?? t?.date ?? t?.completedAt;
    return d ? new Date(d).getTime() >= cutoff : true;
  });
  const isOk = (s: any) => ["successful", "completed", "success"].includes(String(s ?? "").toLowerCase());
  const successful = periodTx.filter((t) => isOk(t.status));
  const amountOf = (t: any) => Number(t?.totalAmount ?? t?.amount ?? 0) || 0;
  const qtyOf = (t: any) => Number(t?.quantity ?? t?.items?.reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0) ?? 0) || 0;
  const gross = successful.reduce((s, t) => s + amountOf(t), 0);
  const tickets = successful.reduce((s, t) => s + qtyOf(t), 0);
  const failed = periodTx.filter((t) => String(t.status ?? "").toLowerCase() === "failed").length;
  const attempts = successful.length + failed;
  const successRate = attempts ? ((successful.length / attempts) * 100).toFixed(1) : "0.0";
  const avgOrder = successful.length ? gross / successful.length : 0;

  const byMethod = new Map<string, { count: number; amount: number }>();
  for (const t of successful) {
    const method = String(t?.paymentMethod ?? t?.method ?? "Unknown");
    const row = byMethod.get(method) ?? { count: 0, amount: 0 };
    row.count++;
    row.amount += amountOf(t);
    byMethod.set(method, row);
  }
  const methodRows = [...byMethod.entries()].sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Reports"
        description="Revenue, sales performance and payment analytics."
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-11 w-36 rounded-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton
              filename={`report-${period}d`}
              rows={periodTx}
              columns={[
                { header: "Reference", value: (t) => t?.transactionRef ?? t?.ref ?? "" },
                { header: "Amount", value: (t) => amountOf(t) },
                { header: "Tickets", value: (t) => qtyOf(t) },
                { header: "Method", value: (t) => t?.paymentMethod ?? t?.method ?? "" },
                { header: "Status", value: (t) => t?.status ?? "" },
                { header: "Date", value: (t) => t?.createdAt ?? t?.date ?? "" },
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Revenue · ${days}d`}
          value={loading ? "—" : formatNairaCompact(gross)}
          icon={<CreditCard />}
          iconTone="primary"
        />
        <StatCard
          label={`Tickets · ${days}d`}
          value={loading ? "—" : formatNumber(tickets)}
          icon={<Ticket />}
          iconTone="success"
        />
        <StatCard
          label="Success rate"
          value={loading ? "—" : `${successRate}%`}
          hint={`${failed} failed`}
          icon={<TrendingUp />}
          iconTone="info"
        />
        <StatCard
          label="Avg. order"
          value={loading ? "—" : formatNaira(avgOrder)}
          icon={<BarChart3 />}
          iconTone="violet"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Revenue trend"
          description={`Last ${days} days`}
          bodyClassName="p-4 pt-6"
        >
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading..." : periodTx.length ? "Revenue chart will populate with transaction data." : "No transaction data for this period."}
          </div>
        </SectionCard>

        <SectionCard title="Payment methods" description="Breakdown by method">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : methodRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ul className="divide-y">
              {methodRows.map(([method, data]) => (
                <li key={method} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{method}</p>
                    <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                  </div>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {formatNairaCompact(data.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}