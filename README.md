# QueueUp

**A walk-in queue on everyone's phone.** Customers scan a QR code at the door, take a number, and watch their place
in line live on their phone, so they can wait outside, in the car or next door instead of in a crowded room. The
owner calls the next person with one tap, and their phone dings and turns green.

**Live site:** add your Vercel address here once it's deployed

Built by Ammara Badat as part of my portfolio. It uses Firebase, like PaperTrail, TickList, Rememba, ShiftBoard,
HireTrack and StokvelBook.

## Who it's for
Barbers, salons, clinics, small shops and help desks in South Africa that serve walk-ins. On a busy Saturday at a
barber, or a morning at a clinic, people wait for an hour in a small room without knowing how long it'll be, and
nobody wants to step out in case they lose their place. QueueUp lets them leave and come back in time, and it needs
no app and no account for customers: just a phone camera.

## What it does

**For customers** (no app, no account)
- **Scan and join:** the QR code opens the queue's page. Type your name and take a number.
- **Your ticket, live:** your number, your place in line ("3rd in line"), roughly how long you'll wait, and the
  number being served, all updating by themselves.
- **"It's your turn":** the page turns green, dings and vibrates, and the tab's title changes. With notifications
  allowed, it also tells you when you're 2nd in line, so you can start heading back.
- **Leave the queue** if your plans change, so everyone behind you moves up.
- Your ticket is **remembered on your phone**: close the page and open the link again, and you're still in line.

**For the owner**
- **The queue, live:** who's being served, everyone waiting in order, and how long each has waited. A message pops
  up when someone joins by scanning or leaves.
- **Call next** with one tap. **Done** and **Didn't come** for the person being served. **Call** anyone out of turn,
  or **take them out** of the line.
- **Walk-ins without a phone:** type their name and they get the next number.
- **Pause** the queue (nobody new can join), for closing time or catching up.
- **Wait times that learn:** they start from your guess of minutes per person, then learn the real time from the
  people you serve, leaning towards the most recent ones.
- **A QR poster** to print (one A4 page), the **link** to copy or share on WhatsApp, and a **note** customers see
  ("Cash only", "Back at 14:00").
- **A TV screen** for the waiting area: the number being served (glowing, in big digits), the next five numbers, the
  QR code to join, and a clock. Numbers only, never names. It can ding when the number changes, and asks the
  device not to sleep.
- **Today:** people served, the average wait, the average turn, people who didn't come or left, the busiest hour,
  and a chart of the last week.
- **A new day:** the next morning QueueUp offers to start today's queue from 01, and saves yesterday's totals
  (without names) for the chart.
- **New QR code** if the old one was shared too widely, and **delete everything**.
- **Try the demo:** a made-up barbershop mid-morning, with people waiting, someone in the chair and a week of
  numbers. No account needed.

**For everyone**
- Works on phones and laptops, light and dark mode, **installable** ("Add to Home screen"), and opens with weak
  signal. The owner's taps are saved on the device and sent when the signal is back.

## Design
The ticket machine at a deli counter: warm counter paper, tomato-red tickets with round bites out of their sides and
a dashed tear line, a mustard "take a number" yellow, and a black "Now serving" board with the number glowing red.
Numbers are in Bebas Neue, tall and easy to read from across a room; everything else is in Archivo. Green only ever
means "it's your turn". Each of my apps has its own look; this is QueueUp's.

- **Signing in (owners):** a red ticket machine printing a ticket that shows what a customer sees, and the form on a
  paper ticket beside it.
- **Inside:** the black "Now serving" board across the top, with the number, how many are waiting and the
  Open/Paused switch, and the pages as tabs under it. The queue page puts the person being served and the big
  **Call next** button on the left, and the line on the right.
- **The customer's page** is their ticket, and **the TV screen** is the board, made big.

Text colours pass WCAG AA contrast in both themes. Moving things (the ticket printing, the green pulse) stand still
for people who ask their device for less motion.

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Firebase Authentication (email and password, Google,
and guest accounts) and Cloud Firestore, Vitest, GitHub Actions, Vercel. The QR codes are made in the browser by
Project Nayuki's QR Code generator (MIT licence), copied into `lib/qrcodegen.ts`, so there's no extra package.

## Project structure
```
app/              The owner's queue (/), Today (/today), the QR poster (/poster) and Settings (/settings);
                  the customer's page (/join?c=CODE) and the TV screen (/screen?c=CODE); the layout,
                  the app manifest, icons and the light/dark script
components/       The sign-in screen, the "Now serving" header, Start your queue, the QR code, the demo banner,
                  messages, icons and the logo
lib/              The queue's rules (queue.ts), join codes (code.ts), QR codes (qr.ts and qrcodegen.ts),
                  reading saved data (read.ts), the owner's live copy (store.ts) and changes (actions.ts),
                  the customer's side (customer.ts), the "your turn" alerts (alerts.ts), sign-in and the demo
tests/            Unit tests for lib/ (npm test)
firestore.rules   Who can read and change what
public/           The offline service worker and the app icons
```

