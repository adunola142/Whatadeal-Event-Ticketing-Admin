import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SuperAdminGate } from "@/components/dashboard/page";
import {
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatDateTime } from "@/lib/format";
import { apiGetList } from "@/lib/api";
import type { AuditCategory, AuditEntry } from "@/lib/types";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [{ title: "Audit Log · Whatadeal Admin" }],
  }),
  component: () => (
    <SuperAdminGate what="The audit log">
      <AuditPage />
    </SuperAdminGate>
  ),
});

const categoryIcons: Record<AuditCategory, typeof ScrollText> = {
  organization: Building2,
  event: CalendarDays,
  pos: Smartphone,
  payment: CreditCard,
  settings: Settings,
  access: Shield,
};

const categoryColors: Record<AuditCategory, string> = {
  organization: "bg-[#EFF6FF] text-[#1D4ED8] ring-1 ring-inset ring-[#BFDBFE]",
  event: "bg-[#F5F3FF] text-[#6D28D9] ring-1 ring-inset ring-[#DDD6FE]",
  pos: "bg-[#FFFBEB] text-[#B45309] ring-1 ring-inset ring-[#FDE68A]",
  payment: "bg-[#ECFDF3] text-[#166534] ring-1 ring-inset ring-[#BBF7D0]",
  settings: "bg-[#F3F4F6] text-[#374151] ring-1 ring-inset ring-[#E5E7EB]",
  access: "bg-[#FEF2F2] text-[#991B1B] ring-1 ring-inset ring-[#FECACA]",
};

function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGetList<AuditEntry>("/api/v1/audit-logs")
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = entries.filter((e) => {
    const r = e as any;
    const action = String(r.action ?? r.message ?? "").toLowerCase();
    const actor = String(r.actor ?? r.user ?? r.actorName ?? "").toLowerCase();
    const target = String(r.target ?? r.entity ?? r.resource ?? "").toLowerCase();
    const matchesSearch = action.includes(q) || actor.includes(q) || target.includes(q);
    const matchesCategory = categoryFilter === "all" || (r.category ?? "") === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  useEffect(() => setPage(1), [search, categoryFilter]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Audit Log"
        description="A chronological record of every administrative action across the platform."
        actions={
          <ExportButton
            filename="audit-log"
            rows={filtered}
            columns={[
              { header: "Timestamp", value: (e: any) => e?.at ?? e?.createdAt ?? e?.timestamp ?? "" },
              { header: "Actor", value: (e: any) => e?.actor ?? e?.user ?? e?.actorName ?? "" },
              { header: "Role", value: (e: any) => e?.actorRole ?? e?.role ?? "" },
              { header: "Action", value: (e: any) => e?.action ?? e?.message ?? "" },
              { header: "Target", value: (e: any) => e?.target ?? e?.entity ?? e?.resource ?? "" },
              { header: "Category", value: (e: any) => e?.category ?? "" },
            ]}
          />
        }
      />

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">Activity trail</h2>
              <p className="text-[12px] text-[#6B7280]">{filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}</p>
            </div>
          }
          right={
            <>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as AuditCategory | "all")}>
                <SelectTrigger className="h-11 w-[170px] rounded-[10px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                </SelectContent>
              </Select>
              <TableSearch value={search} onChange={setSearch} placeholder="Search actions..." />
            </>
          }
        />
        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            icon={<ScrollText className="size-5" />}
            title={search || categoryFilter !== "all" ? "No matching entries" : "No audit entries yet"}
            description={search || categoryFilter !== "all" ? "Try adjusting your search or filters." : "Activity will appear here."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((e, i) => {
                  const r = e as any;
                  const category = (r.category ?? "settings") as AuditCategory;
                  const Icon = categoryIcons[category] ?? ScrollText;
                  const at = r.at ?? r.createdAt ?? r.timestamp;
                  return (
                    <TableRow key={e.id ?? i}>
                      <TableCell className="whitespace-nowrap text-[13px] text-[#6B7280]">
                        {formatDateTime(at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-[14px] font-medium text-[#111827]">{r.actor ?? r.user ?? r.actorName ?? "—"}</span>
                          <span className="ml-1.5 text-[12px] text-[#6B7280]">{r.actorRole ?? r.role ?? ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-[#374151]">{r.action ?? r.message ?? "—"}</TableCell>
                      <TableCell className="font-medium text-[#111827]">{r.target ?? r.entity ?? r.resource ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 rounded-full border-0 px-2.5 py-[3px] text-[11px] font-medium ${categoryColors[category] ?? categoryColors.settings}`}>
                          <Icon className="size-3" />
                          {category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="entries" />
          </>
        )}
      </TableCard>
    </div>
  );
}
