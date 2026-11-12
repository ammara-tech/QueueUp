"use client";

import { arrayRemove, collection, doc, getDocs, runTransaction, writeBatch, type DocumentReference, type WriteBatch } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { newCode } from "@/lib/code";
import { cleanName, learnAverage, LIMITS, minutesBetween, numberLabel, summarise, todayIso } from "@/lib/queue";
import { readShop } from "@/lib/read";
import { addToast, getApp, reportProblem } from "@/lib/store";
import type { Kind, Shop, Ticket } from "@/lib/types";

/*
  Everything the owner changes. Most changes are sent as one batch, so they happen together or
  not at all, and they show straight away even with weak signal (Firestore sends them when it can).
  Taking a number (adding a walk-in) is a transaction instead: it reads the next number from the
  server and takes it in one step, so two people can never get the same number.
  The security rules (firestore.rules) check every one.
*/

const db = () => firebase().db;
const me = () => {
  const uid = firebase().auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};
const shopRef = (id: string) => doc(db(), "shops", id);
const ticketRef = (shopId: string, id: string) => doc(db(), "shops", shopId, "tickets", id);
const currentShop = () => {
  const shop = getApp().shop;
  if (!shop) throw new Error("No queue yet");
  return shop;
};

/** Sends a batch, and says so if the server refuses it (it still shows on screen until then) */
function quietly(p: Promise<unknown>) {
  p.catch((e) => {
    console.error("Saving failed:", e);
    reportProblem("A change couldn't be saved. Refresh the page to see what's really in your queue.");
  });
}

export type NewShop = { name: string; kind: Kind; minutesEach: number };

/** Starts a queue: the shop and its join code, together. Tries another code if one is taken. */
export async function createShop(fields: NewShop, extra: Partial<Shop> = {}) {
  const uid = me();
  for (let tries = 0; tries < 4; tries++) {
    const ref = doc(collection(db(), "shops"));
    const code = newCode();
    const batch = writeBatch(db());
    batch.set(ref, {
      ownerId: uid,
      name: cleanName(fields.name, LIMITS.shopName) || "My queue",
      kind: fields.kind,
      code,
      open: true,
      note: "",
      minutesEach: Math.min(LIMITS.minutes, Math.max(1, Math.round(fields.minutesEach) || 10)),
      avgMinutes: 0,
      nextNumber: 1,
      waiting: [],
      serving: null,
      lastJoin: "",
      lastLeave: "",
      day: todayIso(),
      createdAt: Date.now(),
      ...extra,
    });
    batch.set(doc(db(), "codes", code), { shopId: ref.id });
    try {
      await batch.commit();
      return ref;
    } catch (e) {
      if (tries === 3) throw e; // most likely offline: creating a queue needs a connection
    }
  }
  throw new Error("Couldn't start the queue");
}

export function updateShop(fields: Partial<Pick<Shop, "name" | "kind" | "minutesEach" | "note" | "open">>) {
  const clean = { ...fields };
  if (clean.name !== undefined) clean.name = cleanName(clean.name, LIMITS.shopName) || "My queue";
  if (clean.note !== undefined) clean.note = cleanName(clean.note, LIMITS.note);
  if (clean.minutesEach !== undefined) clean.minutesEach = Math.min(LIMITS.minutes, Math.max(1, Math.round(clean.minutesEach) || 10));
  const batch = writeBatch(db());
  batch.update(shopRef(currentShop().id), clean);
  quietly(batch.commit());
}

/** A new join code: the old QR code and posters stop working (if one was shared too widely) */
export async function newJoinCode() {
  const shop = currentShop();
  const code = newCode();
  const batch = writeBatch(db());
  batch.delete(doc(db(), "codes", shop.code));
  batch.set(doc(db(), "codes", code), { shopId: shop.id });
  batch.update(shopRef(shop.id), { code });
  await batch.commit();
}

/** Someone at the counter without a phone: the owner takes a number for them */
export async function addWalkIn(rawName: string) {
  const shopId = currentShop().id;
  const name = cleanName(rawName) || "Walk-in";
  const uid = me();
  const number = await runTransaction(db(), async (tx) => {
    const snap = await tx.get(shopRef(shopId));
    if (!snap.exists()) throw new Error("No queue");
    const shop = readShop(snap.id, snap.data());
    const ref = doc(collection(db(), "shops", shopId, "tickets"));
    const n = shop.nextNumber;
    tx.set(ref, { number: n, name, uid, walkIn: true, status: "waiting", joinedAt: Date.now(), calledAt: 0, doneAt: 0 });
    tx.update(shopRef(shopId), { nextNumber: n + 1, waiting: [...shop.waiting, n] });
    return n;
  });
  addToast(`${name} is number ${numberLabel(number)}`);
}

/** Finishes the person being served (if any) in a batch, and learns how long their turn took */
function finishServing(batch: WriteBatch, shop: Shop, serving: Ticket | null, outcome: "served" | "noshow", now: number) {
  if (!serving) return {};
  batch.update(ticketRef(shop.id, serving.id), { status: outcome, doneAt: now });
  return outcome === "served" && serving.calledAt ? { avgMinutes: learnAverage(shop.avgMinutes, minutesBetween(serving.calledAt, now)) } : {};
}

