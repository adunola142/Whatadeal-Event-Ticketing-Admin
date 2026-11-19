import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { verifySession } from "@/lib/session";

/** Routes that render without the dashboard shell (sidebar + topbar). */
const PUBLIC_ROUTES = ["/login"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Whatadeal Ticketing Admin" },
      {
        name: "description",
        content: "Whatadeal's dashboard for managing organizations, events, POS sales and payouts.",
      },
      { name: "author", content: "Whatadeal" },
      { property: "og:title", content: "Whatadeal Ticketing Admin" },
      {
        property: "og:description",
        content: "Whatadeal's dashboard for managing organizations, events, POS sales and payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "icon", href: "/favicon-512.png?v=2", type: "image/png", sizes: "512x512" },
      { rel: "icon", href: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = router.state.location.pathname;
  const isBare = isPublicRoute(pathname);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<"checking" | "valid" | "invalid">("checking");

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Verify the stored session with the API before showing any dashboard page.
  useEffect(() => {
    if (isBare) return;
    let cancelled = false;
    setSession("checking");
    verifySession().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setSession("valid");
      } else {
        setSession("invalid");
        void navigate({ to: "/login", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isBare, navigate]);

  if (isBare) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <Outlet />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Render nothing for the dashboard until the session is confirmed after hydration.
  if (!hydrated || session !== "valid") {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-sm text-[#6B7280]">
        {session === "invalid" ? "Redirecting to sign in..." : "Checking your session..."}
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="min-w-0 bg-white">
              <Topbar />
              <main className="mx-auto w-full max-w-[1400px] flex-1 bg-white px-4 py-6 md:px-8 md:py-8">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
