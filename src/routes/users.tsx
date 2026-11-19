import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock, KeyRound, Mail, MoreHorizontal, Phone, Plus, RefreshCw, ShieldCheck, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, StatCard, SuperAdminGate } from "@/components/dashboard/page";
import {
  TableCard,
  TableEmptyState,
  TablePagination,
  TableSearch,
  TableToolbar,
} from "@/components/dashboard/data-table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DetailList, DetailRow } from "@/components/dashboard/detail-row";
import { ActiveBadge } from "@/components/dashboard/status";
import { ExportButton } from "@/components/dashboard/export-button";
import { CredentialRow } from "@/components/dashboard/credential-row";
import { apiGetList, apiPatch, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { generateTempPassword } from "@/lib/password";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [{ title: "Users · Whatadeal Admin" }],
  }),
  component: () => (
    <SuperAdminGate what="User management">
      <UsersPage />
    </SuperAdminGate>
  ),
});

type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "EVENT_MANAGER" | "POS_OPERATOR";

interface AdminUserRow {
  id: string;
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | null | undefined;
  role: UserRole;
  isActive?: boolean | undefined;
  lastLoginAt?: string | null | undefined;
  createdAt?: string | undefined;
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super admin",
  ORG_ADMIN: "Organization admin",
  EVENT_MANAGER: "Event manager",
  POS_OPERATOR: "POS operator",
};

const ROLE_ORDER: UserRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "EVENT_MANAGER", "POS_OPERATOR"];