/**
 * "Call next": the person being served is done, and the next one (or the one chosen) is called.
 * Their phone shows "It's your turn" within a moment.
 */
export function callNext(serving: Ticket | null, next: Ticket | null) {
  const shop = currentShop();
  const now = Date.now();
  const batch = writeBatch(db());
  const ref = shopRef(shop.id);
  const learned = finishServing(batch, shop, serving, "served", now);
  if (next) {
    batch.update(ticketRef(shop.id, next.id), { status: "called", calledAt: now });
    batch.update(ref, { ...learned, serving: next.number, waiting: arrayRemove(next.number) });
  } else {
    batch.update(ref, { ...learned, serving: null });
  }
  quietly(batch.commit());
}

/** Done with the person being served, without calling anyone yet */
export function finish(serving: Ticket, outcome: "served" | "noshow") {
  const shop = currentShop();
  const batch = writeBatch(db());
  const ref = shopRef(shop.id);
  const learned = finishServing(batch, shop, serving, outcome, Date.now());
  batch.update(ref, { ...learned, serving: null });
  quietly(batch.commit());
}

/** Takes someone out of the line: they didn't come, or they told you they're leaving */
export function removeWaiting(ticket: Ticket, outcome: "noshow" | "left") {
  const shop = currentShop();
  const batch = writeBatch(db());
  batch.update(ticketRef(shop.id, ticket.id), { status: outcome, doneAt: Date.now() });
  batch.update(shopRef(shop.id), { waiting: arrayRemove(ticket.number) });
  quietly(batch.commit());
}

/** Firestore takes up to 500 changes in one batch; bigger jobs are sent in parts */
async function inParts(refs: DocumentReference[], last: (b: WriteBatch) => void) {
  const parts: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += 450) parts.push(refs.slice(i, i + 450));
  if (!parts.length) parts.push([]);
  for (let p = 0; p < parts.length; p++) {
    const batch = writeBatch(db());
    parts[p].forEach((r) => batch.delete(r));
    if (p === parts.length - 1) last(batch); // the summary and the shop's change go with the last part
    await batch.commit();
  }
}

/**
 * "Start a new day": saves a short summary of the last day (for the chart on the Today page),
 * clears the tickets, and starts the numbers again from 01.
 */
export async function startNewDay() {
  const shop = currentShop();
  const tickets = getApp().tickets;
  const refs = tickets.map((t) => ticketRef(shop.id, t.id));
  await inParts(refs, (batch) => {
    if (tickets.length) {
      const { id, ...summary } = summarise(shop.day || todayIso(), tickets);
      batch.set(doc(db(), "shops", shop.id, "days", id), summary);
    }
    batch.update(shopRef(shop.id), { nextNumber: 1, waiting: [], serving: null, lastJoin: "", lastLeave: "", day: todayIso() });
  });
}

/** Deletes the queue: its tickets, its days, its join code and the shop itself */
export async function deleteEverything() {
  const shop = getApp().shop;
  if (!shop) return;
  const days = await getDocs(collection(db(), "shops", shop.id, "days"));
  const refs = [...getApp().tickets.map((t) => ticketRef(shop.id, t.id)), ...days.docs.map((d) => d.ref)];
  await inParts(refs, (batch) => {
    batch.delete(doc(db(), "codes", shop.code));
    batch.delete(shopRef(shop.id));
  });
}

/** For a new demo: a barbershop mid-morning, with people waiting, one in the chair and a week of history */
export async function seedDemo() {
  const now = Date.now();
  const min = 60000;
  const names = ["Kagiso", "Thabo", "Lerato", "Ayesha", "Pieter", "Nomvula", "Sizwe", "Fatima"];
  const ref = await createShop(
    { name: "Sipho's Cuts", kind: "barber", minutesEach: 20 },
    { avgMinutes: 17.5, nextNumber: 13, waiting: [8, 9, 10, 11, 12], serving: 7, note: "Card and cash welcome. Fades take a little longer." },
  );
  const batch = writeBatch(db());
  const tickets = collection(db(), "shops", ref.id, "tickets");
  // Numbers 01 to 06 are done (one didn't come), 07 is in the chair, 08 to 12 are waiting
  for (let n = 1; n <= 12; n++) {
    const joinedAt = now - (12 - n) * 9 * min - 25 * min;
    const status = n <= 6 ? (n === 4 ? "noshow" : "served") : n === 7 ? "called" : "waiting";
    const calledAt = n <= 7 ? joinedAt + 22 * min : 0;
    const doneAt = n <= 6 ? calledAt + (15 + (n % 3) * 3) * min : 0;
    batch.set(doc(tickets), {
      number: n,
      name: names[n % names.length],
      uid: me(),
      walkIn: n % 3 === 0,
      status,
      joinedAt,
      calledAt: n === 7 ? now - 6 * min : calledAt,
      doneAt,
    });
  }
  // The last six days, for the chart
  for (let d = 6; d >= 1; d--) {
    const day = todayIso(new Date(now - d * 24 * 60 * min));
    const served = [18, 24, 21, 9, 27, 30][6 - d];
    batch.set(doc(db(), "shops", ref.id, "days", day), { served, noShows: d % 3, left: d % 2, avgWait: 14 + d * 2, avgService: 17 + (d % 3) });
  }
  await batch.commit();
}
