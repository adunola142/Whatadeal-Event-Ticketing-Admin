import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  QrCode,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unwrapApiData } from "@/lib/api";
import { setTokens } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Whatadeal Admin" },
      {
        name: "description",
        content: "Sign in to the Whatadeal ticketing admin dashboard.",
      },
    ],
  }),
  component: LoginPage,
});

const FEATURES = [
  { icon: CalendarCheck, title: "Event Management" },

  { icon: CreditCard, title: "POS & Payments" },
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        throw new Error("API URL not configured");
      }
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message || "Invalid email or password",
        );
      }

      const payload = await res.json();
      // The API wraps successful responses as `{ success: true, data: {...} }`.
      const data = unwrapApiData<{
        accessToken?: string;
        refreshToken?: string;
      }>(payload);

      if (!data?.accessToken) {
        throw new Error("Login succeeded but no access token was returned");
      }

      setTokens(data.accessToken, data.refreshToken);

      // Full navigation ensures app state, router context, and API clients all
      // pick up the new session immediately after login.
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Left — branding & copy */}
        <div className="flex flex-1 flex-col justify-between p-8 lg:p-12 xl:p-16">
          {/* Logo */}
          <div>
            <img src="/logo.png" alt="Whatadeal" className="h-10" />
          </div>

          {/* Hero copy */}
          <div className="my-12 max-w-lg space-y-6 lg:my-0">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
              Manage events,
              <br />
              check-ins &amp; POS
              <br />
              <span className="bg-gradient-to-r from-[#f97316] to-[#ec4899] bg-clip-text text-transparent">
                all in one place
              </span>
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-white/70">
              Streamline attendance, handle ticketing, and power your events with
              ease.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              {FEATURES.map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4 text-white/90" />
                  </div>
                  <span className="text-sm font-medium text-white/90">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Whatadeal Events &amp; Ticketing.
            All rights reserved.
          </p>
        </div>

        {/* Right — glass login card */}
        <div className="flex items-center justify-center p-6 lg:w-[560px] lg:p-14 xl:w-[600px]">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/95 p-10 shadow-2xl backdrop-blur-xl dark:bg-black/60">
            {/* Card header */}
            <div className="mb-8 space-y-2 text-center">
              {/* App icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ec4899] shadow-lg">
                <span className="font-display text-xl font-bold text-white">
                  W
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your admin account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => {
                      /* TODO: forgot password */
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="h-12 w-full bg-gradient-to-r from-[#f97316] to-[#ec4899] font-semibold text-white shadow-lg hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <a
                href="https://whatadeal.events"
                className="font-semibold text-primary hover:underline"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
