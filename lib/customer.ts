"use client";

import { useEffect, useState } from "react";
import { arrayRemove, collection, doc, getDoc, onSnapshot, runTransaction, writeBatch } from "firebase/firestore";
import { firebase, firebaseConfigured } from "@/lib/firebase";
import { guestAccount } from "@/lib/auth";
import { cleanName } from "@/lib/queue";
import { readShop, readTicket } from "@/lib/read";
import type { Shop, Ticket } from "@/lib/types";

/*
  The customer's side: the join page (/join?c=CODE) and the TV screen (/screen?c=CODE).

  - Finding the queue: the code in the QR code points to the shop (codes/{code}).
  - The shop's public part (its name, whether it's open, the numbers waiting and the number being
    served) is live, so your place in line updates by itself, with nobody's name on show.
  - Joining gives you a guest account (no email or password) and takes the next number in one
    step on the server. Your ticket is yours alone: only you and the owner can read it.
  - The ticket's id is remembered on this phone, so closing the page or the browser doesn't lose
    your place.
*/

export type Loaded<T> = { status: "loading" } | { status: "missing" } | { status: "ok"; value: T };

/** The shop for a join code, live */
export function useShopByCode(code: string): Loaded<Shop> {
  const [state, setState] = useState<Loaded<Shop>>({ status: "loading" });
  useEffect(() => {
    if (!code || !firebaseConfigured) {
      setState({ status: "missing" });
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    const { db } = firebase();
    getDoc(doc(db, "codes", code))
      .then((snap) => {
        const shopId = snap.data()?.shopId;
        if (cancelled) return;
        if (typeof shopId !== "string") return setState({ status: "missing" });
        stop = onSnapshot(
          doc(db, "shops", shopId),
          (s) => setState(s.exists() ? { status: "ok", value: readShop(s.id, s.data()) } : { status: "missing" }),
          () => setState({ status: "missing" }),
        );
      })
      .catch(() => !cancelled && setState({ status: "missing" }));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [code]);
  return state;
}

const savedKey = (shopId: string) => `queueup:ticket:${shopId}`;

export function savedTicketId(shopId: string) {
  try {
    return localStorage.getItem(savedKey(shopId)) ?? "";
  } catch {
    return "";
  }
}
export function forgetTicket(shopId: string) {
  try {
    localStorage.removeItem(savedKey(shopId));
  } catch {
    /* nothing saved */
  }
}

/** Your ticket, live. "missing" once the owner starts a new day and it's cleared away. */
export function useTicket(shopId: string, ticketId: string): Loaded<Ticket> {
  const [state, setState] = useState<Loaded<Ticket>>({ status: "loading" });
  useEffect(() => {
    if (!shopId || !ticketId) {
      setState({ status: "missing" });
      return;
    }
    let stop: (() => void) | undefined;
    let cancelled = false;
    // The ticket can only be read by the guest account that took it, so wait for it to load
    const unsub = firebase().auth.onAuthStateChanged((user) => {
      stop?.();
      if (cancelled) return;
      if (!user) return setState({ status: "missing" });
      stop = onSnapshot(
        doc(firebase().db, "shops", shopId, "tickets", ticketId),
        (s) => setState(s.exists() ? { status: "ok", value: readTicket(s.id, s.data()) } : { status: "missing" }),
        () => setState({ status: "missing" }),
      );
    });
    return () => {
      cancelled = true;
      unsub();
      stop?.();
    };
  }, [shopId, ticketId]);
  return state;
}

/** Joins the queue and returns the new ticket's id */
export async function joinQueue(shopId: string, rawName: string) {
  const user = await guestAccount();
  const { db } = firebase();
  const shopRef = doc(db, "shops", shopId);
  const ref = doc(collection(db, "shops", shopId, "tickets"));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(shopRef);
    if (!snap.exists()) throw new Error("gone");
    const shop = readShop(snap.id, snap.data());
    if (!shop.open) throw new Error("closed");
    const n = shop.nextNumber;
    tx.set(ref, { number: n, name: cleanName(rawName), uid: user.uid, walkIn: false, status: "waiting", joinedAt: Date.now(), calledAt: 0, doneAt: 0 });
    tx.update(shopRef, { nextNumber: n + 1, waiting: [...shop.waiting, n], lastJoin: ref.id });
  });
  try {
    localStorage.setItem(savedKey(shopId), ref.id);
  } catch {
    /* the ticket still works while this page stays open */
  }
  return ref.id;
}

/** Takes you out of the line, so the people behind you move up */
export async function leaveQueue(shopId: string, ticket: Ticket) {
  const { db } = firebase();
  const batch = writeBatch(db);
  batch.update(doc(db, "shops", shopId, "tickets", ticket.id), { status: "left", doneAt: Date.now() });
  batch.update(doc(db, "shops", shopId), { waiting: arrayRemove(ticket.number), lastLeave: ticket.id });
  await batch.commit();
  forgetTicket(shopId);
}

/** Why joining failed, in words */
export function joinErrorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "closed") return "This queue is paused right now, so nobody can join. Ask at the counter.";
  if (msg === "gone") return "This queue doesn't exist any more.";
  if (!navigator.onLine) return "You're offline. Joining needs a connection: try again when you have signal.";
  return "Couldn't join the queue. Please try again.";
}
