import { supabase } from "@/integrations/supabase/client";
import { getOfflineSong, saveOfflineSong, deleteOfflineSong } from "@/lib/offline";

export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover_path: string | null;
  audio_path: string;
  duration: number;
  created_at: string;
};

const urlCache = new Map<string, { url: string; expires: number }>();

export async function signedUrl(bucket: "audio" | "covers", path: string | null): Promise<string | null> {
  if (!path) return null;
  const key = `${bucket}/${path}`;
  const cached = urlCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  if (error || !data?.signedUrl) return null;
  urlCache.set(key, { url: data.signedUrl, expires: Date.now() + 60 * 60 * 5 * 1000 });
  return data.signedUrl;
}

export async function fetchSongs(): Promise<Song[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Song[];
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Downloads a song (audio + cover) into offline storage. */
export async function downloadSong(song: Song, onProgress?: (ratio: number) => void): Promise<void> {
  const audioUrl = await signedUrl("audio", song.audio_path);
  if (!audioUrl) throw new Error("Audio file not reachable");

  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error("Download failed");

  const total = Number(response.headers.get("content-length") ?? 0);
  let audioBlob: Blob;

  if (response.body && total > 0) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value as unknown as BlobPart);
        received += value.byteLength;
        onProgress?.(Math.min(1, received / total));
      }
    }
    audioBlob = new Blob(chunks, { type: response.headers.get("content-type") ?? "audio/mpeg" });
  } else {
    audioBlob = await response.blob();
  }
  onProgress?.(1);

  let coverBlob: Blob | null = null;
  const coverUrl = await signedUrl("covers", song.cover_path);
  if (coverUrl) {
    try {
      const coverResponse = await fetch(coverUrl);
      if (coverResponse.ok) coverBlob = await coverResponse.blob();
    } catch {
      coverBlob = null;
    }
  }

  await saveOfflineSong({
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    audio: audioBlob,
    cover: coverBlob,
    savedAt: Date.now(),
  });
}

export async function removeDownload(id: string): Promise<void> {
  await deleteOfflineSong(id);
}

/** Playable source: offline blob first, network signed URL as fallback. */
export async function resolveAudioSource(song: Song): Promise<string> {
  const offline = await getOfflineSong(song.id);
  if (offline) return URL.createObjectURL(offline.audio);
  const url = await signedUrl("audio", song.audio_path);
  if (!url) throw new Error("Song not available offline and you appear to be offline");
  return url;
}

export async function resolveCoverSource(song: {
  id: string;
  cover_path?: string | null;
}): Promise<string | null> {
  const offline = await getOfflineSong(song.id);
  if (offline?.cover) return URL.createObjectURL(offline.cover);
  return signedUrl("covers", song.cover_path ?? null);
}
