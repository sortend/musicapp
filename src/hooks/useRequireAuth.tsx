import { Navigate } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Client-side gate: shows a spinner while the session loads and sends
 * signed-out visitors to the sign-in page.
 */
export function useRequireAuth(): {
  session: ReturnType<typeof useAuth>["session"];
  gate: ReactElement | null;
} {
  const { session, loading } = useAuth();

  if (loading) {
    return {
      session,
      gate: (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ),
    };
  }

  if (!session) {
    return { session, gate: <Navigate to="/auth" replace /> };
  }

  return { session, gate: null };
}
