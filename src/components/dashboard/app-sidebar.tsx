import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Smartphone,
  Undo2,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/hooks";
import { initials } from "@/lib/format";
import { logout } from "@/lib/auth";

type Item = {
  title: string;
  url:
    | "/"
    | "/organizations"
    | "/events"
    | "/operators"
    | "/terminals"
    | "/transactions"
    | "/refunds"
    | "/reports"
    | "/audit"
    | "/users"
    | "/settings";
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
};

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Manage",
    items: [
      { title: "Overview", url: "/", icon: LayoutDashboard },
      { title: "Organizations", url: "/organizations", icon: Building2, superAdminOnly: true },
      { title: "Events", url: "/events", icon: CalendarDays },
    ],
  },
  {
    label: "Point of sale",
    items: [
      { title: "POS operators", url: "/operators", icon: Users, superAdminOnly: true },
      { title: "Terminals", url: "/terminals", icon: Smartphone, superAdminOnly: true },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Transactions", url: "/transactions", icon: CreditCard },
      { title: "Refunds & settlements", url: "/refunds", icon: Undo2, superAdminOnly: true },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Users", url: "/users", icon: UserCog, superAdminOnly: true },
      { title: "Audit log", url: "/audit", icon: ScrollText, superAdminOnly: true },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, isSuperAdmin } = useCurrentUser();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => isSuperAdmin || !i.superAdminOnly) }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-3">
        <Link to="/" className="flex items-center overflow-hidden" aria-label="Whatadeal home">
          <img
            src="/logo.png"
            alt="Whatadeal"
            className="h-10 w-auto max-w-[160px] shrink-0 object-contain group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {visibleGroups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10.5px] tracking-[0.14em] text-sidebar-foreground/45 uppercase">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="h-9 rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-lift data-[active=true]:[&_svg]:text-primary-foreground"
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2 text-left text-xs transition-colors hover:bg-sidebar-accent"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials(user?.name ?? "Admin")}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-sidebar-accent-foreground">
                  {user?.name ?? "Admin"}
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user?.name ?? "Admin"}</p>
              {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {}}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
