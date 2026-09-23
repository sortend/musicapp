
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'Unknown Artist',
  album text,
  cover_path text,
  audio_path text NOT NULL,
  duration numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs readable by signed in users" ON public.songs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin inserts songs" ON public.songs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates songs" ON public.songs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes songs" ON public.songs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, song_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own likes" ON public.likes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT ALL ON public.playlists TO service_role;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own playlists" ON public.playlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, song_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_songs TO authenticated;
GRANT ALL ON public.playlist_songs TO service_role;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own playlist songs" ON public.playlist_songs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));

CREATE POLICY "read audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'audio');
CREATE POLICY "admin write audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "read covers" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'covers');
CREATE POLICY "admin write covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers' AND public.has_role(auth.uid(), 'admin'));
