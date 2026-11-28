"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { pathFromUrl } from "@/lib/links";
import { dismissPushAsk, enablePush, pushAskDismissed, pushPermission } from "@/lib/push";

/**
 * Offers notifications once, where they matter (friend requests and friends, a club), in the iPhone and Android
 * apps or a browser that allows them.
 * After "Turn on" or "Not now" it never shows again on this device.
 */
export function PushAsk({ userId, text, hint }: { userId: string; text: string; hint?: string }) {
  const t = useT();
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (pushAskDismissed()) return;
    pushPermission().then((p) => setShow(p === "prompt"));
  }, []);
  if (!show) return null;
  return (
    <div className="invite push-ask">
      <p>{text}{hint && <> <span className="muted">{hint}</span></>}</p>
      <div className="row">
        <button className="btn" type="button" onClick={async () => {
          await enablePush(userId, (url) => router.push(pathFromUrl(url)));
          dismissPushAsk();
          setShow(false);
        }}>{t("Turn on")}</button>
        <button className="btn ghost" type="button" onClick={() => { dismissPushAsk(); setShow(false); }}>{t("Not now")}</button>
      </div>
    </div>
  );
}
