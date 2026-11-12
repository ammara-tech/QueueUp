"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { askToNotify, buzz, canNotify, ding, notify, unlockSound } from "@/lib/alerts";
import { readCode } from "@/lib/code";
import { forgetTicket, joinErrorMessage, joinQueue, leaveQueue, savedTicketId, useShopByCode, useTicket } from "@/lib/customer";
import { LIMITS, minutesPerPerson, numberLabel, ordinal, placeOf, waitLabel, waitMinutes } from "@/lib/queue";
import type { Shop, Ticket } from "@/lib/types";

/*
  The customer's page, opened by scanning a shop's QR code (/join?c=CODE). No account and no app:
  type your name, take a number, and this page becomes your ticket, with your place in line and
  roughly how long you'll wait, updating by itself. When the owner calls you, it turns green,
  dings and vibrates. Your ticket is remembered on this phone, so you can close the page and come
  back to it.
*/
export default function JoinPage() {
  return (
    <Suspense fallback={<Frame>{null}</Frame>}>
      <Join />
    </Suspense>
  );
}

function Join() {
  const code = readCode(useSearchParams().get("c"));
  const shop = useShopByCode(code);
  const [ticketId, setTicketId] = useState("");
  const shopId = shop.status === "ok" ? shop.value.id : "";
  useEffect(() => {
    if (shopId) setTicketId(savedTicketId(shopId));
  }, [shopId]);

  if (shop.status === "loading") return <Frame>{<p className="py-20 text-center text-ink-soft" role="status">Finding the queue…</p>}</Frame>;
  if (shop.status === "missing")
    return (
      <Frame>
        <div className="py-12 text-center">
          <p className="font-number text-7xl text-brand">??</p>
          <h1 className="mt-3 text-2xl font-extrabold">This QR code doesn&apos;t lead to a queue</h1>
          <p className="mt-2 text-ink-soft">The shop may have printed a new code, or the link was cut short. Ask at the counter for the current one.</p>
        </div>
      </Frame>
    );

  return (
    <Frame shop={shop.value}>
      {ticketId ? (
        <MyTicket
          shop={shop.value}
          ticketId={ticketId}
          onDone={() => {
            forgetTicket(shop.value.id);
            setTicketId("");
          }}
        />
      ) : (
        <JoinForm shop={shop.value} onJoined={setTicketId} />
      )}
    </Frame>
  );
}

function Frame({ shop, children }: { shop?: Shop; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-board text-board-ink">
        <div className="mx-auto flex max-w-md items-center gap-2.5 px-4 py-3">
          <Logo className="h-8 w-8" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-board-soft">QueueUp</span>
            <span className="block truncate font-bold leading-tight">{shop?.name ?? "Walk-in queue"}</span>
          </span>
          <ThemeToggle className="inline-flex h-10 min-w-10 items-center justify-center rounded-full text-board-soft hover:bg-white/10 hover:text-board-ink" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-md px-4 pb-16 pt-6">
        {children}
      </main>
    </div>
  );
}

function ShopNote({ shop }: { shop: Shop }) {
  if (!shop.note) return null;
  return (
    <p className="mt-4 flex gap-2 rounded-xl bg-mustard-soft px-4 py-3 text-sm">
      <Icon name="megaphone" className="mt-0.5 h-4 w-4 shrink-0 text-mustard-ink" />
      <span>
        <span className="sr-only">A note from {shop.name}: </span>
        {shop.note}
      </span>
    </p>
  );
}

