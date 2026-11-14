/*
 * Tells iPhones that bottegarooms.com room links belong to the Bottega app, so tapping
 * https://bottegarooms.com/r/someone (in Messages, WhatsApp, Notes…) opens the app at that room.
 * Apple fetches this once when the app is installed or updated.
 */
const APP = "SS8NYAS49K.com.kkggr2.bottega";

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [{ appIDs: [APP], components: [{ "/": "/r/*", comment: "Rooms" }] }],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
