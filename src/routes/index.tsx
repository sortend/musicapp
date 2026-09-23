import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Play, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SongArt } from "@/components/SongArt";
import { SongRow } from "@/components/SongRow";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { usePlayer } from "@/hooks/usePlayer";
import { fetchSongs, type Song } from "@/lib/songs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurora — your private music library" },
      {
        name: "description",
        content:
          "Upload once, listen on any phone, and download songs to play offline without ads.",
      },
      { property: "og:title", content: "Aurora — your private music library" },
      {
        property: "og:description",
        content: "Upload once, listen on any phone, and download songs to play offline.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { session, gate } = useRequireAuth();
  const { signOut, user } = useAuth();
  const { playQueue } = usePlayer();

  const { data: songs, isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: fetchSongs,
    enabled: Boolean(session),
  });

  if (gate) return gate;

  const list: Song[] = songs ?? [];
  const featured = list.slice(0, 6);

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Welcome back</p>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient-aurora">Aurora</span> library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">Your library is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add songs from the Upload tab — then play them on any phone.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recently added</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => playQueue(list, Math.floor(Math.random() * list.length))}
                >
                  <Shuffle className="mr-1.5 h-4 w-4" /> Shuffle
                </Button>
                <Button
                  size="sm"
                  className="bg-aurora rounded-full text-primary-foreground hover:opacity-90"
                  onClick={() => playQueue(list, 0)}
                >
                  <Play className="mr-1.5 h-4 w-4 fill-current" /> Play
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {featured.map((song, index) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => playQueue(list, index)}
                  className="group text-left"
                >
                  <SongArt song={song} rounded="rounded-2xl" className="aspect-square w-full transition-transform group-hover:scale-[1.02]" />
                  <p className="mt-2 truncate text-sm font-semibold">{song.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mb-2 text-lg font-semibold">All songs</h2>
            <div className="space-y-1">
              {list.map((song, index) => (
                <SongRow key={song.id} song={song} songs={list} index={index} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
