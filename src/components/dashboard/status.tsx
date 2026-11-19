import { Badge } from "@/components/ui/badge";
import { getEventAvailability } from "@/lib/availability";
import { cn } from "@/lib/utils";
import type {
  EventItem,
  Organization,
  OrgStatus,
  RefundStatus,
  TerminalStatus,
  TxStatus,
} from "@/lib/types";

type Variant = "success" | "warning" | "info" | "danger" | "brand" | "muted" | "outline";

function Dot({ variant, label }: { variant: Variant; label: string }) {
  return (
    <Badge variant={variant} className="gap-1.5 rounded-full font-medium whitespace-nowrap">
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function OrgStatusBadge({ status }: { status: OrgStatus }) {
  const map: Record<OrgStatus, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-[#ECFDF3] text-[#166534] ring-1 ring-inset ring-[#BBF7D0]",
    },
    suspended: {
      label: "Suspended",
      className: "bg-[#FEF2F2] text-[#991B1B] ring-1 ring-inset ring-[#FECACA]",
    },
    invited: {
      label: "Invited",
      className: "bg-[#EFF6FF] text-[#1D4ED8] ring-1 ring-inset ring-[#BFDBFE]",
    },
  };
  const item = map[status] ?? map.active;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium leading-4",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

export function EventStatusBadge({ event }: { event: EventItem }) {
  // The backend's only source of truth for event status is `event.status`
  // (an EventStatus enum: DRAFT, PENDING_APPROVAL, REJECTED, APPROVED,
  // PUBLISHED, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED). `approval`
  // and `state` are never populated by the real API, so reading them (as
  // this used to) always fell through to "Draft" regardless of the event's
  // actual status.
  // Spread across every available badge color so adjacent statuses never
  // land on the same shade — Draft and Completed in particular used to
  // both render as plain grey ("muted"), making them indistinguishable
  // at a glance even though they're opposite ends of an event's life.
  const map: Record<string, [Variant, string]> = {
    DRAFT: ["muted", "Draft"],
    PENDING_APPROVAL: ["warning", "Pending review"],
    REJECTED: ["danger", "Rejected"],
    APPROVED: ["brand", "Approved"],
    PUBLISHED: ["info", "Published"],
    SCHEDULED: ["info", "Scheduled"],
    ACTIVE: ["success", "Active"],
    PAUSED: ["warning", "Paused"],
    COMPLETED: ["outline", "Completed"],
    CANCELLED: ["danger", "Cancelled"],
  };
  const item = map[String(event.status ?? "DRAFT")] ?? ["muted", String(event.status ?? "Draft")];
  return <Dot variant={item[0]} label={item[1]} />;
}

export function SalesPhaseBadge({
  event,
  org,
  now,
}: {
  event: EventItem;
  org: Organization | undefined;
  now: Date;
}) {
  try {
    const { phase } = getEventAvailability(event, org, now);
    const map = {
      not_approved: ["outline", "Not on sale"],
      upcoming: ["info", "Sales not open"],
      on_sale: ["brand", "On sale"],
      ended: ["muted", "Sales ended"],
      blocked: ["danger", "Sales blocked"],
    } as const;
    const item = map[phase as keyof typeof map] ?? (["outline", "—"] as const);
    return <Dot variant={item[0] as Variant} label={item[1]} />;
  } catch {
    return <Dot variant="outline" label="—" />;
  }
}

export function TxStatusBadge({ status }: { status: TxStatus | string | undefined }) {
  const map: Record<string, [Variant, string]> = {
    successful: ["success", "Successful"],
    success: ["success", "Successful"],
    completed: ["success", "Successful"],
    failed: ["danger", "Failed"],
    pending: ["warning", "Pending"],
    refunded: ["info", "Refunded"],
  };
  const item = map[String(status ?? "").toLowerCase()] ?? ["muted", String(status ?? "—")];
  return <Dot variant={item[0]} label={item[1]} />;
}

export function RefundStatusBadge({ status }: { status: RefundStatus | string | undefined }) {
  const map: Record<string, [Variant, string]> = {
    requested: ["warning", "Requested"],
    approved: ["info", "Approved"],
    rejected: ["danger", "Rejected"],
    processed: ["success", "Processed"],
  };
  const item = map[String(status ?? "").toLowerCase()] ?? ["muted", String(status ?? "—")];
  return <Dot variant={item[0]} label={item[1]} />;
}

export function TerminalStatusBadge({ status }: { status: TerminalStatus | string | undefined }) {
  const map: Record<string, [Variant, string]> = {
    authorized: ["success", "Authorized"],
    active: ["success", "Authorized"],
    pending: ["warning", "Awaiting authorization"],
    revoked: ["danger", "Revoked"],
    inactive: ["danger", "Revoked"],
  };
  const item = map[String(status ?? "").toLowerCase()] ?? ["muted", String(status ?? "—")];
  return <Dot variant={item[0]} label={item[1]} />;
}

export function ActiveBadge({ active, on = "Active", off = "Suspended" }: { active: boolean; on?: string; off?: string }) {
  return <Dot variant={active ? "success" : "danger"} label={active ? on : off} />;
}
