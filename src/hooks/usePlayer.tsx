import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveAudioSource, resolveCoverSource, type Song } from "@/lib/songs";

type RepeatMode = "off" | "all" | "one";

type PlayerContextValue = {
  queue: Song[];
  current: Song | null;
  currentCover: string | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  playQueue: (songs: Song[], startIndex: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setExpanded: (value: boolean) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const coverUrlRef = useRef<string | null>(null);

  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [expanded, setExpanded] = useState(false);
  const [currentCover, setCurrentCover] = useState<string | null>(null);

  const current = queue[index] ?? null;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    };
  }, []);

  const advance = useCallback(
    (direction: 1 | -1) => {
      setIndex((currentIndex) => {
        if (queue.length === 0) return 0;
        if (shuffle && queue.length > 1) {
          let random = currentIndex;
          while (random === currentIndex) random = Math.floor(Math.random() * queue.length);
          return random;
        }
        const nextIndex = currentIndex + direction;
        if (nextIndex >= queue.length) return repeat === "all" ? 0 : currentIndex;
        if (nextIndex < 0) return 0;
        return nextIndex;
      });
    },
    [queue.length, shuffle, repeat],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      if (index === queue.length - 1 && repeat === "off") {
        setIsPlaying(false);
        return;
      }
      advance(1);
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [advance, index, queue.length, repeat]);

  // Load the current track (offline blob first, network second).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    let cancelled = false;

    (async () => {
      try {
        const src = await resolveAudioSource(current);
        if (cancelled) {
          if (src.startsWith("blob:")) URL.revokeObjectURL(src);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = src.startsWith("blob:") ? src : null;
        audio.src = src;
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    })();

    (async () => {
      const cover = await resolveCoverSource(current);
      if (cancelled) return;
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
      coverUrlRef.current = cover?.startsWith("blob:") ? cover : null;
      setCurrentCover(cover);
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  // Lock screen / headset controls.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? "",
      artwork: currentCover ? [{ src: currentCover, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", () => void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => advance(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => advance(-1));
  }, [current, currentCover, advance]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      current,
      currentCover,
      isPlaying,
      progress,
      duration,
      volume,
      shuffle,
      repeat,
      expanded,
      playQueue: (songs, startIndex) => {
        setQueue(songs);
        setIndex(startIndex);
      },
      toggle: () => {
        const audio = audioRef.current;
        if (!audio || !current) return;
        if (audio.paused) void audio.play();
        else audio.pause();
      },
      next: () => advance(1),
      previous: () => {
        const audio = audioRef.current;
        if (audio && audio.currentTime > 4) {
          audio.currentTime = 0;
          return;
        }
        advance(-1);
      },
      seek: (seconds) => {
        const audio = audioRef.current;
        if (audio) audio.currentTime = seconds;
        setProgress(seconds);
      },
      setVolume: (nextVolume) => {
        setVolumeState(nextVolume);
        if (audioRef.current) audioRef.current.volume = nextVolume;
      },
      toggleShuffle: () => setShuffle((s) => !s),
      cycleRepeat: () =>
        setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off")),
      setExpanded,
    }),
    [queue, current, currentCover, isPlaying, progress, duration, volume, shuffle, repeat, expanded, advance],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
