import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hash,
  Mail,
  Phone,
  Smartphone,
  Ticket,
  User,
  XCircle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, StatCard } from "@/components/dashboard/page";
import {
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { DetailList, DetailRow } from "@/components/dashboard/detail-row";
import { TxStatusBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatDateTime, formatNaira, formatNairaCompact, formatNumber } from "@/lib/format";
import { apiGetList } from "@/lib/api";
import type { Transaction, TxStatus } from "@/lib/types";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [{ title: "Transactions · Whatadeal Admin" }],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TxStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiGetList<any>("/api/v1/pos/transactions"),
    retry: false,
  });

  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const r = t as any;
        const ref = String(r.transactionRef ?? r.ref ?? r.reference ?? "").toLowerCase();
        const customer = String(r.customerName ?? r.customer ?? "").toLowerCase();
        const status = String(r.status ?? "").toLowerCase();
        const matchesSearch = ref.includes(q) || customer.includes(q);
        const filter = statusFilter === "all" ? "all" : String(statusFilter).toLowerCase();
        const matchesStatus =
          filter === "all" ||
          status === filter ||
          (filter === "successful" && (status === "completed" || status === "success")) ||
          (filter === "pending" && (status === "processing" || status === "pending"));
        return matchesSearch && matchesStatus;
      }),
    [transactions, q, statusFilter],
  );
  useEffect(() => setPage(1), [search, statusFilter]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const successful = transactions.filter((t) => {
    const s = String((t as any).status ?? "").toLowerCase();
    return s === "successful" || s === "completed" || s === "success";
  });
  const grossRevenue = successful.reduce((s, t) => s + (Number((t as any).totalAmount ?? (t as any).amount ?? 0) || 0), 0);
  const totalTickets = successful.reduce(
    (s, t) =>
      s + (Number((t as any).quantity ?? (t as any).items?.reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0) ?? 0) || 0),
    0,
  );
  const failed = transactions.filter((t) => String((t as any).status ?? "").toLowerCase() === "failed").length;
  const selected = transactions.find((t) => String((t as any).id) === String(openId));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Transactions"
        description="All POS card payments across events and terminals."
        actions={
          <ExportButton
            filename="transactions"
            rows={filtered}
            columns={[
              { header: "Reference", value: (t: any) => t?.transactionRef ?? t?.ref ?? t?.reference ?? "" },
              { header: "Amount", value: (t: any) => t?.totalAmount ?? t?.amount ?? 0 },
              { header: "Tickets", value: (t: any) => t?.quantity ?? t?.items?.reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0) ?? 0 },
              { header: "Method", value: (t: any) => t?.paymentMethod ?? t?.method ?? "" },
              { header: "Status", value: (t: any) => t?.status ?? "" },
              { header: "Customer", value: (t: any) => t?.customerName ?? "" },
              { header: "Date", value: (t: any) => t?.createdAt ?? t?.date ?? t?.completedAt ?? "" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Gross revenue" value={formatNairaCompact(grossRevenue)} icon={<CreditCard />} iconTone="primary" />
        <StatCard label="Tickets sold" value={formatNumber(totalTickets)} icon={<CheckCircle2 />} iconTone="success" />
        <StatCard label="Total transactions" value={formatNumber(transactions.length)} icon={<Clock3 />} iconTone="info" />
        <StatCard label="Failed" value={formatNumber(failed)} icon={<XCircle />} iconTone="violet" />
      </div>

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">Transaction history</h2>
              <p className="text-[12px] text-[#6B7280]">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          }
          right={
            <>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TxStatus | "all")}>
                <SelectTrigger className="h-11 w-[160px] rounded-[10px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <TableSearch value={search} onChange={setSearch} placeholder="Search by ref or customer..." />
            </>
          }
        />
        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            icon={<CreditCard className="size-5" />}
            title={search || statusFilter !== "all" ? "No matching transactions" : "No transactions yet"}
            description={search || statusFilter !== "all" ? "Try adjusting your search or filters." : "Transactions will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => {
                  const r = t as any;
                  const ref = r.transactionRef ?? r.ref ?? r.reference ?? "—";
                  const method = r.paymentMethod ?? r.method ?? "Card";
                  const last4 = r.cardLast4 ?? r.last4 ?? "••••";
                  const createdAt = r.createdAt ?? r.date ?? r.paidAt ?? r.completedAt;
                  const amount = r.totalAmount ?? r.amount;
                  const qty = r.quantity ?? r.items?.reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0) ?? 0;
                  const status = String(r.status ?? "pending").toLowerCase();
                  return (
                    <TableRow
                      key={t.id ?? ref}
                      className="cursor-pointer"
                      onClick={() => setOpenId(String(t.id ?? ""))}
                    >
                      <TableCell className="font-mono text-[13px] text-[#374151]">{ref}</TableCell>
                      <TableCell className="text-right font-mono text-[14px] font-medium tabular-nums text-[#111827]">
                        {formatNaira(amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{qty}</TableCell>
                      <TableCell>
                        <span className="text-[13px] text-[#6B7280]">
                          {method} ···{last4}
                        </span>
                      </TableCell>
                      <TableCell><TxStatusBadge status={status} /></TableCell>
                      <TableCell className="text-[13px] text-[#6B7280]">{formatDateTime(createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="transactions" />
          </>
        )}
      </TableCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
          {selected ? <TransactionDetail transaction={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TransactionDetail({ transaction }: { transaction: any }) {
  const r = transaction;
  const ref = r.transactionRef ?? r.ref ?? r.reference ?? "—";
  const status = String(r.status ?? "pending").toLowerCase();
  const method = r.paymentMethod ?? r.method ?? "Card";
  const amount = r.totalAmount ?? r.amount;
  const createdAt = r.createdAt ?? r.date ?? r.paidAt ?? r.completedAt;
  const eventName = r.event?.title ?? "—";
  const operatorUser = r.operator?.user;
  const operatorName = operatorUser
    ? `${operatorUser.firstName ?? ""} ${operatorUser.lastName ?? ""}`.trim()
    : "—";
  const items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> = Array.isArray(
    r.items,
  )
    ? r.items
    : [];
  const failureReason = r.metadata?.failureReason;

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <TxStatusBadge status={status} />
        </div>
        <SheetTitle className="font-display text-2xl text-[#111827]">{formatNaira(amount)}</SheetTitle>
        <SheetDescription className="font-mono">{ref}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        {failureReason ? (
          <div className="flex items-start gap-2 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{failureReason}</span>
          </div>
        ) : null}

        <DetailList>
          <DetailRow icon={Ticket} label="Event" value={eventName} />
          <DetailRow icon={User} label="Operator" value={operatorName} />
          <DetailRow icon={CreditCard} label="Payment method" value={method} />
          {r.paymentReference ? <DetailRow icon={Hash} label="Payment ref" value={r.paymentReference} mono /> : null}
          {r.deviceId ? <DetailRow icon={Smartphone} label="Terminal" value={r.deviceId} mono /> : null}
          <DetailRow icon={Calendar} label="Date" value={formatDateTime(createdAt)} />
        </DetailList>

        {(r.customerName || r.customerEmail || r.customerPhone) && (
          <DetailList>
            {r.customerName ? <DetailRow icon={User} label="Customer" value={r.customerName} /> : null}
            {r.customerEmail ? <DetailRow icon={Mail} label="Email" value={r.customerEmail} /> : null}
            {r.customerPhone ? <DetailRow icon={Phone} label="Phone" value={r.customerPhone} /> : null}
          </DetailList>
        )}

        {items.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#111827]">Tickets</h3>
            <ul className="divide-y divide-[#F0EBE4] overflow-hidden rounded-[12px] border border-[#E8E2DA] bg-white">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="truncate text-[#374151]">
                    {it.quantity} × {it.name}
                  </span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-[#111827]">
                    {formatNaira(it.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}