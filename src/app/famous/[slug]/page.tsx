import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FamousRoomView } from "@/components/famous-room";
import { FAMOUS, famousRoom } from "@/lib/famous";

export function generateStaticParams() {
  return FAMOUS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/famous/[slug]">): Promise<Metadata> {
  const f = famousRoom((await params).slug);
  return f ? { title: f.name, description: `${f.tagline} ${f.source} Step in and see how alike your taste is.`, ...(f.draft ? { robots: { index: false, follow: false } } : {}) } : {};
}

export default async function FamousPage({ params }: PageProps<"/famous/[slug]">) {
  const f = famousRoom((await params).slug);
  if (!f) notFound();
  return <FamousRoomView room={f} />;
}
