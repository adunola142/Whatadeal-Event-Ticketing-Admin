import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventThumb, PageHeader, SectionCard } from "@/components/dashboard/page";
import { useCurrentUser } from "@/lib/hooks";
import { apiGetList, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import type { Organization } from "@/lib/types";

export const Route = createFileRoute("/events/new")({
  head: () => ({
    meta: [
      { title: "Create event · Whatadeal Ticketing Admin" },
      { name: "description", content: "Set up a new event with venue, schedule, sales window and ticket categories." },
      { property: "og:title", content: "Create event · Whatadeal Ticketing Admin" },
      { property: "og:description", content: "Set up a new event with venue, schedule, sales window and ticket categories." },
    ],
  }),
  component: NewEventPage,
});

const EVENT_CATEGORIES = [
  "Concert",
  "Festival",
  "Conference",
  "Workshop",
  "Comedy",
  "Theatre",
  "Sports",
  "Exhibition",
  "Networking",
  "Party",
  "Other",
];

// datetime-local values are treated as Lagos time (UTC+1)
const toIso = (local: string) => new Date(`${local}:00+01:00`).toISOString();

function NewEventPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "admin" || user?.role === "super_admin";
  const navigate = useNavigate();

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiGetList<Organization>("/api/v1/organizations"),
    enabled: isAdmin,
  });

  const orgs = organizations;

  const [f, setF] = useState({
    organizationId: "",
    title: "",
    category: "Concert",
    venue: "",
    city: "Lagos",
    startDate: "",
    endDate: "",
    description: "",
    bannerUrl: undefined as string | undefined,
  });
  const [cats, setCats] = useState<{ name: string; price: number; capacity: number }[]>([]);

  const CATEGORY_PRESETS: { label: string; name: string }[] = [
    { label: "+ Regular", name: "Regular" },
    { label: "+ VIP", name: "VIP" },
  ];
  function addCategory(name = "") {
    setCats([...cats, { name, price: 0, capacity: 100 }]);
  }

  const errors: string[] = [];
  if (!f.title.trim()) errors.push("Give the event a title");
  if (!f.venue.trim()) errors.push("Add a venue");
  if (!f.startDate) errors.push("Set when the event starts");
  if (!f.endDate) errors.push("Set when the event ends");
  if (f.startDate && f.endDate && f.endDate <= f.startDate) errors.push("Event must end after it starts");
  if (!cats.length) errors.push("Add at least one ticket category");
  else if (cats.some((c) => !c.name.trim() || c.capacity <= 0 || c.price < 0))
    errors.push("Each ticket category needs a name, price and capacity");

  const potential = cats.reduce((s, c) => s + c.price * c.capacity, 0);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { ticketCategories, ...eventPayload } = data as {
        ticketCategories?: { name: string; price: number; capacity: number }[];
      } & Record<string, unknown>;
      const event = await apiPost<{ id: string }>("/api/v1/events", eventPayload);
      if (event?.id && ticketCategories?.length) {
        await Promise.all(
          ticketCategories.map((c) =>
            apiPost("/api/v1/ticket-categories", {
              eventId: event.id,
              name: c.name.trim(),
              price: c.price,
              totalQuantity: c.capacity,
            }),
          ),
        );
      }
      return event;
    },
  });

  function save() {
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    if (!f.title.trim()) {
      toast.error("Give the event a title first");
      return;
    }
    createMutation.mutate(
      {
          organizationId: f.organizationId || undefined,
          title: f.title.trim(),
          venue: f.venue,
          address: "",
          city: f.city,
          startDate: toIso(f.startDate),
          endDate: toIso(f.endDate),
          description: f.description,
          bannerImage: f.bannerUrl,
          isPublic: true,
          ticketCategories: cats,
      },
      {
        onSuccess: (data) => {
          toast.success("Event created successfully");
          if (data?.id) {
            navigate({ to: "/events" });
          } else {
            navigate({ to: "/events" });
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create event");
        },
      },
    );
  }

  return (
    <div className="pb-24">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/events">
          <ArrowLeft /> Events
        </Link>
      </Button>
      <PageHeader
        eyebrow={isAdmin ? "Whatadeal HQ" : "Your organization"}
        title="Create event"
        description={
          isAdmin
            ? "Events created by Whatadeal are approved and published immediately."
            : "Fill in the details and submit. Whatadeal reviews every event before it can be sold on POS."
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Event details" bodyClassName="grid gap-4 p-5">
            {isAdmin && (
              <Field label="Organization (optional)">
                <Select
                  value={f.organizationId}
                  onValueChange={(v) => setF({ ...f, organizationId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No organization — Whatadeal direct" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No organization — Whatadeal direct</SelectItem>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Event name">
              <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Lagos Island Block Party" />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Category">
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Venue">
                <Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="Venue name" />
              </Field>
              <Field label="City">
                <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What should guests expect?" />
            </Field>
          </SectionCard>

          <SectionCard title="Schedule" description="Times are in Lagos time." bodyClassName="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Event starts">
              <Input type="datetime-local" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </Field>
            <Field label="Event ends">
              <Input type="datetime-local" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
            </Field>

          </SectionCard>

          <SectionCard
            title="Ticket categories"
            description="Set price and inventory for each ticket type"
            action={
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORY_PRESETS.map((preset) => (
                  <Button key={preset.name} variant="outline" size="sm" onClick={() => addCategory(preset.name)}>
                    {preset.label}
                  </Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => addCategory()}>
                  <Plus /> Add category
                </Button>
              </div>
            }
            bodyClassName="p-5"
          >
            <div className="grid gap-3">
              {cats.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No ticket categories yet — add Regular, VIP, or a category of your own.
                </p>
              ) : (
              <>
              <div className="grid grid-cols-[1fr_140px_120px_36px] gap-2 text-xs text-muted-foreground">
                <span>Name</span>
                <span>Price (₦)</span>
                <span>Capacity</span>
                <span />
              </div>
              {cats.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_120px_36px] gap-2">
                  <Input value={c.name} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="e.g. Early bird" />
                  <Input
                    type="number"
                    min={0}
                    value={c.price === 0 ? "" : c.price}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const next = e.target.value === "" ? 0 : Number(e.target.value);
                      setCats(cats.map((x, j) => (j === i ? { ...x, price: next } : x)));
                    }}
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={c.capacity === 0 ? "" : c.capacity}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const next = e.target.value === "" ? 0 : Number(e.target.value);
                      setCats(cats.map((x, j) => (j === i ? { ...x, capacity: next } : x)));
                    }}
                    placeholder="0"
                  />
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setCats(cats.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              </>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Banner" bodyClassName="p-5">
            <label className="group relative block cursor-pointer overflow-hidden rounded-xl border border-dashed">
              <EventThumb hue={24} url={f.bannerUrl} className="aspect-[16/9] w-full rounded-none" />
              <span className="absolute inset-0 grid place-items-center bg-ink/40 text-sm font-medium text-ink-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex items-center gap-2">
                  <ImagePlus className="size-4" /> Upload image
                </span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setF({ ...f, bannerUrl: URL.createObjectURL(file) });
                }}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Recommended 1600×900. JPG or PNG.</p>
          </SectionCard>

          <SectionCard title="Summary" bodyClassName="space-y-3 p-5 text-sm">
            <Row label="Ticket types" value={cats.length.toString()} />
            <Row label="Total inventory" value={cats.reduce((s, c) => s + (c.capacity || 0), 0).toLocaleString()} />
            <Row label="Potential gross" value={formatNaira(potential)} />
            {errors.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg bg-warning-soft p-3 text-xs text-warning-foreground">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E8E2DA] bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-end gap-3">
          {errors.length > 0 ? (
            <p className="mr-auto text-sm text-warning-foreground">{errors[0]}</p>
          ) : null}
          <Button asChild variant="ghost">
            <Link to="/events">Cancel</Link>
          </Button>
          <Button variant="brand" disabled={createMutation.isPending} onClick={() => save()}>
            {createMutation.isPending ? "Creating..." : "Create event"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: import("react").ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
