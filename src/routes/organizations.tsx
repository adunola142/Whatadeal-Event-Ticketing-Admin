import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Building2,
  CheckCircle2,
  Eye,
  KeyRound,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Send,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DetailList, DetailRow } from "@/components/dashboard/detail-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, SectionCard, StatCard, SuperAdminGate } from "@/components/dashboard/page";
import {
  SegmentedTabs,
  TableCard,
  TableEmptyState,
  TableFilterButton,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { EventStatusBadge, OrgStatusBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { CredentialRow } from "@/components/dashboard/credential-row";
import { useCurrentUser } from "@/lib/hooks";
import { apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import { formatNaira, formatNumber, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { generateTempPassword } from "@/lib/password";
import type { EventItem, Organization, OrgStatus, Transaction } from "@/lib/types";

const PAGE_SIZE = 10;

const joinedFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

function formatJoined(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return joinedFmt.format(d);
}

const AVATAR_STYLES = [
  "bg-[#FFF1E8] text-[#C2410C]",
  "bg-[#EFF6FF] text-[#1D4ED8]",
  "bg-[#ECFDF3] text-[#166534]",
  "bg-[#F5F3FF] text-[#6D28D9]",
  "bg-[#FEF2F2] text-[#B91C1C]",
  "bg-[#ECFEFF] text-[#0E7490]",
  "bg-[#FFFBEB] text-[#B45309]",
  "bg-[#FDF2F8] text-[#BE185D]",
];

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_STYLES[Math.abs(hash) % AVATAR_STYLES.length];
}

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations · Whatadeal Ticketing Admin" },
      { name: "description", content: "Onboard, activate and suspend event-organizing organizations." },
      { property: "og:title", content: "Organizations · Whatadeal Ticketing Admin" },
      { property: "og:description", content: "Onboard, activate and suspend event-organizing organizations." },
    ],
  }),
  component: () => (
    <SuperAdminGate what="Organizations">
      <AdminOrganizations />
    </SuperAdminGate>
  ),
});

/* ---------- Admin: all organizations ---------- */

type EventFilter = "all" | "with" | "without";

