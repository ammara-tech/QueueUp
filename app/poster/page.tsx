"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import QrCode from "@/components/QrCode";
import { joinLink } from "@/lib/code";
import { addToast, useApp } from "@/lib/store";

/*
  Getting customers into the queue: the QR code, as a poster to print and stick on the door or
  the counter, plus the link to share on WhatsApp or social media, and the TV screen for the
  waiting area. Printing shows only the poster (the buttons are hidden).
*/
export default function PosterPage() {
  const { shop } = useApp();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!shop || !origin) return null;
  const link = joinLink(origin, shop.code);
  const screen = `${origin}/screen?c=${shop.code}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)]">
      {/* The poster: A4-shaped, black on white so it prints well on any printer */}
      <article aria-label="QR poster" className="mx-auto w-full max-w-[34rem] rounded-2xl bg-white p-8 text-[#1d1a16] shadow-[0_30px_60px_-35px_rgba(0,0,0,0.5)] ring-1 ring-black/5 sm:p-12 print:max-w-none print:shadow-none print:ring-0">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-[#5b544a]">
          <Logo className="h-7 w-7" />
          {shop.name}
        </p>
        <h1 className="font-number mt-6 text-7xl leading-[0.9] text-[#c2301c] sm:text-8xl">
          Don&apos;t wait
          <br />
          in line.
        </h1>
        <p className="mt-4 text-xl font-semibold">Scan to take a number. Your phone shows your place and tells you when it&apos;s your turn.</p>
        <div className="mt-8 flex justify-center">
          <QrCode text={link} className="h-64 w-64 sm:h-72 sm:w-72" label={`QR code to join ${shop.name}'s queue`} />
        </div>
        <p className="mt-6 text-center text-sm text-[#5b544a]">
          No app needed. Or open <strong className="text-[#1d1a16]">{link.replace(/^https?:\/\//, "")}</strong>
        </p>
        <p className="mt-1 text-center text-sm text-[#5b544a]">
          Code <strong className="font-mono text-lg tracking-[0.3em] text-[#1d1a16]">{shop.code}</strong>
        </p>
      </article>

      <aside className="no-print space-y-4">
        <section className="panel space-y-3">
          <h2 className="text-lg font-extrabold">Put it up</h2>
          <button type="button" onClick={() => window.print()} className="btn w-full">
            <Icon name="print" />
            Print the poster
          </button>
          <p className="text-sm text-ink-soft">Stick it on the door, the counter or the waiting room wall. It prints on one A4 page.</p>
        </section>

        <section className="panel space-y-3">
          <h2 className="text-lg font-extrabold">Share the link</h2>
          <p className="break-all rounded-xl bg-page px-3 py-2 font-mono text-sm">{link}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(link)
                  .then(() => addToast("Link copied"))
                  .catch(() => addToast("Couldn't copy: select the link and copy it"))
              }
              className="btn-quiet flex-1"
            >
              <Icon name="copy" className="h-4 w-4" />
              Copy
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Join the queue at ${shop.name} from your phone: ${link}`)}`} target="_blank" rel="noopener noreferrer" className="btn-quiet flex-1">
              <Icon name="whatsapp" className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </section>

        <section className="panel space-y-3">
          <h2 className="text-lg font-extrabold">TV screen</h2>
          <p className="text-sm text-ink-soft">For a TV, tablet or laptop facing the waiting area: the number being served, the next five, and this QR code. Numbers only, no names.</p>
          <a href={screen} target="_blank" rel="noopener" className="btn-quiet w-full">
            <Icon name="tv" className="h-4 w-4" />
            Open the TV screen
          </a>
        </section>
      </aside>
    </div>
  );
}
