/*
 * Tells iPhones which bottegarooms.com links belong to the Bottega app, so tapping a room link
 * (/r/someone), a club invitation (/join/gray-fox), a club page or bottegarooms.com/start in Messages,
 * WhatsApp or Mail opens the app there, for people who have it.
 * Apple fetches this once when the app is installed or updated.
 */
const APP = "SS8NYAS49K.com.kkggr2.bottega";

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
        }],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
