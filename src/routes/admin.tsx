import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SongRow } from "@/components/SongRow";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { fetchSongs, type Song } from "@/lib/songs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Upload songs — Aurora Music" },
      { name: "description", content: "Add songs and cover art to your private music library." },
      { property: "og:title", content: "Upload songs — Aurora Music" },
      {
        property: "og:description",
        content: "Add songs and cover art to your private music library.",
      },
    ],
  }),
  component: AdminPage,
});

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener("error", () => {
      resolve(0);
      URL.revokeObjectURL(url);
    });
  });
}

function AdminPage() {
  const { session, gate } = useRequireAuth();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const { data: songs } = useQuery({
    queryKey: ["songs"],
    queryFn: fetchSongs,
    enabled: Boolean(session),
  });

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!audioFile || !user) return;
    setBusy(true);
    setStep(15);
    try {
      const stamp = Date.now();
      const audioPath = `${user.id}/${stamp}-${audioFile.name.replace(/[^\w.-]/g, "_")}`;
      const { error: audioError } = await supabase.storage
        .from("audio")
        .upload(audioPath, audioFile, { contentType: audioFile.type || "audio/mpeg" });
      if (audioError) throw audioError;
      setStep(70);

      let coverPath: string | null = null;
      if (coverFile) {
        coverPath = `${user.id}/${stamp}-${coverFile.name.replace(/[^\w.-]/g, "_")}`;
        const { error: coverError } = await supabase.storage
          .from("covers")
          .upload(coverPath, coverFile, { contentType: coverFile.type });
        if (coverError) throw coverError;
      }
      setStep(85);

      const duration = await readDuration(audioFile);
      const { error: insertError } = await supabase.from("songs").insert({
        title: title || audioFile.name.replace(/\.[^.]+$/, ""),
        artist: artist || "Unknown Artist",
        album: album || null,
        audio_path: audioPath,
        cover_path: coverPath,
        duration,
        created_by: user.id,
      });
      if (insertError) throw insertError;

      setStep(100);
      toast.success("Song added to your library!");
      setAudioFile(null);
      setCoverFile(null);
      setTitle("");
      setArtist("");
      setAlbum("");
      await queryClient.invalidateQueries({ queryKey: ["songs"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      setStep(0);
    }
  }

  async function deleteSong(song: Song) {
    const { error } = await supabase.from("songs").delete().eq("id", song.id);
    if (error) {
      toast.error("Could not delete this song");
      return;
    }
    await supabase.storage.from("audio").remove([song.audio_path]);
    if (song.cover_path) await supabase.storage.from("covers").remove([song.cover_path]);
    toast.success("Song deleted");
    await queryClient.invalidateQueries({ queryKey: ["songs"] });
  }

  if (gate) return gate;

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-16 text-center">
        <h1 className="text-2xl font-bold">Only the admin can upload</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is reserved for the library owner.
        </p>
      </main>
    );
  }

  const list = songs ?? [];

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8">
      <h1 className="text-3xl font-bold">Upload</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a song once — it appears on every phone, and can be downloaded for offline play.
      </p>

      <form onSubmit={upload} className="mt-6 space-y-4 rounded-3xl border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="audio">Song file (MP3 / M4A / WAV)</Label>
          <Input
            id="audio"
            type="file"
            accept="audio/*"
            required
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song ka naam" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Singer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album">Album</Label>
            <Input id="album" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Album (optional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover">Cover image</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {busy && <Progress value={step} />}

        <Button
          type="submit"
          disabled={busy || !audioFile}
          className="bg-aurora w-full text-primary-foreground hover:opacity-90"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Add to library
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold">Library ({list.length})</h2>
        <div className="space-y-1">
          {list.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              songs={list}
              index={index}
              showDelete
              onDelete={(target) => void deleteSong(target)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
