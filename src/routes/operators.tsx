import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarClock, CheckCircle2, Mail, MoreHorizontal, Phone, Plus, UserCheck, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, StatCard, SuperAdminGate } from "@/components/dashboard/page";
import {
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { DetailList, DetailRow } from "@/components/dashboard/detail-row";
import { ActiveBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatDate, formatDateTime } from "@/lib/format";
import { apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Operator } from "@/lib/types";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/operators")({
  head: () => ({
    meta: [{ title: "POS Operators · Whatadeal Admin" }],
  }),
  component: () => (
    <SuperAdminGate what="POS operators">
      <OperatorsPage />
    </SuperAdminGate>
  ),
});

function OperatorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: operators = [], isLoading: loading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => apiGetList<any>("/api/v1/pos/operators"),
  });

  const toggleMutation = useMutation({
    mutationFn: (userId: string) => apiPatch(`/api/v1/users/${userId}/toggle-active`),
    onSuccess: () => {
      toast.success("Operator status updated");
      void queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update operator"),
  });

  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      operators.filter((op) => {
        const name = String(op?.user?.firstName ? `${op.user.firstName} ${op.user.lastName ?? ""}` : op?.name ?? op?.fullName ?? "").toLowerCase();
        const email = String(op?.user?.email ?? op?.email ?? "").toLowerCase();
        const emp = String(op?.employeeId ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || emp.includes(q);
      }),
    [operators, q],
  );
  useEffect(() => setPage(1), [search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const active = operators.filter((o) => (o?.user?.isActive ?? o?.isActive ?? o?.status === "active") !== false && (o?.status ? o.status === "active" : true)).length;
  const activeCount = operators.filter((o) => o?.user?.isActive !== false).length;
  const inactiveCount = operators.length - activeCount;
  const selected = operators.find((o) => String(o?.id) === String(openId));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Point of sale"
        title="POS Operators"
        description="Manage operators who handle ticket sales on POS terminals at events."
        actions={
          <AddOperatorDialog
            onCreated={() => void queryClient.invalidateQueries({ queryKey: ["operators"] })}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total operators" value={operators.length} icon={<Users />} iconTone="primary" />
        <StatCard label="Active" value={activeCount} icon={<UserCheck />} iconTone="success" />
        <StatCard label="Inactive" value={inactiveCount < 0 ? 0 : inactiveCount} icon={<UserMinus />} iconTone="violet" />
      </div>

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">All operators</h2>
              <p className="text-[12px] text-[#6B7280]">{filtered.length} operator{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          }
          right={
            <>
              <TableSearch value={search} onChange={setSearch} placeholder="Search operators..." />
              <ExportButton
                filename="operators"
                rows={filtered}
                columns={[
                  { header: "Name", value: (o) => (o?.user?.firstName ? `${o.user.firstName} ${o.user.lastName ?? ""}`.trim() : o?.name ?? o?.fullName ?? "") },
                  { header: "Email", value: (o) => o?.user?.email ?? o?.email ?? "" },
                  { header: "Employee ID", value: (o) => o?.employeeId ?? "" },
                  { header: "Assignments", value: (o) => o?._count?.eventAssignments ?? "" },
                  { header: "Joined", value: (o) => o?.createdAt ?? o?.joinedAt ?? "" },
                ]}
              />
            </>
          }
        />
        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading operators...</div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            icon={<Users className="size-5" />}
            title={search ? "No matching operators" : "No operators registered yet"}
            description={search ? "Try adjusting your search." : "Add an operator to get started."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[56px] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((op) => {
                  const name = op?.user?.firstName ? `${op.user.firstName} ${op.user.lastName ?? ""}`.trim() : op?.name ?? op?.fullName ?? "—";
                  const email = op?.user?.email ?? op?.email ?? "—";
                  const phone = op?.user?.phone ?? op?.phone ?? op?.phoneNumber ?? "—";
                  const joined = op?.createdAt ?? op?.joinedAt;
                  const userId = op?.userId ?? op?.user?.id;
                  const opActive = op?.user?.isActive !== false;
                  return (
                    <TableRow key={op?.id ?? name} className="cursor-pointer" onClick={() => setOpenId(String(op?.id ?? ""))}>
                      <TableCell className="font-medium text-[#111827]">{name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-[13px]">
                          <span className="flex items-center gap-1.5 text-[#6B7280]">
                            <Mail className="size-3.5" /> {email}
                          </span>
                          <span className="flex items-center gap-1.5 text-[#6B7280]">
                            <Phone className="size-3.5" /> {phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-[#374151]">{op?.employeeId ?? "—"}</TableCell>
                      <TableCell className="text-[13px] text-[#374151]">{op?._count?.eventAssignments ?? 0}</TableCell>
                      <TableCell>
                        <ActiveBadge active={opActive} />
                      </TableCell>
                      <TableCell className="text-[13px] text-[#6B7280]">{formatDate(joined)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${name}`}
                              className="h-8 w-8 rounded-[8px] text-[#6B7280] hover:bg-[#FAF8F5] hover:text-[#111827]"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {opActive ? (
                              <DropdownMenuItem
                                className="text-[#B91C1C] focus:bg-[#FEF2F2] focus:text-[#991B1B] [&>svg]:text-[#DC2626]"
                                disabled={!userId || toggleMutation.isPending}
                                onClick={() => userId && toggleMutation.mutate(String(userId))}
                              >
                                <Ban /> Deactivate operator
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={!userId || toggleMutation.isPending}
                                onClick={() => userId && toggleMutation.mutate(String(userId))}
                              >
                                <CheckCircle2 /> Activate operator
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="operators" />
          </>
        )}
      </TableCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
          {selected ? (
            <OperatorDetail
              operator={selected}
              onToggle={() => {
                const userId = selected?.userId ?? selected?.user?.id;
                if (userId) toggleMutation.mutate(String(userId));
              }}
              togglePending={toggleMutation.isPending}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OperatorDetail({
  operator,
  onToggle,
  togglePending,
}: {
  operator: any;
  onToggle: () => void;
  togglePending: boolean;
}) {
  const name = operator?.user?.firstName ? `${operator.user.firstName} ${operator.user.lastName ?? ""}`.trim() : operator?.name ?? operator?.fullName ?? "—";
  const email = operator?.user?.email ?? operator?.email ?? "—";
  const phone = operator?.user?.phone ?? operator?.phone ?? operator?.phoneNumber ?? "—";
  const active = operator?.user?.isActive !== false;
  const userId = operator?.userId ?? operator?.user?.id;
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <ActiveBadge active={active} />
        </div>
        <SheetTitle className="font-display text-2xl text-[#111827]">{name}</SheetTitle>
        <SheetDescription>POS operator details and assignments.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Mini label="Employee ID" value={operator?.employeeId ?? "—"} />
          <Mini label="Assignments" value={String(operator?._count?.eventAssignments ?? 0)} />
        </div>
        <DetailList>
          <DetailRow icon={Mail} label="Email" value={email} />
          <DetailRow icon={Phone} label="Phone" value={phone} />
          <DetailRow icon={CalendarClock} label="Created" value={formatDateTime(operator?.createdAt)} />
        </DetailList>
        <div className="flex gap-2">
          {active ? (
            <Button
              variant="outline"
              className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
              disabled={!userId || togglePending}
              onClick={onToggle}
            >
              <Ban className="size-4" /> Deactivate operator
            </Button>
          ) : (
            <Button
              className="bg-brand-gradient text-white hover:opacity-95"
              disabled={!userId || togglePending}
              onClick={onToggle}
            >
              <CheckCircle2 className="size-4" /> Activate operator
            </Button>
          )}
        </div>
        {!active && (
          <p className="text-[12px] text-[#6B7280]">
            Deactivated operators cannot sign in to the POS app until reactivated.
          </p>
        )}
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#E8E2DA] bg-[#FAF8F5] p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 truncate font-display text-[15px] font-semibold text-[#111827] tabular-nums">{value}</p>
    </div>
  );
}

function AddOperatorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", "pos-operators"],
    queryFn: async () => {
      const res = await apiGetList<any>("/api/v1/users", { role: "POS_OPERATOR" });
      return res;
    },
    enabled: open,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (body: { userId: string; employeeId?: string }) => apiPost("/api/v1/pos/operators", body),
    onSuccess: () => {
      toast.success("Operator added");
      setUserId("");
      setEmployeeId("");
      setOpen(false);
      onCreated();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not add operator"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95">
          <Plus className="size-4" /> Add operator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
          <DialogTitle>Add POS operator</DialogTitle>
          <DialogDescription>Register an existing POS operator user as an operator.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-medium text-[#374151]">POS operator user</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-11 rounded-[10px]">
                <SelectValue placeholder={usersQuery.isLoading ? "Loading users..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {(usersQuery.data ?? []).map((u: any) => {
                  const label = u?.name ?? `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() ?? u?.email ?? u?.id;
                  return (
                    <SelectItem key={u?.id} value={String(u?.id)}>
                      {label} {u?.email ? `· ${u.email}` : ""}
                    </SelectItem>
                  );
                })}
                {!usersQuery.isLoading && (usersQuery.data ?? []).length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No POS operator users found
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-[#6B7280]">The user must have the POS Operator role.</p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-medium text-[#374151]">Employee ID (optional)</Label>
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-001"
              className="h-11 rounded-[10px]"
            />
          </div>
        </div>
        <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
          <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!userId || userId === "__none" || mutation.isPending}
            className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95 disabled:opacity-50"
            onClick={() => mutation.mutate({ userId, ...(employeeId.trim() ? { employeeId: employeeId.trim() } : {}) })}
          >
            {mutation.isPending ? "Adding..." : "Add operator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}