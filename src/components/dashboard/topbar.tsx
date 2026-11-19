import { Bell, CalendarDays, LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, initials } from "@/lib/format";
import { logout } from "@/lib/auth";
import { useCurrentUser } from "@/lib/hooks";

export function Topbar() {
  const { user } = useCurrentUser();
  const now = new Date();
  const displayName = user?.name ?? user?.email ?? "Admin";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
        <CalendarDays className="size-4" />
        <span className="tabular">{formatDate(now.toISOString())}</span>
        <span className="mx-1 text-border">|</span>
        <span>Lagos time</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              aria-label="Activity"
            >
              <Bell />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full p-0">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{displayName}</p>
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
      </div>
    </header>
  );
}
