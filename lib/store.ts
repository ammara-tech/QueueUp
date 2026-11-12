"use client";

import { useSyncExternalStore } from "react";
import { collection, limit, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { ticketChanges } from "@/lib/queue";
import { readDay, readShop, readTicket } from "@/lib/read";
import type { Day, Shop, Ticket } from "@/lib/types";

/*
  The owner's live copy of their queue, kept up to date by Firestore.

  connect(uid) finds the shop you own, then listens to it, its tickets and its last few days.
  When a customer joins by scanning the QR code, or takes themselves out of the line, Firestore
  sends the change within a moment, the queue re-draws, and a message pops up
  ("Lerato joined: number 12").

  Your own changes show straight away, even with weak signal: Firestore saves them on the device
  first ("pending") and sends them when it can.
*/

export type Toast = { id: number; text: string };

export type AppState = {
  uid: string | null;
  status: "loading" | "noShop" | "ready";
  shop: Shop | null;
  tickets: Ticket[];
  days: Day[];
  pending: boolean;
  online: boolean;
  toasts: Toast[];
  problem: string | null;
};

let state: AppState = { uid: null, status: "loading", shop: null, tickets: [], days: [], pending: false, online: true, toasts: [], problem: null };

const listeners = new Set<() => void>();
function set(change: Partial<AppState>) {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
}

let stops: Unsubscribe[] = [];
let stopShopQuery: Unsubscribe | null = null;
let watching: string | null = null;
let firstTickets = true;
const pendingParts = new Map<string, boolean>();
let toastId = 0;

function setPending(part: string, value: boolean) {
  pendingParts.set(part, value);
  set({ pending: [...pendingParts.values()].some(Boolean) });
}

export function addToast(text: string) {
  const toast = { id: ++toastId, text };
  set({ toasts: [...state.toasts, toast].slice(-3) });
  setTimeout(() => dismissToast(toast.id), 4500);
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function reportProblem(problem: string | null) {
  set({ problem });
}

function stopWatchingShop() {
  stops.forEach((stop) => stop());
  stops = [];
  watching = null;
  firstTickets = true;
  pendingParts.clear();
}

function watchShop(id: string) {
  if (watching === id) return;
  stopWatchingShop();
  watching = id;
  const { db } = firebase();
  stops.push(
    onSnapshot(
      collection(db, "shops", id, "tickets"),
      { includeMetadataChanges: true },
      (snap) => {
        setPending("tickets", snap.metadata.hasPendingWrites);
        const tickets = snap.docs.map((d) => readTicket(d.id, d.data())).sort((a, b) => a.number - b.number);
        if (!firstTickets && !snap.metadata.hasPendingWrites) ticketChanges(state.tickets, tickets).forEach(addToast);
        firstTickets = false;
        set({ tickets });
      },
      () => set({ tickets: [] }),
    ),
    onSnapshot(
      collection(db, "shops", id, "days"),
      (snap) => set({ days: snap.docs.map((d) => readDay(d.id, d.data())).sort((a, b) => a.id.localeCompare(b.id)).slice(-14) }),
      () => set({ days: [] }),
    ),
  );
}

const onOnline = () => set({ online: navigator.onLine });

export function connect(uid: string) {
  if (state.uid === uid) return;
  disconnect();
  set({ uid, status: "loading", online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOnline);
  // One shop per account: the shop you own
  stopShopQuery = onSnapshot(
    query(collection(firebase().db, "shops"), where("ownerId", "==", uid), limit(1)),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("shop", snap.metadata.hasPendingWrites);
      const d = snap.docs[0];
      if (!d) {
        // Only the server's answer counts: an empty copy on this device may just be out of date
        if (!snap.metadata.fromCache || state.status !== "loading") {
          stopWatchingShop();
          set({ status: "noShop", shop: null, tickets: [], days: [] });
        }
        return;
      }
      set({ shop: readShop(d.id, d.data()), status: "ready" });
      watchShop(d.id);
    },
    () => set({ status: "noShop", problem: "Couldn't load your queue. Check your connection and refresh the page." }),
  );
}

export function disconnect() {
  stopShopQuery?.();
  stopShopQuery = null;
  stopWatchingShop();
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOnline);
  set({ uid: null, status: "loading", shop: null, tickets: [], days: [], pending: false, problem: null });
}

export function getApp() {
  return state;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getApp, getApp);
}