function AdminOrganizations() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | OrgStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    data: organizations = [],
    isLoading: orgsLoading,
    isError: orgsError,
    error: orgsErrorObj,
    refetch: refetchOrgs,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations"),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGetList<EventItem>("/api/v1/events"),
    retry: false,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiGetList<Transaction>("/api/v1/pos/transactions"),
    retry: false,
  });

  const eventsByOrg = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const id = e.orgId ?? e.organizationId;
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const grossByOrg = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const status = String((t as any).status ?? "").toLowerCase();
      const orgId = (t as any).event?.organizationId ?? (t as any).orgId;
      if (!orgId || !["completed", "successful", "success"].includes(status)) continue;
      map.set(orgId, (map.get(orgId) ?? 0) + (Number((t as any).totalAmount ?? (t as any).amount) || 0));
    }
    return map;
  }, [transactions]);

  const count = (s: OrgStatus) => organizations.filter((o) => o.status === s).length;

  const filtered = organizations.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    const evCount = eventsByOrg.get(o.id) ?? 0;
    if (eventFilter === "with" && evCount === 0) return false;
    if (eventFilter === "without" && evCount > 0) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const hay = [o.name, o.contactName, o.contactEmail ?? o.email].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(needle);
  });

  useEffect(() => {
    setPage(1);
  }, [q, tab, eventFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => apiPatch(`/api/v1/organizations/${id}/toggle-active`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  function setOrgStatus(id: string, status: OrgStatus) {
    statusMutation.mutate(
      { id },
      {
        onSuccess: () => {
          const label = status === "active" ? "activated" : status === "suspended" ? "suspended" : "updated";
          toast.success(`Organization ${label}`);
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Could not update organization");
        },
      },
    );
  }

  const isPristine = q.trim() === "" && tab === "all" && eventFilter === "all";
  const hasNoOrganizations = organizations.length === 0;
  const statusPending = statusMutation.isPending;

  return (
    <div>
      <PageHeader
        eyebrow="Manage"
        title="Organizations"
        description="Every event-organizing company on Whatadeal. Onboard new ones, invite their admins and control access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              filename="organizations"
              rows={filtered}
              columns={[
                { header: "Organization", value: (o) => o.name ?? "" },
                { header: "Primary Contact", value: (o) => o.contactName ?? "" },
                { header: "Email", value: (o) => o.contactEmail ?? o.email ?? "" },
                { header: "Status", value: (o) => o.status ?? "" },
                { header: "Events", value: (o) => eventsByOrg.get(o.id) ?? 0 },
                { header: "Gross Sales", value: (o) => grossByOrg.get(o.id) ?? 0 },
                { header: "Joined", value: (o) => o.joinedAt ?? o.createdAt ?? "" },
              ]}
            />
            <OnboardDialog />
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total" value={organizations.length} icon={<Building2 />} iconTone="primary" />
        <StatCard label="Active" value={count("active")} iconTone="success" />
        <StatCard label="Suspended" value={count("suspended")} iconTone="violet" />
        <StatCard label="Invited" value={count("invited")} hint="Awaiting first sign-in" iconTone="info" />
      </div>

      <TableCard>
        <TableToolbar
          left={
            <SegmentedTabs
              value={tab}
              onChange={(v) => setTab(v)}
              tabs={[
                { value: "all", label: "All", count: organizations.length },
                { value: "active", label: "Active", count: count("active") },
                { value: "suspended", label: "Suspended", count: count("suspended") },
                { value: "invited", label: "Invited", count: count("invited") },
              ]}
            />
          }
          right={
            <>
              <TableSearch
                value={q}
                onChange={setQ}
                placeholder="Search organizations..."
              />
              <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                <DropdownMenuTrigger asChild>
                  <TableFilterButton active={eventFilter !== "all"} label="Filter" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setEventFilter("all")}>
                    <CheckCircle2 className={cn(eventFilter !== "all" && "opacity-0")} /> All organizations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventFilter("with")}>
                    <CheckCircle2 className={cn(eventFilter !== "with" && "opacity-0")} /> With events
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventFilter("without")}>
                    <CheckCircle2 className={cn(eventFilter !== "without" && "opacity-0")} /> Without events
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {orgsLoading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading organizations...</div>
        ) : orgsError ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <h3 className="font-display text-[16px] font-semibold text-[#111827]">Could not load organizations</h3>
            <p className="mt-1 max-w-sm text-[14px] leading-5 text-[#6B7280]">
              {orgsErrorObj instanceof Error ? orgsErrorObj.message : "Something went wrong while fetching organizations."}
            </p>
            <Button
              variant="outline"
              className="mt-5 h-11 rounded-[10px] border-[#E8E2DA] px-4"
              onClick={() => void refetchOrgs()}
            >
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            title={hasNoOrganizations && isPristine ? "No organizations found" : "No matching organizations"}
            description={
              hasNoOrganizations && isPristine
                ? "Onboard your first organization to get started."
                : "Try adjusting your search or filters."
            }
            action={hasNoOrganizations && isPristine ? <OnboardDialog /> : undefined}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px]">Organization</TableHead>
                  <TableHead className="min-w-[150px]">Primary Contact</TableHead>
                  <TableHead className="min-w-[220px]">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[56px] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((o) => {
                  const email = o.contactEmail ?? o.email ?? "—";
                  const evCount = eventsByOrg.get(o.id) ?? 0;
                  const gross = grossByOrg.get(o.id) ?? 0;
                  return (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpenId(o.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-[36px] rounded-full">
                            <AvatarFallback
                              className={cn(
                                "rounded-full text-[12px] font-semibold",
                                avatarStyle(o.name),
                              )}
                            >
                              {initials(o.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-[#111827]">{o.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[14px] text-[#374151]">{o.contactName || "—"}</TableCell>
                      <TableCell className="max-w-[240px] text-[13px] text-[#6B7280]">
                        <span className="block truncate" title={email}>
                          {email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <OrgStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right text-[14px] font-medium tabular-nums text-[#374151]">
                        {formatNumber(evCount)}
                      </TableCell>
                      <TableCell className="text-right text-[14px] font-medium tabular-nums text-[#374151]">
                        {gross > 0 ? formatNaira(gross) : "—"}
                      </TableCell>
                      <TableCell className="text-[13px] text-[#6B7280]">
                        {formatJoined(o.joinedAt ?? o.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <OrgActions org={o} onView={() => setOpenId(o.id)} setStatus={setOrgStatus} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              noun="organizations"
            />
          </>
        )}
      </TableCard>

      <OrgSheet
        id={openId}
        onClose={() => setOpenId(null)}
        setOrgStatus={setOrgStatus}
        statusPending={statusPending}
      />
    </div>
  );
}

/* ---------- Org actions dropdown ---------- */

function OrgActions({
  org,
  onView,
  setStatus,
}: {
  org: Organization;
  onView: () => void;
  setStatus: (id: string, s: OrgStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${org.name}`}
          className="h-8 w-8 rounded-[8px] text-[#6B7280] hover:bg-[#FAF8F5] hover:text-[#111827]"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye /> View organization
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onView}>
          <Pencil /> Edit organization
        </DropdownMenuItem>
        {org.status === "invited" && (
          <DropdownMenuItem onClick={() => toast.success(`Invitation re-sent to ${org.contactEmail ?? org.email}`)}>
            <Send /> Resend invitation
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {org.status === "suspended" || org.status === "invited" ? (
          <DropdownMenuItem
            onClick={() => {
              setStatus(org.id, "active");
            }}
          >
            <CheckCircle2 /> Activate organization
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-[#B91C1C] focus:bg-[#FEF2F2] focus:text-[#991B1B] [&>svg]:text-[#DC2626]"
            onClick={() => {
              setStatus(org.id, "suspended");
              toast(`${org.name} suspended`, { description: "Their events are blocked from POS sales." });
            }}
          >
            <Ban /> Suspend organization
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Organization detail sheet ---------- */

function isOrgActive(o: Organization) {
  return typeof o.isActive === "boolean" ? o.isActive : o.status === "active";
}

function OrgSheet({
  id,
  onClose,
  setOrgStatus,
  statusPending,
}: {
  id: string | null;
  onClose: () => void;
  setOrgStatus: (id: string, s: OrgStatus) => void;
  statusPending: boolean;
}) {
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations"),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGetList<EventItem>("/api/v1/events"),
  });

  const org = organizations.find((o) => o.id === id);
  const evs = org ? events.filter((e) => (e.orgId ?? e.organizationId) === org.id) : [];

  return (
    <Sheet open={!!org} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
        {org && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <OrgStatusBadge status={isOrgActive(org) ? "active" : "suspended"} />
              </div>
              <SheetTitle className="font-display text-2xl text-[#111827]">{org.name}</SheetTitle>
              <SheetDescription>{org.description || "No description yet."}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <div className="grid grid-cols-3 gap-3">
                <Mini label="Events" value={evs.length.toString()} />
                <Mini label="Status" value={org.status} />
                <Mini label="Joined" value={formatJoined(org.joinedAt ?? org.createdAt)} />
              </div>
              <DetailList>
                <DetailRow icon={User} label="Contact" value={org.contactName || "—"} />
                <DetailRow icon={Mail} label="Email" value={org.contactEmail ?? org.email ?? "—"} />
                <DetailRow icon={Phone} label="Phone" value={org.phone || "—"} />
                <DetailRow icon={MapPin} label="Address" value={org.address || "—"} />
              </DetailList>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Administrators</h3>
                <ul className="divide-y divide-[#F0EBE4] rounded-[12px] border border-[#E8E2DA]">
                  {(org.admins ?? []).length === 0 ? (
                    <li className="px-3 py-4 text-sm text-[#6B7280]">No administrators yet.</li>
                  ) : (
                    (org.admins ?? []).map((a) => (
                      <li key={a.email} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <span className="text-[#374151]">
                          {a.name} <span className="text-[#6B7280]">· {a.email}</span>
                        </span>
                        <span className="text-xs text-[#6B7280]">{a.role}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Events</h3>
                <ul className="divide-y divide-[#F0EBE4] rounded-[12px] border border-[#E8E2DA]">
                  {evs.length === 0 && <li className="px-3 py-4 text-sm text-[#6B7280]">No events yet.</li>}
                  {evs.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <span className="truncate text-[#374151]">{e.name ?? e.title}</span>
                      <EventStatusBadge event={e} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                {isOrgActive(org) ? (
                  <Button
                    variant="outline"
                    className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                    disabled={statusPending}
                    onClick={() => setOrgStatus(org.id, "suspended")}
                  >
                    <Ban className="size-4" /> Deactivate organization
                  </Button>
                ) : (
                  <Button
                    className="bg-brand-gradient text-white hover:opacity-95"
                    disabled={statusPending}
                    onClick={() => setOrgStatus(org.id, "active")}
                  >
                    <CheckCircle2 className="size-4" /> Activate organization
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
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

/* ---------- Onboard dialog ---------- */

const emptyOnboard = {
  name: "",
  email: "",
  phone: "",
  address: "",
  description: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPassword: "",
};

function OnboardDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyOnboard);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const valid =
    form.name.trim() &&
    form.adminFirstName.trim() &&
    form.adminLastName.trim() &&
    /\S+@\S+\.\S+/.test(form.adminEmail) &&
    form.adminPassword.length >= 8;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/api/v1/organizations", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setCreated(null);
    setForm({ ...emptyOnboard, adminPassword: next ? generateTempPassword() : "" });
  }

  function submit() {
    const body = {
      name: form.name.trim(),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.address.trim() ? { address: form.address.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      admin: {
        firstName: form.adminFirstName.trim(),
        lastName: form.adminLastName.trim(),
        email: form.adminEmail.trim(),
        password: form.adminPassword,
      },
    };
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success(`${form.name.trim()} onboarded`);
        setCreated({ name: form.name.trim(), email: form.adminEmail.trim(), password: form.adminPassword });
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not onboard organization");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-[14px] font-medium text-white shadow-[0_6px_16px_rgba(249,115,22,0.22)] hover:opacity-95">
          <Plus className="size-4" /> Onboard organization
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[600px] gap-0 overflow-hidden p-0">
        {created ? (
          <>
            <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
              <DialogTitle>Organization created</DialogTitle>
              <DialogDescription>
                Share these login details with the administrator. The temporary password is only shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 px-6 py-5">
              <CredentialRow label="Organization" value={created.name} />
              <CredentialRow label="Admin login email" value={created.email} />
              <CredentialRow label="Temporary password" value={created.password} />
            </div>
            <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
              <Button
                className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
              <DialogTitle>Onboard an organization</DialogTitle>
              <DialogDescription>
                Creates the organization and an administrator account with a temporary password.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Organization</p>
              <Field label="Organization name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Lagos Live Co."
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="info@company.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                  />
                </Field>
              </div>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Victoria Island, Lagos"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the organization"
                />
              </Field>

              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Organization administrator
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input
                    value={form.adminFirstName}
                    onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })}
                    placeholder="Adaeze"
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={form.adminLastName}
                    onChange={(e) => setForm({ ...form, adminLastName: e.target.value })}
                    placeholder="Okonkwo"
                  />
                </Field>
              </div>
              <Field label="Admin login email">
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                />
              </Field>
              <Field label="Temporary password">
                <div className="flex gap-2">
                  <Input
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 rounded-[10px] border-[#E8E2DA] px-3"
                    onClick={() => setForm({ ...form, adminPassword: generateTempPassword() })}
                  >
                    <RefreshCw className="size-4" /> Generate
                  </Button>
                </div>
                <p className="text-[12px] text-[#6B7280]">
                  At least 8 characters. The administrator can change it after signing in.
                </p>
              </Field>
            </div>
            <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
              <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!valid || createMutation.isPending}
                className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white shadow-[0_6px_16px_rgba(249,115,22,0.22)] hover:opacity-95 disabled:opacity-50"
                onClick={submit}
              >
                <KeyRound className="size-4" /> {createMutation.isPending ? "Creating..." : "Create organization"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[13px] font-medium text-[#374151]">{label}</Label>
      {children}
    </div>
  );
}
