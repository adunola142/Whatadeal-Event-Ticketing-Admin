import type { EventItem, Operator, Organization, Terminal } from "./types";

export interface AvailabilityCheck {
  key: "approved" | "published" | "window" | "active" | "org";
  label: string;
  passed: boolean;
}

export type SalesPhase = "not_approved" | "upcoming" | "on_sale" | "ended" | "blocked";

/**
 * Rules from the proposal: an event can only take POS sales when it has
 * cleared approval, is inside its sales window, its status is ACTIVE (not
 * paused/cancelled/completed), and its organization is active.
 *
 * The backend's only source of truth for an event's progress is the real
 * `status` enum (DRAFT → PENDING_APPROVAL → APPROVED → PUBLISHED →
 * SCHEDULED → ACTIVE → COMPLETED/CANCELLED, with PAUSED as a side branch
 * off ACTIVE) — `approval`, `state`, and `published` are legacy fields the
 * real API never populates, so deriving availability from them (as this
 * used to) always produced "not approved" regardless of the event's real
 * progress. This reads `status` directly instead.
 */
export function getEventAvailability(event: EventItem, org: Organization | undefined, now: Date) {
  const t = now.getTime();
  const start = new Date(event.startDate ?? event.salesStart ?? "").getTime();
  const end = new Date(event.endDate ?? event.salesEnd ?? "").getTime();
  const status = event.status;

  const neverApproved = status === "DRAFT" || status === "PENDING_APPROVAL" || status === "REJECTED" || !status;
  const orgActive = org?.isActive ?? org?.status === "active";

  const checks: AvailabilityCheck[] = [
    { key: "approved", label: "Approved by Whatadeal", passed: !neverApproved },
    {
      key: "published",
      label: "Published and eligible for sales",
      passed: status === "PUBLISHED" || status === "SCHEDULED" || status === "ACTIVE" || status === "COMPLETED",
    },
    { key: "window", label: "Within the configured sales window", passed: t >= start && t <= end },
    { key: "active", label: "Event status is Active", passed: status === "ACTIVE" },
    { key: "org", label: "Organization is active", passed: orgActive },
  ];

  const sellable = checks.every((c) => c.passed);

  let phase: SalesPhase;
  if (neverApproved) phase = "not_approved";
  else if (status === "COMPLETED" || status === "CANCELLED" || t > end) phase = "ended";
  else if (sellable) phase = "on_sale";
  else if (status === "PAUSED" || !orgActive) phase = "blocked";
  else phase = "upcoming";

  return { sellable, phase, checks };
}

/** Whether a specific operator on a specific terminal may sell this event right now. */
export function canOperatorSell(
  event: EventItem,
  org: Organization | undefined,
  operator: Operator,
  terminal: Terminal,
  now: Date,
) {
  const base = getEventAvailability(event, org, now);
  const reasons: string[] = base.checks.filter((c) => !c.passed).map((c) => c.label);
  if (!(event.operatorIds ?? []).includes(operator.id)) reasons.push("Operator is assigned to the event");
  if (operator.status !== "active") reasons.push("Operator account is active");
  if (terminal.status !== "authorized") reasons.push("POS device is authorized");
  if (!(event.terminalIds ?? []).includes(terminal.id)) reasons.push("POS device is assigned to the event");
  return { allowed: reasons.length === 0, failed: reasons };
}
