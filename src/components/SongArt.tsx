import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { resolveCoverSource } from "@/lib/songs";
import { cn } from "@/lib/utils";

export function SongArt({
  song,
  className,
  rounded = "rounded-xl",
}: {
  song: { id: string; cover_path?: string | null; title: string };
  className?: string;
  rounded?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    void resolveCoverSource(song).then((url) => {
      if (!active) return;
      created = url?.startsWith("blob:") ? url : null;
      setSrc(url);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [song.id, song.cover_path]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-2",
        rounded,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={`${song.title} cover art`} className="h-full w-full object-cover" />
      ) : (
        <div className="bg-aurora flex h-full w-full items-center justify-center opacity-80">
          <Music2 className="h-1/3 w-1/3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
