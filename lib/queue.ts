import type { Day, Kind, Shop, Ticket } from "@/lib/types";

/*
  The rules of a queue, as plain functions with no Firebase, so tests/queue.test.ts checks them all:
  where you are in the line, how long you'll wait, who's next, and the day's numbers.
*/

export const KINDS: Record<Kind, { label: string; minutes: number; people: string }> = {
  barber: { label: "Barber", minutes: 20, people: "clients" },
  salon: { label: "Salon", minutes: 30, people: "clients" },
  clinic: { label: "Clinic", minutes: 15, people: "patients" },
  shop: { label: "Shop or counter", minutes: 5, people: "customers" },
  office: { label: "Office or help desk", minutes: 10, people: "people" },
  other: { label: "Something else", minutes: 10, people: "people" },
};
export const isKind = (v: unknown): v is Kind => typeof v === "string" && v in KINDS;

export const LIMITS = { name: 30, shopName: 40, note: 120, waiting: 300, minutes: 120 };

/** Tidies a typed name: no spaces at the ends or twice in a row, and not too long */
export function cleanName(raw: string, max = LIMITS.name) {
  return raw.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** How a ticket number is shown: at least two digits, like a real ticket ("07") */
export const numberLabel = (n: number) => String(n).padStart(2, "0");

/** Your place in the line: 1 means you're next. 0 means you're not waiting. */
export function placeOf(waiting: number[], n: number) {
  return waiting.indexOf(n) + 1;
}

/** "1st", "2nd", "3rd", "4th"… "11th", "21st" */
export function ordinal(n: number) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/**
 * Minutes per person: what QueueUp has learned from real customers, once it has, otherwise the
 * owner's guess.
 */
export const minutesPerPerson = (shop: Pick<Shop, "avgMinutes" | "minutesEach">) =>
  shop.avgMinutes > 0 ? shop.avgMinutes : shop.minutesEach;

/**
 * Roughly how long until someone at this place is called. Everyone ahead takes a full turn, and
 * the person being served now has, on average, half of theirs left.
 */
export function waitMinutes(place: number, perPerson: number, someoneServing: boolean) {
  if (place <= 0) return 0;
  return Math.round(((place - 1) + (someoneServing ? 0.5 : 0)) * perPerson);
}

/** The wait in words, rounded so it doesn't promise more than it knows */
export function waitLabel(minutes: number) {
  if (minutes <= 0) return "You're next";
  if (minutes < 5) return "Under 5 minutes";
  if (minutes < 60) return `About ${Math.round(minutes / 5) * 5} minutes`;
  const h = Math.floor(minutes / 60);
  const m = Math.round((minutes % 60) / 15) * 15;
  if (m === 60) return `About ${h + 1} h`;
  return m ? `About ${h} h ${m} min` : `About ${h} h`;
}

/** The wait, short enough for a small box: "None", "~25 min", "~1 h 30" */
export function shortWait(minutes: number) {
  if (minutes <= 0) return "None";
  if (minutes < 60) return `~${Math.max(5, Math.round(minutes / 5) * 5)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round((minutes % 60) / 15) * 15;
  if (m === 60) return `~${h + 1} h`;
  return m ? `~${h} h ${m}` : `~${h} h`;
}

/**
 * Learns how long a turn really takes: a running average that leans towards recent customers, so
 * a slow morning doesn't skew the afternoon. Turns under 1 minute or over 2 hours are ignored
 * (a mistaken tap, or a forgotten "Done").
 */
export function learnAverage(previous: number, sample: number) {
  if (!(sample >= 1 && sample <= LIMITS.minutes)) return previous;
  const next = previous > 0 ? previous * 0.7 + sample * 0.3 : sample;
  return Math.round(next * 10) / 10;
}

export const minutesBetween = (from: number, to: number) => Math.max(0, (to - from) / 60000);

/** The waiting tickets in queue order, and the one being served */
export function lineUp(shop: Pick<Shop, "waiting" | "serving">, tickets: Ticket[]) {
  const byNumber = new Map(tickets.filter((t) => t.status === "waiting").map((t) => [t.number, t]));
  const waiting = shop.waiting.map((n) => byNumber.get(n)).filter((t): t is Ticket => Boolean(t));
  const serving = tickets.find((t) => t.status === "called" && t.number === shop.serving) ?? null;
  return { waiting, serving };
}

/** A day's numbers, from its tickets */
export function summarise(id: string, tickets: Ticket[]): Day {
  const served = tickets.filter((t) => t.status === "served");
  const called = tickets.filter((t) => t.calledAt > 0);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
  return {
    id,
    served: served.length,
    noShows: tickets.filter((t) => t.status === "noshow").length,
    left: tickets.filter((t) => t.status === "left").length,
    avgWait: avg(called.map((t) => minutesBetween(t.joinedAt, t.calledAt))),
    avgService: avg(served.filter((t) => t.doneAt > t.calledAt && t.calledAt > 0).map((t) => minutesBetween(t.calledAt, t.doneAt))),
  };
}

/** The busiest hour of the day, by when people joined ("10:00 – 11:00"), or "" with too few */
export function busiestHour(tickets: Ticket[]) {
  if (tickets.length < 3) return "";
  const counts = new Map<number, number>();
  for (const t of tickets) {
    const h = new Date(t.joinedAt).getHours();
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const [hour] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(hour)}:00 – ${two((hour + 1) % 24)}:00`;
}

/** Today's date as yyyy-mm-dd, on this device's clock */
export function todayIso(now = new Date()) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** "Wed 11 Nov" */
export function dayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

/** "3 min ago", "just now", "1 h 5 min ago" */
export function agoLabel(from: number, now: number) {
  const m = Math.floor(minutesBetween(from, now));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

/** Messages for what customers did on their own phones since the last update */
export function ticketChanges(before: Ticket[], after: Ticket[]) {
  const old = new Map(before.map((t) => [t.id, t]));
  const out: string[] = [];
  for (const t of after) {
    const was = old.get(t.id);
    if (!was && !t.walkIn && t.status === "waiting") out.push(`${t.name || "Someone"} joined: number ${numberLabel(t.number)}`);
    if (was && was.status === "waiting" && t.status === "left") out.push(`Number ${numberLabel(t.number)} (${t.name || "a customer"}) left the queue`);
  }
  return out;
}
