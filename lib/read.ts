import { isKind, LIMITS } from "@/lib/queue";
import type { Day, Shop, Ticket, TicketStatus } from "@/lib/types";

/*
  Everything read from Firestore goes through these first. A missing or odd field (an older
  version of the app, or something typed in the Firebase console) becomes a safe default instead
  of crashing a page. The security rules check what's written; this checks what's read.
*/

type Raw = Record<string, unknown>;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const count = (v: unknown, min = 0) => (typeof v === "number" && Number.isFinite(v) && v >= min ? Math.floor(v) : min);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const STATUSES: TicketStatus[] = ["waiting", "called", "served", "noshow", "left"];

export function readShop(id: string, d: Raw): Shop {
  const waiting = Array.isArray(d.waiting) ? d.waiting.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0) : [];
  return {
    id,
    ownerId: text(d.ownerId, 128),
    name: text(d.name, LIMITS.shopName) || "My queue",
    kind: isKind(d.kind) ? d.kind : "other",
    code: text(d.code, 6),
    open: d.open === true,
    note: text(d.note, LIMITS.note),
    minutesEach: Math.min(LIMITS.minutes, count(d.minutesEach, 1)),
    avgMinutes: Math.min(LIMITS.minutes, num(d.avgMinutes)),
    nextNumber: count(d.nextNumber, 1),
    waiting: [...new Set(waiting)],
    serving: typeof d.serving === "number" && d.serving > 0 ? Math.floor(d.serving) : null,
    lastJoin: text(d.lastJoin, 40),
    lastLeave: text(d.lastLeave, 40),
    day: text(d.day, 10),
    createdAt: num(d.createdAt),
  };
}

export function readTicket(id: string, d: Raw): Ticket {
  return {
    id,
    number: count(d.number, 1),
    name: text(d.name, LIMITS.name),
    uid: text(d.uid, 128),
    walkIn: d.walkIn === true,
    status: STATUSES.includes(d.status as TicketStatus) ? (d.status as TicketStatus) : "waiting",
    joinedAt: num(d.joinedAt),
    calledAt: num(d.calledAt),
    doneAt: num(d.doneAt),
  };
}

export function readDay(id: string, d: Raw): Day {
  return { id, served: count(d.served), noShows: count(d.noShows), left: count(d.left), avgWait: num(d.avgWait), avgService: num(d.avgService) };
}
