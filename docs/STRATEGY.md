# Bottega strategy

**One sentence:** your room shows who you are, and your friends' rooms give you a reason to come back.

Everything below follows from research on why people start using a product and why they return. Each rule names its evidence. The product should look simple; this document is where the thinking lives.

---

## 1. Why someone tries it (the first 30 seconds)

| What we know | What Bottega does |
|---|---|
| People judge how a page looks within **50 ms**, and that judgment rarely changes (Lindgaard et al., 2006; NN/g). Visual complexity matters even at 17 ms. | The first screen **is a room**, not a form. One warm scene, little text, one accent color. Sign-in sits beside it, second. |
| Things that are easy to process feel beautiful: familiar shapes, symmetry, contrast (Reber, Schwarz & Winkielman, 2004). | Furniture people recognize at once (a shelf, a turntable, a TV) instead of abstract cards. No new symbols to learn. |
| Beautiful designs are seen as easier to use (aesthetic‑usability effect). | Polish the room first. A beautiful room forgives a rough edge elsewhere; a plain one doesn't. |
| Friends' recommendations are trusted far more than algorithms (Yeomans, Harvard; consumer surveys). | People mostly arrive through **a friend's room link**. That room must open for them without signing in, with one clear "Make your own room". |

**Rule:** a visitor should be playing a record in someone's room before they're asked for anything.

## 2. Why someone fills their room (the first 3 minutes)