function fullName(u: AdminUserRow) {
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
}

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGetList<AdminUserRow>("/api/v1/users", { limit: 100 }),
  });

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (!q) return true;
        return `${fullName(u)} ${u.email}`.toLowerCase().includes(q);
      }),
    [users, q, roleFilter],
  );
  useEffect(() => setPage(1), [search, roleFilter]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = users.filter((u) => u.isActive !== false).length;
  const adminCount = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ORG_ADMIN").length;

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/v1/users/${id}/toggle-active`),
    onSuccess: (_data, id) => {
      const u = users.find((x) => x.id === id);
      toast.success(u?.isActive === false ? "User activated" : "User deactivated");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update user"),
  });

  const selected = users.find((u) => u.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Users"
        description="Create staff and administrator accounts with a temporary password, and control who can sign in."
        actions={<CreateUserDialog onCreated={() => void queryClient.invalidateQueries({ queryKey: ["users"] })} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={users.length} icon={<Users />} iconTone="primary" />
        <StatCard label="Active" value={activeCount} icon={<UserCheck />} iconTone="success" />
        <StatCard label="Inactive" value={users.length - activeCount} icon={<UserMinus />} iconTone="violet" />
        <StatCard label="Admins" value={adminCount} icon={<ShieldCheck />} iconTone="info" />
      </div>

      <TableCard>
        <TableToolbar
          left={
            <div>
              <h2 className="font-display text-[15px] font-semibold text-[#111827]">All users</h2>
              <p className="text-[12px] text-[#6B7280]">
                {filtered.length} user{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          }
          right={
            <>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
                <SelectTrigger className="h-11 w-[190px] rounded-[10px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_ORDER.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TableSearch value={search} onChange={setSearch} placeholder="Search by name or email..." />
              <ExportButton
                filename="users"
                rows={filtered}
                columns={[
                  { header: "Name", value: (u: AdminUserRow) => fullName(u) },
                  { header: "Email", value: (u: AdminUserRow) => u.email },
                  { header: "Role", value: (u: AdminUserRow) => ROLE_LABELS[u.role] ?? u.role },
                  { header: "Status", value: (u: AdminUserRow) => (u.isActive === false ? "Inactive" : "Active") },
                  { header: "Created", value: (u: AdminUserRow) => u.createdAt ?? "" },
                ]}
              />
            </>
          }
        />

        {isLoading ? (
          <div className="px-4 py-14 text-center text-sm text-[#6B7280]">Loading users...</div>
        ) : filtered.length === 0 ? (
          <TableEmptyState
            icon={<Users className="size-5" />}
            title={q || roleFilter !== "all" ? "No matching users" : "No users yet"}
            description={q || roleFilter !== "all" ? "Try adjusting your search or filters." : "Create the first user to get started."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px]">Name</TableHead>
                  <TableHead className="min-w-[220px]">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[56px] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((u) => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => setOpenId(u.id)}>
                    <TableCell className="font-medium text-[#111827]">{fullName(u)}</TableCell>
                    <TableCell className="text-[13px] text-[#6B7280]">{u.email}</TableCell>
                    <TableCell className="text-[13px] text-[#374151]">{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                    <TableCell>
                      <ActiveBadge active={u.isActive !== false} />
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B7280]">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <UserActions
                        user={u}
                        onToggle={() => toggleMutation.mutate(u.id)}
                        onResetDone={() => void queryClient.invalidateQueries({ queryKey: ["users"] })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              noun="users"
            />
          </>
        )}
      </TableCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto border-l-[#E8E2DA] sm:max-w-lg sm:rounded-l-[16px]">
          {selected ? (
            <UserDetailSheet
              user={selected}
              onToggle={() => toggleMutation.mutate(selected.id)}
              togglePending={toggleMutation.isPending}
              onResetDone={() => void queryClient.invalidateQueries({ queryKey: ["users"] })}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UserDetailSheet({
  user,
  onToggle,
  togglePending,
  onResetDone,
}: {
  user: AdminUserRow;
  onToggle: () => void;
  togglePending: boolean;
  onResetDone: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const active = user.isActive !== false;
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <ActiveBadge active={active} />
        </div>
        <SheetTitle className="font-display text-2xl text-[#111827]">{fullName(user)}</SheetTitle>
        <SheetDescription>{ROLE_LABELS[user.role] ?? user.role}</SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        <DetailList>
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={Phone} label="Phone" value={user.phone || "—"} />
          <DetailRow icon={ShieldCheck} label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
          <DetailRow icon={Clock} label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"} />
          <DetailRow icon={CalendarClock} label="Created" value={formatDate(user.createdAt)} />
        </DetailList>
        <div className="flex gap-2">
          {active ? (
            <Button
              variant="outline"
              className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
              disabled={togglePending}
              onClick={onToggle}
            >
              <UserMinus className="size-4" /> Deactivate user
            </Button>
          ) : (
            <Button className="bg-brand-gradient text-white hover:opacity-95" disabled={togglePending} onClick={onToggle}>
              <UserCheck className="size-4" /> Activate user
            </Button>
          )}
          <Button variant="outline" className="border-[#E8E2DA]" onClick={() => setResetOpen(true)}>
            <KeyRound className="size-4" /> Reset password
          </Button>
        </div>
      </div>
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} onDone={onResetDone} />
    </>
  );
}

function UserActions({
  user,
  onToggle,
  onResetDone,
}: {
  user: AdminUserRow;
  onToggle: () => void;
  onResetDone: () => void;
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const active = user.isActive !== false;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${fullName(user)}`}
            className="h-8 w-8 rounded-[8px] text-[#6B7280] hover:bg-[#FAF8F5] hover:text-[#111827]"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <KeyRound /> Reset temporary password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={active ? "text-[#B91C1C] focus:bg-[#FEF2F2] focus:text-[#991B1B] [&>svg]:text-[#DC2626]" : undefined}
            onClick={onToggle}
          >
            {active ? <UserMinus /> : <UserCheck />} {active ? "Deactivate user" : "Activate user"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetPasswordDialog user={user} open={resetOpen} onOpenChange={setResetOpen} onDone={onResetDone} />
    </>
  );
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onDone,
}: {
  user: AdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (newPassword: string) =>
      apiPatch(`/api/v1/users/${user.id}/reset-password`, { newPassword }),
    onSuccess: () => {
      setResult(password);
      onDone();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not reset password"),
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    setResult(null);
    setPassword(next ? generateTempPassword() : "");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[480px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
          <DialogTitle>Reset temporary password</DialogTitle>
          <DialogDescription>
            Sets a new temporary password for {fullName(user)}. Their current sessions will be signed out.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid gap-3 px-6 py-5">
            <CredentialRow label="Login email" value={user.email} />
            <CredentialRow label="Temporary password" value={result} />
          </div>
        ) : (
          <div className="grid gap-1.5 px-6 py-5">
            <Label className="text-[13px] font-medium text-[#374151]">Temporary password</Label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 font-mono" />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 rounded-[10px] border-[#E8E2DA] px-3"
                onClick={() => setPassword(generateTempPassword())}
              >
                <RefreshCw className="size-4" /> Generate
              </Button>
            </div>
            <p className="text-[12px] text-[#6B7280]">At least 8 characters.</p>
          </div>
        )}
        <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
          {result ? (
            <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={password.length < 8 || mutation.isPending}
                className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95 disabled:opacity-50"
                onClick={() => mutation.mutate(password)}
              >
                {mutation.isPending ? "Saving..." : "Set temporary password"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const emptyForm = { firstName: "", lastName: "", email: "", phone: "", role: "POS_OPERATOR" as UserRole, password: "" };
  const [form, setForm] = useState(emptyForm);
  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password.length >= 8;

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/api/v1/users", body),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setCreated(null);
    setForm({ ...emptyForm, password: next ? generateTempPassword() : "" });
  }

  function submit() {
    mutation.mutate(
      {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success("User created");
          setCreated({ email: form.email.trim(), password: form.password });
          onCreated();
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not create user"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-[14px] font-medium text-white shadow-[0_6px_16px_rgba(249,115,22,0.22)] hover:opacity-95">
          <Plus className="size-4" /> Create user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[600px] gap-0 overflow-hidden p-0">
        {created ? (
          <>
            <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                Share these login details with the user. The temporary password is only shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 px-6 py-5">
              <CredentialRow label="Login email" value={created.email} />
              <CredentialRow label="Temporary password" value={created.password} />
            </div>
            <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
              <Button className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-[#F0EBE4] px-6 py-5">
              <DialogTitle>Create a user</DialogTitle>
              <DialogDescription>Creates a login with a temporary password for the user to sign in with.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger className="h-11 rounded-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_ORDER.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone (optional)">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" />
                </Field>
              </div>
              <Field label="Temporary password">
                <div className="flex gap-2">
                  <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 rounded-[10px] border-[#E8E2DA] px-3"
                    onClick={() => setForm({ ...form, password: generateTempPassword() })}
                  >
                    <RefreshCw className="size-4" /> Generate
                  </Button>
                </div>
                <p className="text-[12px] text-[#6B7280]">At least 8 characters. The user can change it after signing in.</p>
              </Field>
            </div>
            <DialogFooter className="border-t border-[#F0EBE4] bg-[#FAF8F5]/50 px-6 py-4 sm:justify-end">
              <Button variant="outline" className="h-11 rounded-[10px] border-[#E8E2DA] px-4" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!valid || mutation.isPending}
                className="h-11 rounded-[10px] bg-brand-gradient px-4 text-white hover:opacity-95 disabled:opacity-50"
                onClick={submit}
              >
                <UserPlus className="size-4" /> {mutation.isPending ? "Creating..." : "Create user"}
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
