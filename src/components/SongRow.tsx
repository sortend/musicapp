import { Download, Loader2, MoreVertical, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SongArt } from "@/components/SongArt";
import { useDownloads } from "@/hooks/useDownloads";
import { usePlayer } from "@/hooks/usePlayer";
import { formatTime, type Song } from "@/lib/songs";
import { cn } from "@/lib/utils";

export function SongRow({
  song,
  songs,
  index,
  showDelete,
  onDelete,
}: {
  song: Song;
  songs: Song[];
  index: number;
  showDelete?: boolean;
  onDelete?: (song: Song) => void;
}) {
  const { playQueue, current, isPlaying } = usePlayer();
  const { isDownloaded, download, remove, progress } = useDownloads();

  const active = current?.id === song.id;
  const downloading = progress[song.id] !== undefined;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors",
        active ? "bg-surface-2" : "hover:bg-surface",
      )}
    >
      <button
        type="button"
        onClick={() => playQueue(songs, index)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative">
          <SongArt song={song} className="h-12 w-12" />
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/55 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", active && "text-primary")}>
            {song.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
        </div>
      </button>

      {active && isPlaying && (
        <div className="flex h-4 items-end gap-0.5">
          {[0, 1, 2].map((bar) => (
            <span
              key={bar}
              className="bar-eq w-0.5 bg-primary"
              style={{ height: "100%", animationDelay: `${bar * 140}ms` }}
            />
          ))}
        </div>
      )}

      <span className="hidden w-12 text-right text-xs text-muted-foreground sm:block">
        {formatTime(song.duration)}
      </span>

      {downloading ? (
        <div className="flex h-9 w-9 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-9 w-9 rounded-full", isDownloaded(song.id) && "text-primary")}
          onClick={() => (isDownloaded(song.id) ? void remove(song.id) : void download(song))}
          aria-label={isDownloaded(song.id) ? "Remove offline copy" : "Download for offline"}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      {showDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="More">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(song)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete song
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
