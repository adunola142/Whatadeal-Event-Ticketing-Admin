import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/dashboard/page";
import { TableCard, TableEmptyState, TableToolbar } from "@/components/dashboard/data-table";
import { ExportButton } from "@/components/dashboard/export-button";
import { apiGet, apiGetList, apiPatch } from "@/lib/api";
import type { AdminUser, PlatformSettings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings · Whatadeal Admin" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    platformFeePercent: 3.5,
    requireApproval: true,
    autoExpire: true,
    allowOrganizerRefundRequests: true,
    paymentProvider: "Paystack",
    receiptFooter: "",
    supportEmail: "support@whatadeal.events",
    maxTicketsPerTransaction: 10,
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<PlatformSettings>("/api/v1/settings").catch(() => null),
      apiGetList<AdminUser>("/api/v1/users").catch(() => []),
    ])
      .then(([s, a]) => {
        if (s) setSettings(s);
        setAdmins(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/v1/settings", settings);
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        description="Configure platform rules, fees, and manage administrator access."
        actions={
          <Button
            className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="size-4" /> {saving ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Ticketing rules" description="How events and sales are governed">
          <div className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Require event approval</Label>
                <p className="text-xs text-muted-foreground">
                  Events submitted by organizers must be approved before going on sale
                </p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, requireApproval: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-expire sales</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically close ticket sales when the window ends
                </p>
              </div>
              <Switch
                checked={settings.autoExpire}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, autoExpire: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Allow organizer refund requests</Label>
                <p className="text-xs text-muted-foreground">
                  Organizers can submit refund requests for their events
                </p>
              </div>
              <Switch
                checked={settings.allowOrganizerRefundRequests}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, allowOrganizerRefundRequests: v }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Max tickets per transaction</Label>
              <Input
                type="number"
                value={settings.maxTicketsPerTransaction}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    maxTicketsPerTransaction: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-32"
                min={1}
                max={100}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payment & fees" description="Commission and payment gateway">
          <div className="space-y-5 p-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Platform fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.platformFeePercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    platformFeePercent: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-32"
                min={0}
                max={50}
              />
              <p className="text-xs text-muted-foreground">
                Deducted from each successful ticket sale before settlement
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Payment provider</Label>
              <Input
                value={settings.paymentProvider}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, paymentProvider: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Receipt footer text</Label>
              <Input
                value={settings.receiptFooter}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, receiptFooter: e.target.value }))
                }
                placeholder="Printed at the bottom of POS receipts"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Support email</Label>
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, supportEmail: e.target.value }))
                }
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">Administrators</h2>
              <p className="text-[12px] text-[#6B7280]">Team members with platform access</p>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <ExportButton
                filename="administrators"
                rows={admins}
                columns={[
                  { header: "Name", value: (a: any) => a?.name ?? `${a?.firstName ?? ""} ${a?.lastName ?? ""}`.trim() },
                  { header: "Email", value: (a: any) => a?.email ?? "" },
                  { header: "Role", value: (a: any) => a?.role ?? "" },
                  { header: "Status", value: (a: any) => a?.status ?? (a?.isActive === false ? "disabled" : "active") },
                ]}
              />
              <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4">
                <Users className="size-4" /> Invite admin
              </Button>
            </div>
          }
        />
        {loading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading...</div>
        ) : admins.length === 0 ? (
          <TableEmptyState icon={<Shield className="size-5" />} title="No administrators configured" description="Invite administrators to manage the platform." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-[#111827]">{a.name}</TableCell>
                  <TableCell className="text-[#6B7280]">{a.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1 rounded-full border-0 bg-[#F3EFEA] px-2.5 py-[3px] text-[11px] font-medium text-[#374151]">
                      <Shield className="size-3" /> {a.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        a.status === "active"
                          ? "inline-flex rounded-full bg-[#ECFDF3] px-2.5 py-[3px] text-[11px] font-medium text-[#166534] ring-1 ring-inset ring-[#BBF7D0]"
                          : a.status === "disabled"
                            ? "inline-flex rounded-full bg-[#FEF2F2] px-2.5 py-[3px] text-[11px] font-medium text-[#991B1B] ring-1 ring-inset ring-[#FECACA]"
                            : "inline-flex rounded-full bg-[#EFF6FF] px-2.5 py-[3px] text-[11px] font-medium text-[#1D4ED8] ring-1 ring-inset ring-[#BFDBFE]"
                      }
                    >
                      {a.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
}
