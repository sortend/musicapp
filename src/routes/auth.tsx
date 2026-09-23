import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Music4 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Aurora Music" },
      { name: "description", content: "Sign in to reach your private music library on any phone." },
      { property: "og:title", content: "Sign in — Aurora Music" },
      {
        property: "og:description",
        content: "Sign in to reach your private music library on any phone.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/" });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5">
      <div className="bg-aurora pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="bg-aurora shadow-glow mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <Music4 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-bold">Aurora</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your own music library — on every phone, online or offline.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border bg-card p-6 shadow-float">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={busy} className="bg-aurora w-full text-primary-foreground hover:opacity-90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <div className="relative py-1 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={() => void google()}>
            Continue with Google
          </Button>

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create a new account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
