import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongArt } from "@/components/SongArt";
import { usePlayer } from "@/hooks/usePlayer";

export function MiniPlayer() {
  const { current, isPlaying, toggle, next, setExpanded, progress, duration } = usePlayer();
  if (!current) return null;

  const ratio = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="glass fixed inset-x-0 bottom-16 z-40 mx-3 rounded-2xl border md:bottom-4 md:mx-auto md:max-w-2xl">
      <div className="h-0.5 w-full overflow-hidden rounded-t-2xl bg-surface-2">
        <div className="bg-aurora h-full transition-[width]" style={{ width: `${ratio}%` }} />
      </div>
      <div className="flex items-center gap-3 p-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded(true)}
        >
          <SongArt song={current} className="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
          </div>
        </button>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={next} aria-label="Next song">
          <SkipForward className="h-5 w-5 fill-current" />
        </Button>
      </div>
    </div>
  );
}