## How the important parts work

**Taking a number** (`lib/customer.ts`). Joining gives the customer a guest account (Firebase anonymous sign-in, no
email or password), then a **transaction** reads the next number from the server and takes it in one step: the
number goes up by one, it's added to the end of the line, and a ticket with that number is made. If two people
join at the same moment, Firestore runs one transaction again, so nobody ever gets the same number.

**What customers can see** (`firestore.rules`). A queue has a public part, kept on the shop itself: its name,
whether it's open, the numbers waiting and the number being served. That's all the join page and the TV screen
need, and it has no names in it. Each ticket (with a name) can only be read by the owner and the customer who
took it. A customer can do exactly two things to a queue, and the rules check both in detail: **take the next
number** (the number goes up by exactly one, exactly that number is added to the end, the queue must be open, and
the new ticket must be theirs) and **take their own number out** (in the same step as their ticket changes from
waiting to left). Everything else is the owner's.

**Wait times** (`lib/queue.ts`). Everyone ahead of you takes a full turn, and the person being served has, on
average, half of theirs left. A turn's length starts as the owner's guess, then each "Done" teaches QueueUp the
real time: a running average that leans 30% towards the newest customer, ignoring turns under a minute (a mistaken
tap) or over two hours (a forgotten "Done"). Waits are rounded ("About 25 minutes") so they don't promise more
than they know.

**"It's your turn"** (`lib/alerts.ts`). Browsers only let a page make sound after a tap, so the ding is switched on
when the customer presses **Join**. When they're called, the page turns green, dings, vibrates, changes the tab's
title and, if allowed, shows a notification (through the service worker, which phones need).

**Join codes** (`lib/code.ts`). Six characters from letters and digits that can't be mistaken for each other on a
poster (no 0 and O, no 1, I and L), from the browser's secure random numbers. A separate `codes/{code}` record
points to the shop, so the QR code can be looked up without listing anyone's shops.

## Tests
`npm test` runs the unit tests in `tests/` with Vitest: places in the line, wait times and how they're worded,
learning the time per person, putting the line in order, a day's numbers and the busiest hour; join codes (their
letters, fairness and reading a typed code); the QR codes, checked square for square against the same library's
separate Python version; reading saved data safely; and the messages the owner sees. GitHub runs them on every
push (`.github/workflows/tests.yml`).

## Setup (run it yourself)
1. **Firebase:** create a project at [console.firebase.google.com](https://console.firebase.google.com).
   - Authentication → Get started → turn on **Email/Password**, **Google** and **Anonymous** (customers' guest
     accounts and Try the demo both need it).
   - Firestore Database → Create database (production mode).
   - Firestore Database → **Rules**: paste in `firestore.rules` and press **Publish**.
   - Project settings → General → Your apps → add a **Web app** to get its settings.
2. **Settings:** copy `.env.example` to `.env.local` and fill in the four values from step 1.
3. **Run it:** `npm install`, then `npm run dev`, and open http://localhost:3000.
4. **Deploy on Vercel:** import the GitHub repo, add the same four settings under
   Settings → Environment Variables, and deploy. Then, in Firebase, add the Vercel address under
   Authentication → Settings → **Authorized domains**, so Google sign-in works there.

## Environment variables
Names only; the values are in `.env.local` (never committed) and in Vercel.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | The web app's API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project's ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | The web app's ID |

These are public by design: they say which Firebase project to use, they don't unlock anything. What protects
each queue is `firestore.rules`.

## Known gaps
- **The security rules aren't in the automatic tests.** They'd need the Firebase emulator; they're tested by hand.
- **No alerts once the browser is fully closed.** Notifications and the ding work while the page is open or in the
  background. Sending them to a closed browser would need a server (push messages), which QueueUp doesn't have.
  No SMS either: SMS costs money per message.
- **Guest accounts stay in Firebase.** Each customer who joins gets one; they hold nothing but a ticket, which is
  deleted when the owner starts a new day.
- **One queue per account**, with one counter. A clinic with three doctors would need three accounts for now.
- **Wait times are estimates.** They learn from real turns, but a long haircut still makes everyone a bit later.
- **A guest who closes the tab** without ending the demo leaves their example queue in the database.
- **English only.**

## Use of AI
I built QueueUp with Claude (by Anthropic) as my AI pair programmer:

1. **I chose what to build** from ideas we discussed, as one of my new apps for my portfolio.
2. **Claude wrote the code**, starting from my other Firebase apps, explained how it works, designed its look and
   made the app icons.
3. **I set up Firebase and Vercel, added the code to my project**, ran it, tested it on my laptop and phone,
   committed it and deployed it, and reported anything that broke or looked wrong so we could fix it.
