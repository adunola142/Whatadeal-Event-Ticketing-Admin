import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Eye, MapPin, Plus, Send, Smartphone, Trash2, Upload, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DetailList, DetailRow } from "@/components/dashboard/detail-row";
import { EventThumb, PageHeader } from "@/components/dashboard/page";
import {
  SegmentedTabs,
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { EventStatusBadge, SalesPhaseBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { useCurrentUser } from "@/lib/hooks";
import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/lib/format";
import type { EventItem, Organization } from "@/lib/types";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events · Whatadeal Ticketing Admin" },
      { name: "description", content: "Review, approve and manage events across every organization." },
      { property: "og:title", content: "Events · Whatadeal Ticketing Admin" },
      { property: "og:description", content: "Review, approve and manage events across every organization." },
    ],
  }),
  component: EventsPage,
});

type TabKey = "all" | "pending" | "approved" | "draft" | "rejected" | "blocked" | "past";

const filters: Record<TabKey, (e: EventItem, now: Date) => boolean> = {
  all: () => true,
  pending: (e) => e.status === "PENDING_APPROVAL",
  approved: (e, now) =>
    (e.status === "APPROVED" || e.status === "PUBLISHED" || e.status === "ACTIVE") &&
    new Date(e.endDate ?? e.endsAt ?? "") > now,
  draft: (e) => e.status === "DRAFT",
  rejected: (e) => e.status === "REJECTED",
  blocked: (e) => e.status === "PAUSED" || e.status === "CANCELLED",
  past: (e, now) => e.status === "COMPLETED" || new Date(e.endDate ?? e.endsAt ?? "") < now,
};

function EventsPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "admin" || user?.role === "super_admin";
  // Matches the backend's @Roles on POST /events and PATCH /events/:id/submit —
  // org admins and event managers can create and submit events, only Super
  // Admin can approve/publish/activate them (that stays gated on isAdmin).
  const canManageEvents =
    isAdmin ||
    user?.role === "ORG_ADMIN" ||
    user?.role === "org_admin" ||
    user?.role === "EVENT_MANAGER" ||
    user?.role === "event_manager";
  const now = new Date();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiGetList<EventItem>("/api/v1/events"),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations"),
    enabled: isAdmin,
  });

  const orgLookup = new Map(organizations.map((o) => [o.id, o]));
  const count = (k: TabKey) => events.filter((e) => filters[k](e, now)).length;

  const rows = events
    .filter((e) => filters[tab](e, now))
    .filter((e) => `${e.title ?? e.name} ${e.venue ?? ""} ${e.city ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.startDate ?? a.startsAt ?? "").localeCompare(b.startDate ?? b.startsAt ?? ""));

  useEffect(() => setPage(1), [tab, q]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const colSpan = isAdmin ? 6 : 5;
  const selected = events.find((e) => e.id === openId);

  return (
    <div>
      <PageHeader
        eyebrow="Manage"
        title="Events"
        description={
          isAdmin
            ? "All events across the platform. Approve submissions, push approved events to POS or pause sales. Sales close automatically when the window ends."
            : "Create events, configure tickets and submit them to Whatadeal for approval."
        }
        actions={
          <ExportButton
            filename="events"
            rows={rows}
            columns={[
              { header: "Event", value: (e) => e.title ?? e.name ?? "" },
              { header: "Organization", value: (e) => orgLookup.get(e.orgId ?? e.organizationId ?? "")?.name ?? "" },
              { header: "Venue", value: (e) => e.venue ?? "" },
              { header: "City", value: (e) => e.city ?? "" },
              { header: "Start Date", value: (e) => e.startDate ?? e.startsAt ?? "" },
              { header: "Status", value: (e) => e.status ?? "" },
            ]}
          />
        }
      />

      <TableCard>
        <TableToolbar
          className="xl:flex-row xl:items-center xl:justify-between"
          left={
            <SegmentedTabs
              value={tab}
              onChange={(v) => setTab(v)}
              tabs={[
                { value: "all", label: "All", count: count("all") },
                { value: "pending", label: "Pending", count: count("pending") },
                { value: "approved", label: "Approved", count: count("approved") },
                { value: "draft", label: "Drafts", count: count("draft") },
                { value: "rejected", label: "Rejected", count: count("rejected") },
                { value: "blocked", label: "Paused", count: count("blocked") },
                { value: "past", label: "Completed", count: count("past") },
              ]}
            />
          }
          right={
            <>
              <TableSearch value={q} onChange={setQ} placeholder="Search events..." />
              <Button asChild className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95">
                <Link to="/events/new">
                  <Plus className="size-4" /> Create event
                </Link>
              </Button>
            </>
          }
        />

        {rows.length === 0 ? (
          <TableEmptyState
            icon={<Plus className="size-5" />}
            title={q || tab !== "all" ? "No matching events" : "No events yet"}
            description={
              q || tab !== "all" ? "Try adjusting your search or filters." : "Create your first event to get started."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[240px]">Event</TableHead>
                  {isAdmin && <TableHead>Organization</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead className="w-[200px]">Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((e) => {
                  const categories = e.ticketCategories ?? [];
                  const totalCap = categories.reduce((s, c) => s + c.capacity, 0);
                  const totalSold = categories.reduce((s, c) => s + (c.soldQuantity ?? 0), 0);
                  const soldProgress = totalCap ? (totalSold / totalCap) * 100 : 0;
                  return (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <EventThumb hue={e.hue ?? 0} url={e.bannerUrl} className="size-10 shrink-0 rounded-[10px]" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#111827]">{e.title ?? e.name}</p>
                            <p className="truncate text-[12px] text-[#6B7280]">
                              {e.venue} · {e.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-[14px] text-[#374151]">
                          {orgLookup.get(e.orgId ?? e.organizationId ?? "")?.name ?? "—"}
                          {e.createdBy === "whatadeal" && (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase text-primary">HQ</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">
                        <p className="text-[#374151]">{formatDate(e.startDate ?? e.startsAt ?? "")}</p>
                        <p className="text-[12px] text-[#6B7280]">{formatTime(e.startDate ?? e.startsAt ?? "")}</p>
                      </TableCell>
                      <TableCell>
                        <EventStatusBadge event={e} />
                      </TableCell>
                      <TableCell>
                        <SalesPhaseBadge event={e} org={orgLookup.get(e.orgId ?? e.organizationId ?? "")} now={now} />
                      </TableCell>
                      <TableCell>
                        <Progress value={soldProgress} className="h-1.5" />
                        <p className="mt-1 text-[12px] tabular-nums text-[#6B7280]">
                          {formatNumber(totalSold)} of {formatNumber(totalCap)}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination page={safePage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} noun="events" />
          </>
        )}
      </TableCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
          {selected ? (
            <EventDetail
              event={selected}
              isAdmin={isAdmin}
              canManageEvents={canManageEvents}
              orgName={orgLookup.get(selected.orgId ?? selected.organizationId ?? "")?.name}
              now={now}
              onDeleted={() => setOpenId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventDetail({
  event,
  isAdmin,
  canManageEvents,
  orgName,
  now,
  onDeleted,
}: {
  event: EventItem;
  isAdmin: boolean;
  canManageEvents: boolean;
  orgName?: string | undefined;
  now: Date;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ["event", event.id],
    queryFn: () => apiGet<EventItem>(`/api/v1/events/${event.id}`),
    retry: false,
  });
  const ev: EventItem = { ...event, ...(detail ?? {}) };

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => apiGetList<any>("/api/v1/pos/operators"),
    enabled: isAdmin,
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["event", event.id] });
  };

  const submitMutation = useMutation({
    mutationFn: () => apiPatch(`/api/v1/events/${event.id}/submit`),
    onSuccess: () => {
      toast.success("Event submitted for approval");
      refresh();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not submit event"),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiPatch(`/api/v1/events/${event.id}/approve`),
    onSuccess: () => {
      toast.success("Event approved");
      refresh();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not approve event"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiPatch(`/api/v1/events/${event.id}/reject`, { reason: rejectReason.trim() }),
    onSuccess: () => {
      toast.success("Event rejected");
      setRejectReason("");
      refresh();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not reject event"),
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (ev.status === "APPROVED") await apiPatch(`/api/v1/events/${event.id}/publish`);
      await apiPatch(`/api/v1/events/${event.id}/activate`);
    },
    onSuccess: () => {
      toast.success("Event pushed to POS");
      refresh();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not push event to POS"),
  });

  const assignMutation = useMutation({
    mutationFn: (opId: string) => apiPost("/api/v1/pos/assignments", { operatorId: opId, eventId: event.id }),
    onSuccess: () => {
      toast.success("Operator assigned to event");
      setOperatorId("");
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not assign operator"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/v1/events/${event.id}`),
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onDeleted();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not delete event");
      setConfirmingDelete(false);
    },
  });

  const canSubmit = (ev.status === "DRAFT" || ev.status === "REJECTED") && canManageEvents;
  const canPush = ev.status === "APPROVED" || ev.status === "PUBLISHED" || ev.status === "SCHEDULED";
  const canApprove = ev.status === "PENDING_APPROVAL";
  const canAssign = ev.status === "APPROVED" || ev.status === "PUBLISHED" || ev.status === "SCHEDULED" || ev.status === "ACTIVE";
  const categories = ev.ticketCategories ?? [];
  const totalCap = categories.reduce((s, c) => s + (c.capacity ?? 0), 0);

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge event={ev} />
          <SalesPhaseBadge event={ev} org={undefined} now={now} />
        </div>
        <SheetTitle className="font-display text-2xl text-[#111827]">{ev.title ?? ev.name}</SheetTitle>
        <SheetDescription>{orgName ? `${orgName} · ` : ""}{ev.venue ?? "—"}{ev.city ? `, ${ev.city}` : ""}</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <EventThumb hue={ev.hue ?? 0} url={ev.bannerUrl ?? ev.bannerImage} className="aspect-[16/9] w-full rounded-[12px]" />

        <DetailList>
          <DetailRow icon={CalendarClock} label="Starts" value={formatDateTime(ev.startDate ?? ev.startsAt)} />
          <DetailRow icon={CalendarClock} label="Ends" value={formatDateTime(ev.endDate ?? ev.endsAt)} />
          <DetailRow icon={MapPin} label="Venue" value={ev.venue || "—"} />
          <DetailRow icon={MapPin} label="Address" value={ev.address || "—"} />
          <DetailRow
            icon={Users}
            label="Capacity"
            value={ev.maxCapacity ? formatNumber(ev.maxCapacity) : formatNumber(totalCap)}
          />
          <DetailRow icon={Eye} label="Visibility" value={ev.isPublic === false ? "Private" : "Public"} />
        </DetailList>

        {ev.description ? (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-[#111827]">About</h3>
            <p className="whitespace-pre-line text-sm text-[#374151]">{ev.description}</p>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">Ticket categories</h3>
          <ul className="divide-y divide-[#F0EBE4] rounded-[12px] border border-[#E8E2DA]">
            {categories.length === 0 ? (
              <li className="px-3 py-4 text-sm text-[#6B7280]">No ticket categories yet.</li>
            ) : (
              categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="text-[#374151]">{c.name}</span>
                  <span className="tabular-nums text-[#6B7280]">
                    {formatNumber(c.price)} · {formatNumber(c.soldQuantity ?? 0)} of {formatNumber(c.capacity)} sold
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {canSubmit ? (
          <div className="grid gap-3 rounded-[12px] border border-[#E8E2DA] bg-[#FAF8F5] p-4">
            <h3 className="text-sm font-semibold text-[#111827]">
              {ev.status === "REJECTED" ? "Rejected — make changes and resubmit" : "Ready to go live?"}
            </h3>
            {ev.status === "REJECTED" && ev.rejectionReason ? (
              <p className="rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">{ev.rejectionReason}</p>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Submit this event for Whatadeal&apos;s review before it can be approved and pushed to POS.
              </p>
            )}
            <Button
              className="h-11 rounded-[10px] bg-brand-gradient text-white hover:opacity-95"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              <Upload className="size-4" /> {submitMutation.isPending ? "Submitting..." : "Submit for approval"}
            </Button>
          </div>
        ) : null}

        {isAdmin && (canPush || canApprove) ? (
          <div className="grid gap-3 rounded-[12px] border border-[#E8E2DA] bg-[#FAF8F5] p-4">
            <h3 className="text-sm font-semibold text-[#111827]">Whatadeal actions</h3>
            {canApprove ? (
              <>
                <Button
                  className="h-11 rounded-[10px] bg-brand-gradient text-white hover:opacity-95"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  <CheckCircle2 className="size-4" /> Approve event
                </Button>
                <div className="grid gap-1.5">
                  <Label className="text-[13px] font-medium text-[#374151]">Rejection reason</Label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tell the organizer what to fix"
                    className="h-11 rounded-[10px]"
                  />
                  <Button
                    variant="outline"
                    className="h-11 rounded-[10px] border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                  >
                    <XCircle className="size-4" /> Reject event
                  </Button>
                </div>
              </>
            ) : null}
            {canPush ? (
              <Button
                className="h-11 rounded-[10px] bg-brand-gradient text-white hover:opacity-95"
                disabled={pushMutation.isPending}
                onClick={() => pushMutation.mutate()}
              >
                <Send className="size-4" />{" "}
                {pushMutation.isPending ? "Pushing..." : ev.status === "APPROVED" ? "Publish & push to POS" : "Push to POS"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {isAdmin && canAssign ? (
          <div className="grid gap-3 rounded-[12px] border border-[#E8E2DA] p-4">
            <h3 className="text-sm font-semibold text-[#111827]">Assign POS operator</h3>
            <div className="flex gap-2">
              <Select value={operatorId} onValueChange={setOperatorId}>
                <SelectTrigger className="h-11 flex-1 rounded-[10px]">
                  <SelectValue placeholder={operators.length ? "Select operator" : "No operators yet"} />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op: any) => {
                    const label = op?.user
                      ? `${op.user.firstName ?? ""} ${op.user.lastName ?? ""}`.trim() || op.user.email
                      : op?.employeeId ?? op?.id;
                    return (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-11 shrink-0 rounded-[10px] border-[#E8E2DA] px-4"
                disabled={!operatorId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(operatorId)}
              >
                <Smartphone className="size-4" /> Assign
              </Button>
            </div>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="grid gap-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <h3 className="text-sm font-semibold text-[#991B1B]">Danger zone</h3>
            <p className="text-sm text-[#991B1B]/80">
              Permanently deletes this event. Only possible while it has no transactions yet — once a
              ticket has sold, cancel the event instead.
            </p>
            {confirmingDelete ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1 rounded-[10px]"
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-10 flex-1 rounded-[10px] bg-[#DB2B33] text-white hover:bg-[#B91C1C]"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  <Trash2 className="size-4" />{" "}
                  {deleteMutation.isPending ? "Deleting..." : "Yes, delete permanently"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-10 justify-start rounded-[10px] border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="size-4" /> Delete event
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
