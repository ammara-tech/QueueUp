"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { addWalkIn, callNext, finish, removeWaiting, startNewDay } from "@/lib/actions";
import { agoLabel, dayLabel, LIMITS, lineUp, minutesBetween, minutesPerPerson, numberLabel, shortWait, todayIso, waitMinutes } from "@/lib/queue";
import { addToast, useApp } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { useNow } from "@/lib/useNow";

/*
  The owner's queue, live.
  Left: the person being served now, on a ticket, with Done and No-show, and the big "Call next"
  button. Right: everyone waiting, in order, with how long they've waited, a way to add someone
  who walked in without a phone, and buttons to call someone out of turn or take them out.
  Customers' phones update within a moment of each tap.
*/
export default function QueuePage() {
  const { shop, tickets } = useApp();
  const now = useNow();
  if (!shop) return null;
  const { waiting, serving } = lineUp(shop, tickets);
  const next = waiting[0] ?? null;
  const perPerson = minutesPerPerson(shop);
  const servedToday = tickets.filter((t) => t.status === "served").length;
  const oldDay = shop.day && shop.day !== todayIso(new Date(now));

  return (
    <div className="space-y-6">
      {oldDay && <NewDayBanner day={shop.day} />}
      {!shop.open && (
        <p className="rounded-xl border-2 border-mustard bg-mustard-soft px-4 py-3 text-sm">
          <strong>Your queue is paused.</strong> Nobody new can join until you press <strong>Paused</strong> at the top to open it again. People already waiting keep their place.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Now serving, and Call next */}
        <section aria-labelledby="serving-title" className="space-y-4">
          <div className="overflow-hidden rounded-3xl bg-board text-board-ink">
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 id="serving-title" className="text-[11px] font-bold uppercase tracking-[0.2em] text-board-soft">
                Now serving
              </h2>
              {serving && <span className="text-sm text-board-soft">called {agoLabel(serving.calledAt, now)}</span>}
            </div>
            {serving ? (
              <div className="px-6 pb-6">
                <p className="font-number led text-[7rem] sm:text-[8rem]">{numberLabel(serving.number)}</p>
                <p className="-mt-1 text-2xl font-bold">{serving.name || "No name"}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => finish(serving, "served")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 font-bold hover:bg-white/20">
                    <Icon name="check" className="h-5 w-5 text-[#74d39a]" />
                    Done
                  </button>
                  <button type="button" onClick={() => finish(serving, "noshow")} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-bold text-board-soft hover:bg-white/10 hover:text-board-ink">
                    <Icon name="userX" className="h-5 w-5" />
                    Didn&apos;t come
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <p className="font-number text-[7rem] text-board-soft/40 sm:text-[8rem]">––</p>
                <p className="-mt-1 text-board-soft">Nobody yet. Call the next person when you&apos;re ready.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => callNext(serving, next)}
            disabled={!next && !serving}
            className="btn w-full justify-between rounded-2xl px-6 py-5 text-left text-lg"
          >
            <span>
              <span className="block">{next ? "Call next" : serving ? "Finish, nobody waiting" : "Nobody waiting"}</span>
              {next && (
                <span className="block text-sm font-semibold opacity-90">
                  {serving ? `${serving.name || numberLabel(serving.number)} is done, then ` : ""}
                  {numberLabel(next.number)} · {next.name || "No name"}
                </span>
              )}
            </span>
            <Icon name="next" className="h-7 w-7" />
          </button>

          <dl className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Waiting" value={String(waiting.length)} />
            <Stat label="Wait for someone new" value={shortWait(waitMinutes(waiting.length + 1, perPerson, Boolean(serving)))} plain />
            <Stat label="Served today" value={String(servedToday)} />
          </dl>
          <p className="text-xs text-ink-soft">
            Waits use {shop.avgMinutes > 0 ? `${Math.round(perPerson)} minutes per person, learned from the people you've served` : `your guess of ${perPerson} minutes per person, until QueueUp learns the real time`}.
          </p>
        </section>

        {/* The line */}
        <section aria-labelledby="waiting-title" className="panel !p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line px-5 py-4">
            <h2 id="waiting-title" className="text-xl font-extrabold">
              Waiting <span className="font-number ml-1 text-3xl text-brand">{waiting.length}</span>
            </h2>
            <Link href="/poster" className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
              <Icon name="qr" className="h-4 w-4" />
              QR code and TV screen
            </Link>
          </div>
          <WalkIn />
          {waiting.length === 0 ? (
            <p className="px-5 py-10 text-center text-ink-soft">
              Nobody&apos;s waiting. When customers scan your QR code, they appear here straight away.
            </p>
          ) : (
            <ol className="divide-y-2 divide-dashed divide-line">
              {waiting.map((t, i) => (
                <WaitingRow key={t.id} ticket={t} place={i + 1} now={now} wait={waitMinutes(i + 1, perPerson, Boolean(serving))} serving={serving} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="panel !px-2 !py-3">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className={plain ? "mt-2 text-lg font-extrabold" : "font-number mt-1 text-3xl"}>{value}</dd>
    </div>
  );
}

function WaitingRow({ ticket, place, now, wait, serving }: { ticket: Ticket; place: number; now: number; wait: number; serving: Ticket | null }) {
  const waited = minutesBetween(ticket.joinedAt, now);
  return (
    <li className="rise flex items-center gap-4 px-5 py-3">
      <span className="font-number w-14 shrink-0 rounded-lg bg-brand-soft py-1 text-center text-3xl text-brand">{numberLabel(ticket.number)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {ticket.name || "No name"}
          {ticket.walkIn && <span className="ml-2 rounded-full bg-mustard-soft px-2 py-0.5 text-xs font-semibold text-mustard-ink">walk-in</span>}
        </p>
        <p className="text-sm text-ink-soft">
          {place === 1 ? "Next" : `${place} in line`} · waiting {Math.floor(waited)} min{place > 1 && ` · called in ~${Math.max(1, wait)} min`}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={() => callNext(serving, ticket)} className="tool" title={`Call ${numberLabel(ticket.number)} now`} aria-label={`Call ${numberLabel(ticket.number)}, ${ticket.name || "no name"}, now`}>
          <Icon name="bell" />
        </button>
        <button
          type="button"
          onClick={() => {
            removeWaiting(ticket, "left");
            addToast(`Took ${numberLabel(ticket.number)} out of the queue`);
          }}
          className="tool hover:!bg-alert-soft hover:!text-alert"
          title="Take out of the queue"
          aria-label={`Take ${numberLabel(ticket.number)}, ${ticket.name || "no name"}, out of the queue`}
        >
          <Icon name="close" />
        </button>
      </div>
    </li>
  );
}

/** Someone at the counter without a phone (or who'd rather not scan): the owner takes a number for them */
function WalkIn() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addWalkIn(name);
      setName("");
    } catch {
      addToast("Couldn't add them. Adding someone needs a connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex gap-2 border-b-2 border-line bg-page/50 px-5 py-3">
      <label htmlFor="walkin" className="sr-only">
        Name of someone who walked in
      </label>
      <input id="walkin" value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="Walked in without a phone? Their name" className="field !py-2" />
      <button type="submit" disabled={busy} className="btn shrink-0 !px-4 !py-2">
        <Icon name="plus" className="h-4 w-4" />
        Add
      </button>
    </form>
  );
}

/** Yesterday's tickets are still here: start today's queue from 01 */
function NewDayBanner({ day }: { day: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-brand/50 bg-brand-soft px-4 py-3">
      <p className="flex-1 text-sm">
        <strong>This queue is from {dayLabel(day)}.</strong> Start today&apos;s queue: the numbers go back to 01, and that day&apos;s totals are saved for the Today page.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          startNewDay()
            .then(() => addToast("A new day: numbers start again from 01"))
            .catch(() => addToast("Couldn't start a new day. It needs a connection."))
            .finally(() => setBusy(false));
        }}
        className="btn py-2 text-sm"
      >
        Start today&apos;s queue
      </button>
    </div>
  );
}
