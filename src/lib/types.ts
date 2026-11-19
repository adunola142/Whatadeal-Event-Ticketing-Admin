export type OrgStatus = "active" | "suspended" | "invited";

export interface Organization {
  id: string;
  name: string;
  status: OrgStatus;
  isActive?: boolean | undefined;
  city?: string | undefined;
  contactName?: string | undefined;
  contactEmail?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  description?: string | undefined;
  website?: string | undefined;
  joinedAt?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  admins?: { name: string; email: string; role: "Owner" | "Manager" | "Finance" }[] | undefined;
}

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";
export type EventStatus = "DRAFT" | "PENDING_APPROVAL" | "REJECTED" | "APPROVED" | "PUBLISHED" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type EventState = "active" | "paused" | "suspended" | "cancelled";

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  capacity: number;
  soldQuantity?: number | undefined;
}

export interface EventItem {
  id: string;
  orgId?: string | undefined;
  organizationId?: string | undefined;
  name?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
  venue?: string | undefined;
  city?: string | undefined;
  address?: string | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  salesStart?: string | undefined;
  salesEnd?: string | undefined;
  description?: string | undefined;
  approval?: ApprovalStatus | undefined;
  status?: EventStatus | undefined;
  state?: EventState | undefined;
  published?: boolean | undefined;
  isPublic?: boolean | undefined;
  hue?: number | undefined;
  bannerUrl?: string | undefined;
  bannerImage?: string | undefined;
  maxCapacity?: number | undefined;
  createdBy?: "whatadeal" | "organizer" | undefined;
  submittedAt?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  reviewNote?: string | undefined;
  rejectionReason?: string | undefined;
  ticketCategories?: TicketCategory[] | undefined;
  operatorIds?: string[] | undefined;
  terminalIds?: string[] | undefined;
}

export interface Operator {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "suspended";
  joinedAt: string;
}

export type TerminalStatus = "authorized" | "pending" | "revoked";

export interface Terminal {
  id: string;
  serial: string;
  model: string;
  status: TerminalStatus;
  lastSeenAt: string;
  operatorId?: string | undefined;
  battery: number;
  appVersion: string;
}

export type TxStatus = "successful" | "failed" | "pending" | "refunded";

export interface Transaction {
  id: string;
  ref: string;
  eventId: string;
  orgId: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: TxStatus;
  method: "Visa" | "Mastercard" | "Verve";
  cardLast4: string;
  operatorId: string;
  terminalId: string;
  createdAt: string;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  failureReason?: string | undefined;
}

export type RefundStatus = "requested" | "approved" | "rejected" | "processed";

export interface Refund {
  id: string;
  transactionId: string;
  orgId: string;
  eventId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  requestedAt: string;
  resolvedAt?: string | undefined;
}

export interface Settlement {
  id: string;
  orgId: string;
  periodLabel: string;
  gross: number;
  fees: number;
  refunds: number;
  net: number;
  status: "pending" | "paid";
  paidAt?: string | undefined;
}

export type AuditCategory = "organization" | "event" | "pos" | "payment" | "settings" | "access";

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: "Super Admin" | "Organizer" | "System";
  action: string;
  target: string;
  category: AuditCategory;
}

export type AdminRole = "Super Admin" | "Operations" | "Finance" | "Support";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "invited" | "disabled";
  lastActiveAt?: string | undefined;
}

export interface PlatformSettings {
  platformFeePercent: number;
  requireApproval: boolean;
  autoExpire: boolean;
  allowOrganizerRefundRequests: boolean;
  paymentProvider: string;
  receiptFooter: string;
  supportEmail: string;
  maxTicketsPerTransaction: number;
}

export type Viewer = { role: "super_admin" } | { role: "organizer"; orgId: string };
