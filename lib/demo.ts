"use client";

import { deleteUser } from "firebase/auth";
import { firebase } from "@/lib/firebase";
import { deleteEverything, seedDemo } from "@/lib/actions";
import { setDemo, signOutUser } from "@/lib/auth";

/*
  "Try the demo": look around QueueUp as the owner of a made-up barbershop, without an account.
  - The guest gets their own private account (Firebase anonymous sign-in, lib/auth.ts), so the
    security rules protect a demo exactly like a real account.
  - The first time a guest has no queue yet, it's filled with an example (seedDemo in lib/actions.ts).
    A note on the device remembers that, so deleting it doesn't bring it back.
  - "End the demo" deletes the queue, then the guest account itself.
*/

const seededKey = (uid: string) => `queueup:demoSeeded:${uid}`;

/** Fills a new guest's account with the example barbershop, once */
export function seedDemoOnce(uid: string) {
  try {
    if (localStorage.getItem(seededKey(uid))) return;
    localStorage.setItem(seededKey(uid), "1");
  } catch {
    /* storage blocked: still seed */
  }
  seedDemo().catch(() => {}); // if it fails, the usual "start your queue" screen is still there
}

/** Deletes the demo queue and the guest account. Needs a connection. */
export async function endDemo() {
  const user = firebase().auth.currentUser;
  if (!user) return;
  await deleteEverything();
  try {
    localStorage.removeItem(seededKey(user.uid));
  } catch {
    /* nothing to remove */
  }
  setDemo(false);
  try {
    await deleteUser(user);
  } catch {
    await signOutUser(); // if Firebase won't delete it, at least sign out
  }
}
