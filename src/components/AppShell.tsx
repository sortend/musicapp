import { Link, useRouterState } from "@tanstack/react-router";
import { CloudOff, Download, Home, Search, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { MiniPlayer } from "@/components/MiniPlayer";
import { NowPlaying } from "@/components/NowPlaying";
import { useAuth } from "@/hooks/useAuth";
import { useDownloads } from "@/hooks/useDownloads";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/downloads", label: "Offline", icon: Download },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { isAdmin } = useAuth();
  const { online } = useDownloads();

  if (pathname === "/auth") return <>{children}</>;

  const items = isAdmin ? [...navItems, { to: "/admin", label: "Upload", icon: Upload }] : navItems;

  return (
    <div className="min-h-screen pb-40 md:pb-32">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-surface-2 py-2 text-xs text-muted-foreground">
          <CloudOff className="h-3.5 w-3.5" /> Offline mode — playing your downloaded songs
        </div>
      )}

      {children}

      <MiniPlayer />
      <NowPlaying />

      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t md:inset-x-auto md:right-4 md:bottom-24 md:rounded-2xl md:border">
        <ul className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2 md:flex-col md:gap-2">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
