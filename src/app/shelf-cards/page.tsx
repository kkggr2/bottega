import type { Metadata } from "next";
import { ShelfCardsRoute } from "@/components/shelf-cards";

export const metadata: Metadata = { title: "Shelf cards", robots: { index: false } };

// Printable "staff pick" cards for the pieces in your room, each with a code that opens the room.
export default function ShelfCardsPage() {
  return <ShelfCardsRoute />;
}
