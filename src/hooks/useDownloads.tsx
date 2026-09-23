import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { listOfflineIds } from "@/lib/offline";
import { downloadSong, removeDownload, type Song } from "@/lib/songs";

type DownloadsContextValue = {
  downloadedIds: Set<string>;
  progress: Record<string, number>;
  isDownloaded: (id: string) => boolean;
  download: (song: Song) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  online: boolean;
};

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => {
    const ids = await listOfflineIds();
    setDownloadedIds(new Set(ids));
  }, []);

  useEffect(() => {
    void refresh();
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [refresh]);

  const download = useCallback(
    async (song: Song) => {
      setProgress((p) => ({ ...p, [song.id]: 0 }));
      try {
        await downloadSong(song, (ratio) => setProgress((p) => ({ ...p, [song.id]: ratio })));
        await refresh();
        toast.success(`Saved offline: ${song.title}`);
      } catch {
        toast.error("Download failed. Check your internet connection.");
      } finally {
        setProgress((p) => {
          const copy = { ...p };
          delete copy[song.id];
          return copy;
        });
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeDownload(id);
      await refresh();
      toast.success("Offline copy removed");
    },
    [refresh],
  );

  return (
    <DownloadsContext.Provider
      value={{
        downloadedIds,
        progress,
        isDownloaded: (id) => downloadedIds.has(id),
        download,
        remove,
        refresh,
        online,
      }}
    >
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads() {
  const context = useContext(DownloadsContext);
  if (!context) throw new Error("useDownloads must be used inside DownloadsProvider");
  return context;
}
