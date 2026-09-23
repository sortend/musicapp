import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongArt } from "@/components/SongArt";
import { usePlayer } from "@/hooks/usePlayer";
import { useDownloads } from "@/hooks/useDownloads";
import { listOfflineSongs, formatBytes, type OfflineSong } from "@/lib/offline";
import { formatTime, type Song } from "@/lib/songs";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Offline songs — Aurora Music" },
      { name: "description", content: "Songs saved on this device, playable with no internet." },
      { property: "og:title", content: "Offline songs — Aurora Music" },
      {
        property: "og:description",
        content: "Songs saved on this device, playable with no internet.",
      },
    ],
  }),
  component: DownloadsPage,
});

function toSong(offline: OfflineSong): Song {
  return {
    id: offline.id,
    title: offline.title,
    artist: offline.artist,
    album: offline.album,
    cover_path: null,
    audio_path: "",
    duration: offline.duration,
    created_at: new Date(offline.savedAt).toISOString(),
  };
}

function DownloadsPage() {
  const { playQueue } = usePlayer();
  const { remove, downloadedIds } = useDownloads();
  const [items, setItems] = useState<OfflineSong[]>([]);

  useEffect(() => {
    void listOfflineSongs().then(setItems);
  }, [downloadedIds]);

  const songs = items.map(toSong);
  const totalSize = items.reduce((sum, item) => sum + item.audio.size + (item.cover?.size ?? 0), 0);

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8">
      <h1 className="text-3xl font-bold">Offline</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {items.length} songs • {formatBytes(totalSize)} saved on this device
      </p>

      {items.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed p-10 text-center">
          <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Nothing downloaded yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the download button on any song to keep it on this device and play it without internet.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-1">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-surface">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => playQueue(songs, index)}
              >
                <SongArt song={songs[index]!} className="h-12 w-12" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.artist} • {formatTime(item.duration)} • {formatBytes(item.audio.size)}
                  </p>
                </div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full text-destructive"
                onClick={() => void remove(item.id)}
                aria-label={`Remove ${item.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