function JoinForm({ shop, onJoined }: { shop: Shop; onJoined: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wait = waitMinutes(shop.waiting.length + 1, minutesPerPerson(shop), shop.serving !== null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    unlockSound();
    setBusy(true);
    setError("");
    try {
      onJoined(await joinQueue(shop.id, name));
    } catch (err) {
      console.error("Joining failed:", err);
      setError(joinErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-number text-6xl">Take a number</h1>
      <p className="mt-1 text-ink-soft">Wait wherever you like. This page shows your place in line, and tells you when it&apos;s your turn.</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="panel !py-3">
          <dt className="text-xs font-semibold text-ink-soft">Waiting now</dt>
          <dd className="font-number mt-1 text-4xl">{shop.waiting.length}</dd>
        </div>
        <div className="panel !py-3">
          <dt className="text-xs font-semibold text-ink-soft">Your wait</dt>
          <dd className="mt-2 font-bold">{wait <= 0 ? "No wait" : waitLabel(wait).replace("About ", "About ")}</dd>
        </div>
      </dl>
      <ShopNote shop={shop} />

      {shop.open ? (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold">
            Your name
            <span className="block font-normal text-ink-soft">So they know who to call. Only {shop.name} sees it.</span>
            <input required maxLength={LIMITS.name} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className="field mt-2 font-normal" />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn w-full py-4 text-lg">
            <Icon name="ticket" />
            {busy ? "Taking a number…" : "Join the queue"}
          </button>
          <p className="text-center text-xs text-ink-soft">No app and no account. Your ticket is kept on this phone.</p>
        </form>
      ) : (
        <p className="mt-6 rounded-2xl border-2 border-mustard bg-mustard-soft p-4">
          <strong>The queue is paused right now,</strong> so nobody can join. It may be closing time, or they&apos;re catching up. Ask at the counter, or try again soon: this page updates by itself.
        </p>
      )}
    </div>
  );
}

function MyTicket({ shop, ticketId, onDone }: { shop: Shop; ticketId: string; onDone: () => void }) {
  const loaded = useTicket(shop.id, ticketId);
  if (loaded.status === "loading") return <p className="py-20 text-center text-ink-soft" role="status">Finding your ticket…</p>;
  if (loaded.status === "missing")
    return (
      <Finished title="This ticket isn't in the queue any more" text="The shop has started a new day's queue, or the ticket was taken out. You can take a new number." onDone={onDone} />
    );
  const ticket = loaded.value;
  if (ticket.status === "served") return <Finished title="Thanks for coming!" text={`You've been served at ${shop.name}. See you next time.`} onDone={onDone} />;
  if (ticket.status === "noshow") return <Finished title="You missed your turn" text="You were called but didn't come. Ask at the counter: they may fit you in, or take a new number." onDone={onDone} />;
  if (ticket.status === "left") return <Finished title="You left the queue" text="Your place went to the next person. You can take a new number any time." onDone={onDone} />;
  return <Live shop={shop} ticket={ticket} onLeft={onDone} />;
}

function Live({ shop, ticket, onLeft }: { shop: Shop; ticket: Ticket; onLeft: () => void }) {
  const called = ticket.status === "called" || shop.serving === ticket.number;
  const place = placeOf(shop.waiting, ticket.number);
  const wait = waitMinutes(place, minutesPerPerson(shop), shop.serving !== null);
  const [leaving, setLeaving] = useState(false);
  const [notifyState, setNotifyState] = useState<string>(() => (canNotify() ? Notification.permission : "unsupported"));

  // Your turn: ding, buzz, change the tab's title and send a notification, once
  const alerted = useRef({ called: false, soon: false });
  useEffect(() => {
    const title = document.title;
    if (called && !alerted.current.called) {
      alerted.current.called = true;
      ding(3);
      buzz();
      notify(`It's your turn at ${shop.name}`, `Number ${numberLabel(ticket.number)}: please go to the counter.`);
    }
    if (!called && place > 0 && place <= 2 && !alerted.current.soon) {
      alerted.current.soon = true;
      ding(1);
      notify(`Almost your turn at ${shop.name}`, `You're ${ordinal(place)} in line. Start heading back.`);
    }
    if (called) document.title = `🔔 Your turn! · ${shop.name}`;
    return () => {
      document.title = title;
    };
  }, [called, place, shop.name, ticket.number]);

  if (called)
    return (
      <div role="alert" className="your-turn ticket rounded-3xl bg-go px-6 py-8 text-center text-white [--tear:8.5rem] dark:text-[#0d0b09]">
        <h1 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-90">It&apos;s your turn</h1>
        <p className="font-number mt-2 text-[8rem]">{numberLabel(ticket.number)}</p>
        <p className="mt-6 text-2xl font-extrabold">Please go to the counter</p>
        <p className="mt-1 opacity-90">{ticket.name ? `${ticket.name}, ${shop.name} is ready for you.` : `${shop.name} is ready for you.`}</p>
      </div>
    );

  return (
    <div>
      <h1 className="sr-only">Your ticket at {shop.name}</h1>
      <div className="ticket rounded-3xl bg-card px-6 pb-6 pt-5 shadow-sm [--tear:9.6rem]">
        <p className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-go motion-safe:animate-pulse" aria-hidden="true" />
            Live
          </span>
          <span>Your number</span>
        </p>
        <p className="font-number mt-1 text-right text-[6.5rem] text-brand">{numberLabel(ticket.number)}</p>
        <div className="tear -mx-6 mt-2" />
        <div aria-live="polite" className="mt-4">
          <p className="text-3xl font-extrabold">{place === 1 ? "You're next!" : `${ordinal(place)} in line`}</p>
          <p className="mt-1 text-lg">{place === 1 && shop.serving === null ? "Any moment now" : waitLabel(wait)}</p>
          <p className="mt-3 text-sm text-ink-soft">
            Now serving: <strong className="font-number text-xl text-ink">{shop.serving ? numberLabel(shop.serving) : "––"}</strong>
            {ticket.name && <> · Name: {ticket.name}</>}
          </p>
        </div>
      </div>
      <ShopNote shop={shop} />

      <div className="mt-5 space-y-3">
        {notifyState !== "granted" && notifyState !== "unsupported" && notifyState !== "denied" && (
          <button type="button" onClick={() => askToNotify().then(setNotifyState)} className="btn-quiet w-full py-3">
            <Icon name="bell" />
            Tell me when it&apos;s nearly my turn
          </button>
        )}
        {notifyState === "granted" && <p className="text-center text-sm text-ink-soft">We&apos;ll notify you when you&apos;re 2nd in line and when it&apos;s your turn. Keep this page open in the background.</p>}
        {notifyState === "denied" && <p className="text-center text-sm text-ink-soft">Notifications are blocked for this site, so keep this page open: it dings and turns green when it&apos;s your turn.</p>}
        {notifyState === "unsupported" && <p className="text-center text-sm text-ink-soft">Keep this page open: it dings and turns green when it&apos;s your turn.</p>}
        <button
          type="button"
          disabled={leaving}
          onClick={() => {
            if (!confirm("Leave the queue? Your place goes to the next person.")) return;
            setLeaving(true);
            leaveQueue(shop.id, ticket)
              .then(onLeft)
              .catch(() => {
                setLeaving(false);
                alert("Couldn't leave the queue. Check your connection and try again.");
              });
          }}
          className="w-full rounded-xl py-3 text-sm font-bold text-ink-soft hover:bg-alert-soft hover:text-alert"
        >
          {leaving ? "Leaving…" : "Leave the queue"}
        </button>
      </div>
    </div>
  );
}

function Finished({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <div className="py-10 text-center">
      <Icon name="ticket" className="mx-auto h-12 w-12 text-brand" />
      <h1 className="mt-3 text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-ink-soft">{text}</p>
      <button type="button" onClick={onDone} className="btn mt-6">
        Take a new number
      </button>
    </div>
  );
}
