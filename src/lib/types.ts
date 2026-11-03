export type ThemeKey = "oak" | "midnight" | "rose" | "moss" | "seaglass" | "gallery";
export type Wallpaper = "plain" | "stripe" | "dots" | "grid" | "damask";
export type Visibility = "friends" | "public" | "private";
export type PieceType = "poster" | "scene" | "poem" | "game" | "song" | "book";

export type Profile = { id: string; username: string };

export type Room = {
  owner_id: string;
  name: string;
  tagline: string;
  theme: ThemeKey;
  wallpaper: Wallpaper;
  visibility: Visibility;
};

export type RoomWithOwner = Room & { profile: { username: string } | null };

export type Piece = {
  id: string;
  owner_id: string;
  type: PieceType;
  title: string;
  subtitle: string;
  body: string;
  image_path: string | null;
  audio_path: string | null;
  link: string | null;
  cover_url: string | null;
  preview_url: string | null;
  clip_start: number | null;
  clip_end: number | null;
  position: number;
  created_at: string;
};

export type Friendship = {
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
  created_at: string;
};
