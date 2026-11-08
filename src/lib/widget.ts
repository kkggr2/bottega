import { Capacitor, registerPlugin } from "@capacitor/core";

/*
 * Feeds the iPhone home-screen widget (ios/App/BottegaWidget) with what friends have on right now.
 * Only does anything inside the iOS app.
 */

/** `cover` is a web address; the app downloads it for the widget, which can't load images itself. */
export type WidgetFriend = { username: string; line: string; title: string; kind: "song" | "film" | "book"; at: string; isNew: boolean; cover: string | null };

type WidgetBridge = { save(options: { json: string }): Promise<void> };
const bridge = registerPlugin<WidgetBridge>("WidgetBridge");

const onIos = () => typeof window !== "undefined" && Capacitor.getPlatform() === "ios";

export function updateWidget(friends: WidgetFriend[]): void {
  if (!onIos()) return;
  const json = JSON.stringify({ updatedAt: new Date().toISOString(), friends: friends.slice(0, 6) });
  bridge.save({ json }).catch(() => {});
}

/** After signing out, the widget goes back to "Open Bottega". */
export function clearWidget(): void {
  if (!onIos()) return;
  bridge.save({ json: "" }).catch(() => {});
}
