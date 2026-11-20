"use client";

import { useT } from "@/lib/i18n";
import { FamousRooms } from "./famous-room";

/** /famous: every famous room. */
export function FamousIndex() {
  const t = useT();
  return (
    <div>
      <section className="lib-head">
        <div>
          <p className="smallcaps">{t("Famous rooms")}</p>
          <h1>{t("Whose taste shaped yours?")}</h1>
          <p>{t("Rooms put together by Bottega from lists they published themselves. Step in, and see how alike you are.")}</p>
        </div>
      </section>
      <FamousRooms heading={false} />
    </div>
  );
}
