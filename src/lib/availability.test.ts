import { describe, expect, it } from "vitest";
import { canOperatorSell, getEventAvailability } from "./availability";
import type { EventItem, Operator, Organization, Terminal } from "./types";

const now = new Date("2026-11-06T11:00:00Z");
const org: Organization = {
  id: "o1",
  name: "Org",
  status: "active",
  city: "Lagos",
  contactName: "A",
  contactEmail: "a@a.com",
  phone: "",
  address: "",
  description: "",
  joinedAt: now.toISOString(),
  admins: [],
};
const event: EventItem = {
  id: "e1",
  orgId: "o1",
  name: "Show",
  category: "Concert",
  venue: "V",
  city: "Lagos",
  startsAt: "2026-11-10T18:00:00Z",
  endsAt: "2026-11-10T23:00:00Z",
  salesStart: "2026-11-01T08:00:00Z",
  salesEnd: "2026-11-10T20:00:00Z",
  description: "",
  // Real source of truth is `status` — see the comment in availability.ts.
  // `approval`/`state`/`published` are kept here only because the EventItem
  // type still declares them; getEventAvailability no longer reads them.
  status: "ACTIVE",
  hue: 0,
  createdBy: "organizer",
  ticketCategories: [],
  operatorIds: ["op1"],
  terminalIds: ["t1"],
};
const operator: Operator = { id: "op1", name: "Op", phone: "", email: "", status: "active", joinedAt: "" };
const terminal: Terminal = {
  id: "t1",
  serial: "S",
  model: "M",
  status: "authorized",
  lastSeenAt: "",
  battery: 100,
  appVersion: "1",
};

describe("event availability", () => {
  it("is on sale when approved, published, in window, active and org active", () => {
    const r = getEventAvailability(event, org, now);
    expect(r.sellable).toBe(true);
    expect(r.phase).toBe("on_sale");
  });

  it("closes automatically once the sales window has ended", () => {
    const r = getEventAvailability(event, org, new Date("2026-11-10T20:00:01Z"));
    expect(r.sellable).toBe(false);
    expect(r.phase).toBe("ended");
  });

  it("is not on sale before the sales window opens", () => {
    const r = getEventAvailability({ ...event, salesStart: "2026-11-07T08:00:00Z" }, org, now);
    expect(r.sellable).toBe(false);
    expect(r.phase).toBe("upcoming");
  });

  it("is blocked while awaiting Whatadeal approval", () => {
    for (const status of ["DRAFT", "PENDING_APPROVAL", "REJECTED"] as const) {
      expect(getEventAvailability({ ...event, status }, org, now).sellable).toBe(false);
    }
  });

  it("is blocked when the event is paused or cancelled", () => {
    for (const status of ["PAUSED", "CANCELLED"] as const) {
      expect(getEventAvailability({ ...event, status }, org, now).sellable).toBe(false);
    }
  });

  it("is blocked when the organization is suspended", () => {
    expect(getEventAvailability(event, { ...org, status: "suspended" }, now).sellable).toBe(false);
  });

  it("is blocked when the event is approved but not yet published/activated", () => {
    for (const status of ["APPROVED", "SCHEDULED"] as const) {
      expect(getEventAvailability({ ...event, status }, org, now).sellable).toBe(false);
    }
  });
});

describe("operator selling permission", () => {
  it("allows an assigned, active operator on an authorized, assigned device", () => {
    expect(canOperatorSell(event, org, operator, terminal, now).allowed).toBe(true);
  });

  it("rejects an operator not assigned to the event", () => {
    expect(canOperatorSell({ ...event, operatorIds: [] }, org, operator, terminal, now).allowed).toBe(false);
  });

  it("rejects a suspended operator", () => {
    expect(canOperatorSell(event, org, { ...operator, status: "suspended" }, terminal, now).allowed).toBe(false);
  });

  it("rejects a revoked device", () => {
    expect(canOperatorSell(event, org, operator, { ...terminal, status: "revoked" }, now).allowed).toBe(false);
  });
});
