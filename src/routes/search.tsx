import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SongRow } from "@/components/SongRow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { fetchSongs, type Song } from "@/lib/songs";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search your songs — Aurora Music" },
      { name: "description", content: "Find any song in your library by title, artist or album." },
      { property: "og:title", content: "Search your songs — Aurora Music" },
      {
        property: "og:description",
        content: "Find any song in your library by title, artist or album.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { session, gate } = useRequireAuth();
  const [term, setTerm] = useState("");

  const { data } = useQuery({ queryKey: ["songs"], queryFn: fetchSongs, enabled: Boolean(session) });

  const results = useMemo<Song[]>(() => {
    const list = data ?? [];
    const query = term.trim().toLowerCase();
    if (!query) return list;
    return list.filter((song) =>
      [song.title, song.artist, song.album ?? ""].join(" ").toLowerCase().includes(query),
    );
  }, [data, term]);

  if (gate) return gate;

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8">
      <h1 className="text-3xl font-bold">Search</h1>
      <div className="relative mt-4">
        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search songs, artists or albums"
          className="h-12 rounded-2xl pl-9"
          aria-label="Search songs"
        />
      </div>

      <div className="mt-6 space-y-1">
        {results.map((song, index) => (
          <SongRow key={song.id} song={song} songs={results} index={index} />
        ))}
        {results.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">No matches found.</p>
        )}
      </div>
    </main>
  );
}
