"use client";

/*
  Getting a customer's attention when their turn comes, even if their phone is in their pocket:
  - a short "ding ding" (the browser only allows sound after a tap on the page, so the sound is
    switched on when they press Join or "Tell me when it's nearly my turn")
  - a vibration, on phones that can
  - the page title changes, so the tab shows it
  - a notification, if they allowed them. These work while the page is open or in the background;
    QueueUp has no server to send them once the browser is fully closed (see the README).
*/

let audio: AudioContext | null = null;

/** Call from a tap: browsers only let a page make sound after the person has touched it */
export function unlockSound() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audio && Ctx) audio = new Ctx();
    void audio?.resume();
  } catch {
    /* no sound on this browser: the screen and vibration still work */
  }
}

export function ding(times = 2) {
  if (!audio) return;
  for (let i = 0; i < times; i++) {
    const start = audio.currentTime + i * 0.35;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = i % 2 ? 660 : 880;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  }
}

export function buzz() {
  try {
    navigator.vibrate?.([300, 120, 300, 120, 500]);
  } catch {
    /* no vibration on this device */
  }
}

export const canNotify = () => typeof window !== "undefined" && "Notification" in window;

export async function askToNotify() {
  unlockSound();
  if (!canNotify()) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  return (await Notification.requestPermission()) as NotificationPermission;
}

/** Shows a notification. Phones (Android) need it to come from the service worker. */
export async function notify(title: string, body: string) {
  if (!canNotify() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, { body, icon: "/icon-192.png", tag: "queueup-turn" });
    new Notification(title, { body, icon: "/icon-192.png", tag: "queueup-turn" });
  } catch {
    /* the screen still shows it */
  }
}
