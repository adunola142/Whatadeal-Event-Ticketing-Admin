import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Smartphone, User, UserMinus, UserPlus, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { SearchableSelect } from "@/components/dashboard/searchable-select";
import { TerminalStatusBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { formatDateTime } from "@/lib/format";
import { apiDelete, apiGetList, apiPost } from "@/lib/api";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/terminals")({
  head: () => ({
    meta: [{ title: "Terminals · Whatadeal Admin" }],
  }),
  component: () => (
    <SuperAdminGate what="Terminals">
      <TerminalsPage />
    </SuperAdminGate>
  ),
});

function TerminalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: terminals = [], isLoading: loading } = useQuery({
    queryKey: ["terminals"],
    queryFn: () => apiGetList<any>("/api/v1/pos/devices"),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => apiGetList<any>("/api/v1/pos/operators"),
  });

  const assignMutation = useMutation({
    mutationFn: (body: { operatorId: string; deviceId: string }) => apiPost("/api/v1/pos/device-assignments", body),
    onSuccess: () => {
      toast.success("Terminal assigned");
      void queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not assign terminal"),
  });

  const unassignMutation = useMutation({
    mutationFn: ({ operatorId, deviceId }: { operatorId: string; deviceId: string }) =>
      apiDelete(`/api/v1/pos/device-assignments/${operatorId}/${deviceId}`),
    onSuccess: () => {
      toast.success("Terminal unassigned");
      void queryClient.invalidateQueries({ queryKey: ["terminals"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not unassign terminal"),
  });

  const q = search.toLowerCase();
  const filtered = useMemo(
    () =>
      terminals.filter((t) => {
        const serial = String(t?.serialNumber ?? t?.serial ?? t?.deviceSerial ?? "").toLowerCase();
        const model = String(t?.model ?? t?.deviceModel ?? "").toLowerCase();
        return serial.includes(q) || model.includes(q);
      }),
    [terminals, q],
  );
  useEffect(() => setPage(1), [search]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusOf = (t: any) => String(t?.status ?? "pending").toLowerCase();
  const authorized = terminals.filter((t) => ["authorized", "active"].includes(statusOf(t))).length;
  const pending = terminals.filter((t) => statusOf(t) === "pending").length;
  const revoked = terminals.filter((t) => ["revoked", "inactive", "disabled"].includes(statusOf(t))).length;
  const selected = terminals.find((t) => String(t?.id) === String(openId));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Point of sale"
        title="Terminals"
        description="POS devices registered for on-site ticket sales."
        actions={<RegisterTerminalDialog onCreated={() => void queryClient.invalidateQueries({ queryKey: ["terminals"] })} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total devices" value={terminals.length} icon={<Smartphone />} iconTone="primary" />
        <StatCard label="Authorized" value={authorized} icon={<Wifi />} iconTone="success" />
        <StatCard label="Pending" value={pending} icon={<WifiOff />} iconTone="info" />
        <StatCard label="Revoked" value={revoked} icon={<WifiOff />} iconTone="violet" />
      </div>

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">All terminals</h2>
              <p className="text-[12px] text-[#6B7280]">{filtered.length} device{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          }
          right={
            <>
              <TableSearch value={search} onChange={setSearch} placeholder="Search by serial or model..." />
              <ExportButton
                filename="terminals"
                rows={filtered}
                columns={[
                  { header: "Serial", value: (t) => t?.serialNumber ?? t?.serial ?? "" },
                  { header: "Model", value: (t) => t?.model ?? "" },
                  { header: "Status", value: (t) => t?.status ?? "" },
                  { header: "Created", value: (t) => t?.createdAt ?? "" },
                ]}
              />
            </>
          }
        />
        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading terminals...</div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            icon={<Smartphone className="size-5" />}
            title={search ? "No matching terminals" : "No terminals registered yet"}
            description={search ? "Try adjusting your search." : "Register a terminal to get started."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Serial</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned operator</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((t) => {
                  const serial = t?.serialNumber ?? t?.serial ?? t?.deviceSerial ?? "—";
                  const model = t?.model ?? t?.deviceModel ?? "—";
                  const status = t?.status ?? "pending";
                  const assignment = t?.deviceAssignments?.[0]?.operator?.user;
                  const assignee = assignment ? `${assignment.firstName ?? ""} ${assignment.lastName ?? ""}`.trim() : "—";
                  return (
                    <TableRow key={t?.id ?? serial} className="cursor-pointer" onClick={() => setOpenId(String(t?.id ?? ""))}>
                      <TableCell className="font-mono text-[13px] font-medium text-[#111827]">{serial}</TableCell>
                      <TableCell>{model}</TableCell>
                      <TableCell><TerminalStatusBadge status={status} /></TableCell>
                      <TableCell className="text-[13px] text-[#374151]">{assignee || "Unassigned"}</TableCell>
                      <TableCell className="text-[13px] text-[#6B7280]">{formatDateTime(t?.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="devices" />
          </>
        )}
      </TableCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
          {selected ? (
            <TerminalDetail
              terminal={selected}
              operators={operators}
              onAssign={(operatorId) => assignMutation.mutate({ operatorId, deviceId: String(selected.id) })}
              onUnassign={(operatorId) => unassignMutation.mutate({ operatorId, deviceId: String(selected.id) })}
              assignPending={assignMutation.isPending}
              unassignPending={unassignMutation.isPending}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TerminalDetail({
  terminal,
  operators,
  onAssign,
  onUnassign,
  assignPending,
  unassignPending,
}: {
  terminal: any;
  operators: any[];
  onAssign: (operatorId: string) => void;
  onUnassign: (operatorId: string) => void;
  assignPending: boolean;
  unassignPending: boolean;
}) {
  const serial = terminal?.serialNumber ?? terminal?.serial ?? "—";
  const currentAssignment = terminal?.deviceAssignments?.[0];
  const assignedOperatorId = currentAssignment?.operatorId;
  const assignedUser = currentAssignment?.operator?.user;
  const assignee = assignedUser ? `${assignedUser.firstName ?? ""} ${assignedUser.lastName ?? ""}`.trim() : null;
  const [pickOperatorId, setPickOperatorId] = useState("");

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <TerminalStatusBadge status={terminal?.status ?? "pending"} />
        </div>
        <SheetTitle className="font-display text-2xl text-[#111827]">{serial}</SheetTitle>
        <SheetDescription>Registered POS device details.</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <DetailList>
          <DetailRow icon={Smartphone} label="Model" value={terminal?.model ?? "—"} />
          <DetailRow icon={User} label="Assigned to" value={assignee ?? "Unassigned"} />
          <DetailRow icon={CalendarClock} label="Created" value={formatDateTime(terminal?.createdAt)} />
        </DetailList>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">Operator assignment</h3>
          {assignee ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[#6B7280]">
                This terminal is assigned to <span className="font-medium text-[#374151]">{assignee}</span>. Only
                they can sign in on it.
              </p>
              <Button
                variant="outline"
                className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                disabled={unassignPending}
                onClick={() => assignedOperatorId && onUnassign(String(assignedOperatorId))}
              >
                <UserMinus className="size-4" /> Unassign terminal
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-[#6B7280]">
                No operator can sign in on this terminal until it's assigned to one.
              </p>
              <div className="flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={pickOperatorId}
                  onChange={setPickOperatorId}
                  placeholder="Select an operator"
                  searchPlaceholder="Search by name or email..."
                  emptyText="No operators found."
                  options={operators.map((op: any) => {
                    const name = op?.user?.firstName
                      ? `${op.user.firstName} ${op.user.lastName ?? ""}`.trim()
                      : op?.user?.email ?? op?.id;
                    return { value: String(op?.id), label: name, sublabel: op?.user?.email };
                  })}
                />
                <Button
                  className="h-11 shrink-0 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95 disabled:opacity-50"
                  disabled={!pickOperatorId || operators.length === 0 || assignPending}
                  onClick={() => {
                    onAssign(pickOperatorId);
                    setPickOperatorId("");
                  }}
                >
                  <UserPlus className="size-4" /> Assign
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RegisterTerminalDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [model, setModel] = useState("");

  const mutation = useMutation({
    mutationFn: (body: { serialNumber: string; model?: string }) => apiPost("/api/v1/pos/devices", body),
    onSuccess: () => {
      toast.success("Terminal registered");
      setSerialNumber("");
      setModel("");
      setOpen(false);
      onCreated();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not register terminal"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95">
          <Plus className="size-4" /> Register terminal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
          <DialogTitle>Register a terminal</DialogTitle>
          <DialogDescription>Add a POS device by its serial number.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-medium text-[#374151]">Serial number</Label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-12345678"
              className="h-11 rounded-[10px]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-medium text-[#374151]">Model (optional)</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. PAX A920"
              className="h-11 rounded-[10px]"
            />
          </div>
        </div>
        <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
          <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!serialNumber.trim() || mutation.isPending}
            className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95 disabled:opacity-50"
            onClick={() => mutation.mutate({ serialNumber: serialNumber.trim(), ...(model.trim() ? { model: model.trim() } : {}) })}
          >
            {mutation.isPending ? "Registering..." : "Register terminal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}