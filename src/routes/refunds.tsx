import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Clock3, Undo2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, SuperAdminGate } from "@/components/dashboard/page";
import {
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { RefundStatusBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatDate, formatDateTime, formatNaira, formatNairaCompact } from "@/lib/format";
import { apiGet, apiGetList } from "@/lib/api";
import type { Refund, Settlement } from "@/lib/types";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [{ title: "Refunds & Settlements · Whatadeal Admin" }],
  }),
  component: () => (
    <SuperAdminGate what="Refunds & settlements">
      <RefundsPage />
    </SuperAdminGate>
  ),
});

function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sPage, setSPage] = useState(1);

  useEffect(() => {
    Promise.all([
      apiGetList<Refund>("/api/v1/pos/refunds").catch(() => []),
      apiGetList<Settlement>("/api/v1/settlements").catch(() => []),
    ])
      .then(([r, s]) => {
        setRefunds(r);
        setSettlements(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const requested = refunds.filter((r) => (r as any).status === "requested").length;
  const approved = refunds.filter((r) => (r as any).status === "approved").length;
  const totalRefunded = refunds
    .filter((r) => (r as any).status === "processed")
    .reduce((s, r) => s + (Number((r as any).amount ?? 0) || 0), 0);
  const pendingSettlements = settlements.filter((s) => (s as any).status === "pending").length;

  const q = search.toLowerCase();
  const filteredRefunds = refunds.filter((r) => {
    const x = r as any;
    const reason = String(x.reason ?? "").toLowerCase();
    const by = String(x.requestedBy ?? x.requested_by ?? "").toLowerCase();
    return reason.includes(q) || by.includes(q);
  });
  useEffect(() => setPage(1), [search]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredRefunds.length / PAGE_SIZE)));
  const pagedRefunds = filteredRefunds.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const safeSPage = Math.min(sPage, Math.max(1, Math.ceil(settlements.length / PAGE_SIZE)));
  const pagedSettlements = settlements.slice((safeSPage - 1) * PAGE_SIZE, safeSPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Refunds & Settlements"
        description="Process refund requests and track organization payouts."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending refunds" value={requested} icon={<Clock3 />} iconTone="info" />
        <StatCard label="Approved" value={approved} icon={<CheckCircle2 />} iconTone="success" />
        <StatCard label="Total refunded" value={formatNairaCompact(totalRefunded)} icon={<Undo2 />} iconTone="primary" />
        <StatCard label="Pending settlements" value={pendingSettlements} icon={<Banknote />} iconTone="violet" />
      </div>

      <Tabs defaultValue="refunds">
        <TabsList>
          <TabsTrigger value="refunds" className="px-4">Refunds</TabsTrigger>
          <TabsTrigger value="settlements" className="px-4">Settlements</TabsTrigger>
        </TabsList>

        <TabsContent value="refunds" className="mt-4">
          <TableCard>
            <TableToolbar
              left={
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-[#111827]">Refund requests</h2>
                  <p className="text-[12px] text-[#6B7280]">{filteredRefunds.length} refund{filteredRefunds.length !== 1 ? "s" : ""}</p>
                </div>
              }
              right={
                <>
                  <TableSearch value={search} onChange={setSearch} placeholder="Search refunds..." />
                  <ExportButton
                    filename="refunds"
                    rows={filteredRefunds}
                    columns={[
                      { header: "Reason", value: (r: any) => r?.reason ?? "" },
                      { header: "Amount", value: (r: any) => r?.amount ?? 0 },
                      { header: "Requested By", value: (r: any) => r?.requestedBy ?? "" },
                      { header: "Status", value: (r: any) => r?.status ?? "" },
                      { header: "Date", value: (r: any) => r?.requestedAt ?? r?.createdAt ?? "" },
                    ]}
                  />
                </>
              }
            />
            {loading ? (
              <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading refunds...</div>
            ) : filteredRefunds.length === 0 ? (
              <TableEmptyState icon={<Undo2 className="size-5" />} title={search ? "No matching refunds" : "No refund requests"} description={search ? "Try adjusting your search." : "Refund requests will appear here."} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Requested by</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRefunds.map((r) => {
                      const x = r as any;
                      return (
                        <TableRow key={r.id ?? x.reason}>
                          <TableCell className="max-w-xs truncate text-[#374151]">{x.reason ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatNaira(x.amount)}</TableCell>
                          <TableCell>{x.requestedBy ?? x.requested_by ?? "—"}</TableCell>
                          <TableCell><RefundStatusBadge status={x.status ?? "requested"} /></TableCell>
                          <TableCell className="text-[13px] text-[#6B7280]">{formatDateTime(x.requestedAt ?? x.createdAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination page={safePage} pageSize={PAGE_SIZE} total={filteredRefunds.length} onPageChange={setPage} noun="refunds" />
              </>
            )}
          </TableCard>
        </TabsContent>

        <TabsContent value="settlements" className="mt-4">
          <TableCard>
            <TableToolbar
              left={
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-[#111827]">Organization settlements</h2>
                  <p className="text-[12px] text-[#6B7280]">Payouts to event organizers</p>
                </div>
              }
              right={
                <ExportButton
                  filename="settlements"
                  rows={settlements}
                  columns={[
                    { header: "Period", value: (s: any) => s?.periodLabel ?? s?.period ?? "" },
                    { header: "Gross", value: (s: any) => s?.gross ?? 0 },
                    { header: "Fees", value: (s: any) => s?.fees ?? 0 },
                    { header: "Refunds", value: (s: any) => s?.refunds ?? 0 },
                    { header: "Net", value: (s: any) => s?.net ?? 0 },
                    { header: "Status", value: (s: any) => s?.status ?? "" },
                    { header: "Paid At", value: (s: any) => s?.paidAt ?? "" },
                  ]}
                />
              }
            />
            {loading ? (
              <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading settlements...</div>
            ) : settlements.length === 0 ? (
              <TableEmptyState icon={<Banknote className="size-5" />} title="No settlements yet" description="Settlements will appear here." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Refunds</TableHead>
                      <TableHead className="text-right">Net payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedSettlements.map((s) => {
                      const x = s as any;
                      return (
                        <TableRow key={s.id ?? x.periodLabel}>
                          <TableCell className="font-medium text-[#111827]">{x.periodLabel ?? x.period ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNaira(x.gross)}</TableCell>
                          <TableCell className="text-right tabular-nums text-[#6B7280]">-{formatNaira(x.fees)}</TableCell>
                          <TableCell className="text-right tabular-nums text-[#6B7280]">-{formatNaira(x.refunds)}</TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums text-[#111827]">{formatNaira(x.net)}</TableCell>
                          <TableCell>
                            {x.status === "paid" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-[3px] text-[11px] font-medium text-[#166534] ring-1 ring-inset ring-[#BBF7D0]">
                                <CheckCircle2 className="size-3" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-[3px] text-[11px] font-medium text-[#B45309] ring-1 ring-inset ring-[#FDE68A]">
                                <Clock3 className="size-3" /> Pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[13px] text-[#6B7280]">{x.paidAt ? formatDate(x.paidAt) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination page={safeSPage} pageSize={PAGE_SIZE} total={settlements.length} onPageChange={setSPage} noun="settlements" />
              </>
            )}
          </TableCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
