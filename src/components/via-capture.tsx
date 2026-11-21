"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureVia } from "@/lib/track";

/** Remembers ?via= from invite links on any page (see captureVia in lib/track.ts). */
export function ViaCapture() {
  const path = usePathname();
  useEffect(() => { captureVia(); }, [path]);
  return null;
}
