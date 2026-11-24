/*
 * Tells iPhones which bottegarooms.com links belong to the Bottega app (and /watch/* to Margins), so tapping a room link
 * (/r/someone), a club invitation (/join/gray-fox), a club page or bottegarooms.com/start in Messages,
 * WhatsApp or Mail opens the app there, for people who have it.
 * Apple fetches this once when the app is installed or updated.
 */
const APP = "SS8NYAS49K.com.kkggr2.bottega";
/** Margins, Bottega's watch-along app: "Watch along" links (/watch/{show}/{season}/{episode}) open it on that episode. */
const MARGINS = "SS8NYAS49K.com.caglaazizoglu.margins";

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [{
          appIDs: [APP],
          components: [
            { "/": "/r/*", comment: "Rooms" },
            { "/": "/join/*", comment: "Club invitations" },
            { "/": "/club/*", comment: "Clubs and their quizzes" },
            { "/": "/start", comment: "Starting a club" },
          ],
        }, {
          appIDs: [MARGINS],
          components: [{ "/": "/watch/*", comment: "Watch along with a friend" }],
        }],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
