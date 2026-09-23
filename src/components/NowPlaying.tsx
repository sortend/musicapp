import {
  ChevronDown,
  Download,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SongArt } from "@/components/SongArt";
import { usePlayer } from "@/hooks/usePlayer";
import { useDownloads } from "@/hooks/useDownloads";
import { formatTime } from "@/lib/songs";
import { cn } from "@/lib/utils";

export function NowPlaying() {
  const {
    current,
    currentCover,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    expanded,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    setExpanded,
  } = usePlayer();
  const { isDownloaded, download, remove } = useDownloads();

  if (!current) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col transition-transform duration-500 ease-out",
        expanded ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="absolute inset-0 bg-background" />
      {currentCover && (
        <img
          src={currentCover}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-3xl"
        />
      )}

      <div className="relative flex h-full flex-col px-6 pt-6 pb-10">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={() => setExpanded(false)}
            aria-label="Close player"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Now playing</p>
          <Button
            size="icon"
            variant="ghost"
            className={cn("rounded-full", isDownloaded(current.id) && "text-primary")}
            onClick={() =>
              isDownloaded(current.id) ? void remove(current.id) : void download(current)
            }
            aria-label="Download"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <SongArt
            song={current}
            rounded="rounded-3xl"
            className="shadow-float aspect-square w-full max-w-sm"
          />
        </div>

        <div className="mx-auto w-full max-w-xl">
          <h2 className="truncate text-2xl font-bold">{current.title}</h2>
          <p className="truncate text-sm text-muted-foreground">{current.artist}</p>

          <div className="mt-6">
            <Slider
              value={[progress]}
              max={duration || current.duration || 1}
              step={0.5}
              onValueChange={([value]) => seek(value ?? 0)}
              aria-label="Seek"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration || current.duration)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className={cn("rounded-full", shuffle && "text-primary")}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={previous} aria-label="Previous">
              <SkipBack className="h-6 w-6 fill-current" />
            </Button>
            <Button
              size="icon"
              onClick={toggle}
              className="bg-aurora shadow-glow h-16 w-16 rounded-full text-primary-foreground hover:opacity-90"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={next} aria-label="Next">
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn("rounded-full", repeat !== "off" && "text-primary")}
              onClick={cycleRepeat}
              aria-label="Repeat"
            >
              {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={([value]) => setVolume(value ?? 1)}
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
