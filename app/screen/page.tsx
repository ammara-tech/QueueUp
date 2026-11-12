"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import QrCode from "@/components/QrCode";
import { ding, unlockSound } from "@/lib/alerts";
import { joinLink, readCode } from "@/lib/code";
import { useShopByCode } from "@/lib/customer";
import { minutesPerPerson, numberLabel, shortWait, waitMinutes } from "@/lib/queue";
import { useNow } from "@/lib/useNow";

/*
  The TV screen (/screen?c=CODE): open it on a TV, an old tablet or a laptop facing the waiting
  area. A big glowing "Now serving" number, the next five numbers, and the QR code to join, all
  live. It shows numbers only, never names. "Sound on" makes it ding when the number changes
  (browsers only allow sound after a tap), and it asks the device not to sleep.
*/
export default function ScreenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-board" />}>
      <Screen />
    </Suspense>
  );
}

function Screen() {
  const code = readCode(useSearchParams().get("c"));
  const shop = useShopByCode(code);
  const now = useNow(15000);
  const [sound, setSound] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // Ask the device not to dim or sleep while the screen is showing (where the browser allows it)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const ask = () => {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      wl?.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    ask();
    const again = () => document.visibilityState === "visible" && ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, []);

  // A ding when the number being served changes
  const serving = shop.status === "ok" ? shop.value.serving : null;
  const last = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (last.current !== undefined && serving !== null && serving !== last.current && sound) ding(2);
    last.current = serving;
  }, [serving, sound]);

  if (shop.status !== "ok")
    return (
      <main className="flex min-h-screen items-center justify-center bg-board p-8 text-center text-board-ink">
        <h1 className="text-2xl font-bold">{shop.status === "loading" ? "Opening the screen…" : "This screen's link doesn't lead to a queue. Open it again from QueueUp's QR poster page."}</h1>
      </main>
    );

  const s = shop.value;
  const next = s.waiting.slice(0, 5);
  const link = origin ? joinLink(origin, s.code) : "";
  const time = new Date(now).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="flex min-h-screen flex-col bg-board p-6 text-board-ink sm:p-10">
      <header className="flex items-center gap-3">
        <Logo className="h-10 w-10" />
        <h1 className="flex-1 truncate text-2xl font-bold sm:text-3xl">{s.name}</h1>
        <p className="font-number text-4xl text-board-soft">{time}</p>
      </header>

      <div className="mt-6 grid flex-1 gap-8 lg:grid-cols-[3fr_2fr]">
        <section aria-live="polite" className="flex flex-col justify-center rounded-3xl border-2 border-white/10 p-8">
          <h2 className="text-lg font-bold uppercase tracking-[0.3em] text-board-soft">Now serving</h2>
          <p className="font-number led text-[11rem] leading-none sm:text-[16rem]">{s.serving ? numberLabel(s.serving) : "––"}</p>
          {!s.open && <p className="mt-2 inline-block self-start rounded-full bg-mustard px-4 py-1 font-bold text-on-mustard">Queue paused: nobody new can join right now</p>}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border-2 border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-board-soft">Next</h2>
            {next.length ? (
              <ol className="mt-3 flex flex-wrap gap-3">
                {next.map((n, i) => (
                  <li key={n} className={`font-number rounded-xl px-4 py-1 text-5xl ${i === 0 ? "bg-mustard text-on-mustard" : "bg-white/10"}`}>
                    {numberLabel(n)}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-xl text-board-soft">Nobody waiting</p>
            )}
            <p className="mt-4 text-board-soft">
              {s.waiting.length} waiting · a new number waits {shortWait(waitMinutes(s.waiting.length + 1, minutesPerPerson(s), s.serving !== null)).replace("None", "no time")}
            </p>
          </section>

          {s.open && link && (
            <section className="flex items-center gap-5 rounded-3xl bg-[#fffaf1] p-5 text-[#1d1a16]">
              <QrCode text={link} className="h-36 w-36 shrink-0 sm:h-44 sm:w-44" label="QR code to join the queue" />
              <div>
                <h2 className="font-number text-4xl text-[#c2301c]">Scan to join</h2>
                <p className="mt-1 text-sm">Take a number on your phone and wait wherever you like.</p>
                <p className="mt-2 text-xs text-[#5b544a]">Or type the code: <strong className="font-mono text-base tracking-widest text-[#1d1a16]">{s.code}</strong></p>
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-between text-sm text-board-soft">
        <span>QueueUp · numbers only, no names on this screen</span>
        {!sound ? (
          <button
            type="button"
            onClick={() => {
              unlockSound();
              setSound(true);
              ding(1);
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 font-semibold text-board-ink hover:bg-white/10"
          >
            <Icon name="bell" className="h-4 w-4" />
            Sound on
          </button>
        ) : (
          <span>Sound is on</span>
        )}
      </footer>
    </main>
  );
}
