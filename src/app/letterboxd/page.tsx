import { redirect } from "next/navigation";

/* bottegarooms.com/letterboxd: the link for bios, Reels and creators. The welcome page, made for Letterboxd people. */
export default function LetterboxdPage() {
  redirect("/?letterboxd");
}