| What we know | What Bottega does |
|---|---|
| Talking about yourself activates the brain's reward system; people give up money to do it (Tamir & Mitchell, 2012). | The core act is **"add something that says something about you"**, with a one‑line *why*. The why is what friends come back to read. |
| Rooms reveal personality accurately, especially openness (Gosling et al., 2002, "A Room with a Cue"). Strangers getting to know each other talk about **music** more than anything else (Rentfrow & Gosling, 2006). | The metaphor is literal and backed by research: your room is a self‑portrait. Music is the first thing we invite people to add. |
| Nostalgia raises feelings of connection, then meaning (Sedikides & Wildschut; Routledge et al., 2011). | Prompts that call up memories, not categories: *"a song from a summer you miss"*, *"the film that raised you"*. No blank page. |
| People value what they built themselves, but **only if they finish it** (Norton, Mochon & Ariely, 2012, "IKEA effect"). | A first room must be finishable fast: **5 pieces opens the door**. Import from Letterboxd or Goodreads gets there in one tap. |
| A head start increases follow‑through (endowed progress: 34% vs 19% completion; Nunes & Drèze, 2006). People speed up near a goal (Kivetz et al., 2006). | Show progress as **"3 of 5: your door opens at 5"**, starting at 1 (the room's name and walls count). |
| People remember an experience by its best moment and its ending (peak‑end rule; Kahneman). | **Peak:** the needle drops on your own record. **End:** "Your door is open", with your share picture ready. |

## 3. Why someone comes back (weeks 1–4)

| What we know | What Bottega does |
|---|---|
| Social products die without enough nearby people; build the smallest network that keeps itself alive (Chen, *The Cold Start Problem*). Facebook's "7 friends in 10 days" mattered because of friend density; the exact number is arbitrary (Amplitude; Mixpanel). | Activation = **5 pieces and 3 friends**. Anyone who signs up from a friend's room sends that person a friend request in the same step, and the owner gets a reason to come back and accept. Launch one group at a time (a club, a class, a friend group). |
| Letterboxd users stay for their friends' diaries and the feeling of their own taste being seen, not for algorithmic feeds. | The library is **friends' rooms with what's new in each**, never a feed of strangers. |
| Passive scrolling is tied to envy and lower well‑being; active, connecting use is tied to higher well‑being (Verduyn et al., 2017, 2022). | Every visit invites one small **active gesture**: react to a piece ("this one got me"), save it to your own room, or leave a recommendation by the door. |
| Being noticed creates curiosity and gives something back (LinkedIn's "who viewed your profile"). | Gentle, positive signals only: *"@mia stopped at your record."* No counts, no rankings. |
| Variable rewards drive habits, but the same mechanism powers slot machines (Eyal's Hook model; critiques). | The variable reward is **real**: friends add things when they add things. No artificial loot, no guilt mechanics. |
| Streaks raise short‑term activity through loss aversion, but don't reliably build lasting behavior; the Streak Freeze exists because breaking a streak drives people away (Duolingo). | **No streaks.** Rooms are cozy, like Animal Crossing homes: you drop in when you want. Cozy games meet autonomy, competence and relatedness (self‑determination theory). |
| More notifications correlate with retention but cause opt‑outs (Airship/Localytics vendor data; correlational). | Notify only when **something happened for you** (a friend added a song, someone reacted, a request arrived). At most one summary a week. |
| Yearly identity rituals spread themselves: Spotify Wrapped is a mirror people want to share (self‑concept, social comparison). | **Seasons:** each season the room's light changes and you get a fresh share picture of what you hung. A ritual, not a chore. |
| MySpace profiles (custom styles, a song that played) were loved as statements of who you are. Gen Z leans toward slower, curated self‑expression (Pinterest Predicts 2026, self‑reported). | Customization stays easy and tasteful: themes, wallpaper, arrangement. No open‑ended code, so rooms never break. |

## 4. What Bottega will not do

These go against the research above or against the cozy feeling:

- Public like counts, follower counts or "top rooms" (they invite comparison and envy).
- A feed of strangers, or algorithmic suggestions presented as friends.
- Streaks, guilt notifications or countdowns.
- Autoplay sound when someone enters a room. Sound starts only when the visitor drops the needle.

## 5. How it should feel

- **One main action per screen.** Anything else waits behind a tap (progressive disclosure).
- **The room is the interface.** You add a record at the turntable and a book at the shelf, not from a menu.
- **Warm, physical, quiet:** paper, wood, rust, ink. Real objects, soft light, almost no chrome.
- **Words are short and human.** "Your door is open", not "Profile published successfully".

## 6. What we measure (and what counts as working)

Per weekly group of new people. "Activated" = 5 pieces **and** 3 friends.

| Number | Target |
|---|---|
| Room has 5 pieces within 24 h | ≥ 60% |
| Shared the link or picture within 7 days | ≥ 25% |
| 3+ friends within 7 days | ≥ 40% |
| Activated people opening Bottega on days 22–28 | ≥ 25% |
| Visitors to a shared room who make their own | track, then improve |

The numbers live in Supabase: `metrics_cohorts`, `metrics_visitors`, `metrics_daily`. Spend money only once these hold for a group (see the growth plan).

## 7. Build order

1. **Now:** shared rooms open without signing in, with "Make your own room"; anyone who signs up that way sends the room's owner a friend request in the same step; the landing page *is* the example room; tracking for everything above.
2. **Next:** "3 of 5" door progress with memory prompts; the "why" line on every piece; the needle‑drop moment and "Your door is open" ending.
3. **Then:** "What's new" on each friend's room in the library; reactions ("this one got me") and "save to my room"; "@x stopped by"; a weekly summary sent only when friends added something.
4. **Later:** seasons with a seasonal share picture; optional paid furniture and room styles, once people return without being pushed.

---

### Sources

- Lindgaard et al. (2006), first impressions in 50 ms: [NN/g summary](https://nngroup.com/articles/first-impressions-human-automaticity/), [Google research on visual complexity and prototypicality](https://research.google.com/pubs/archive/38315.pdf)
- Reber, Schwarz & Winkielman (2004), processing fluency and beauty: [paper](https://pages.ucsd.edu/~pwinkielman/reber-schwarz-winkielman-beauty-PSPR-2004.pdf)
- Tamir & Mitchell (2012), disclosing information about yourself is rewarding: [PNAS / PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3361411/)
- Gosling et al. (2002), "A Room with a Cue": [APA release](https://www.apa.org/news/press/releases/2002/03/offices)
- Rentfrow & Gosling (2006), music in getting acquainted: [University of Melbourne record](https://findanexpert.unimelb.edu.au/scholarlywork/1207918-message-in-a-ballad--the-role-of-music-preferences-in-interpersonal-perception)
- Sedikides & Wildschut, nostalgia and meaning: [Review of General Psychology (2018)](https://www.soton.ac.uk/~crsi/Sedikides%20&%20Wildschut,%202018,%20Review%20of%20General%20Psychology.pdf), [Southampton repository](https://eprints.soton.ac.uk/424789/)
- Norton, Mochon & Ariely (2012), the IKEA effect: [SSRN](https://papers.ssrn.com/abstract=1777100)
- Nunes & Drèze (2006), endowed progress: [Coglode summary](https://coglode.com/nuggets/endowed-progress-effect)
- Peak‑end rule: [Laws of UX](https://lawsofux.com/peak-end-rule/)
- Self‑determination theory and app engagement: [JMIR mHealth study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8391751/), [King's College London review](https://www.kcl.ac.uk/why-do-we-stop-using-health-apps-and-is-that-always-a-problem)
- Andrew Chen, *The Cold Start Problem*: [Lenny's Newsletter excerpt](https://www.lennysnewsletter.com/p/atomic-network)
- Facebook's "7 friends in 10 days": [Amplitude](https://amplitude.com/blog/find-the-key-to-your-apps-growth-without-an-army-of-data-scientists), [Mixpanel critique](https://mixpanel.com/blog/magic-numbers-are-an-illusion/)
- Verduyn et al., passive versus active social media use: [2017 review](https://deepblue.lib.umich.edu/bitstream/handle/2027.42/136039/sipr12033.pdf?sequence=1), [2022 extended model](https://journals.sagepub.com/doi/10.1177/14614448211065425)
- Hook model and its critiques: [ThoughtWorks](https://www.thoughtworks.com/en-gb/insights/blog/addicted-industry-matures), [Big Think](https://bigthink.com/?p=54491)
- Duolingo streaks: [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- Notifications and retention: [Localytics](https://uplandsoftware.com/localytics/blog/21-percent-of-users-abandon-apps-after-one-use), [Airship](https://www.airship.com/newsroom/urban-airships-mobile-app-retention-study-for-key-industry-verticals/)
- BeReal and Locket: [Dazed](https://www.dazeddigital.com/life-culture/article/61166/1/why-did-bereal-fail-social-media-instagram-authenticity), [TechCrunch](https://techcrunch.com/2023/09/29/bereal-pushes-back-at-report-that-its-losing-steam-says-it-now-has-25m-daily-users)
- Letterboxd: [ScreenHub](https://www.screenhub.com.au/news/features/the-letterboxd-phenomenon-why-film-lovers-love-this-app-2659530/), [Stat Significant](https://www.statsignificant.com/p/the-rise-and-potential-fall-of-letterboxd)
- Spotify Wrapped and identity: [Daily Maverick (The Conversation)](https://www.dailymaverick.co.za/article/2024-12-06-spotify-wrapped-is-about-more-than-what-songs-you-listen-to-its-about-what-makes-you-you)
- MySpace customization: [history of profile customization](https://adryancorcione.substack.com/p/personal-homepages-profile-customization-history-identity)
- Cozy games: [UX Collective](https://uxdesign.cc/the-calm-and-charm-of-cosy-games-in-a-chaotic-world-7f29dbd8f4d9)
- Gen Z curated self‑expression: [Pinterest Predicts 2026 (YPulse)](https://www.ypulse.com/newsfeed/2025/12/10/gen-z-is-driving-two-thirds-of-pinterests-predicted-trends-for-2026/)
- Trust in friends versus algorithms: [Raconteur](https://www.raconteur.net/retail/algorithmic-recommendations)

**A note on evidence:** the psychology findings (Tamir, Gosling, Norton, Nunes, Lindgaard, Reber, Verduyn) are peer‑reviewed. The product lessons (Duolingo, BeReal, Letterboxd, notifications, Facebook's 7 friends) come from company blogs, vendor data and commentary. They show what tends to happen, not proof. Our own numbers in section 6 decide.
