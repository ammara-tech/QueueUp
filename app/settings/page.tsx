"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { deleteEverything, newJoinCode, startNewDay, updateShop } from "@/lib/actions";
import { signOutUser } from "@/lib/auth";
import { firebase } from "@/lib/firebase";
import { KINDS, LIMITS } from "@/lib/queue";
import { addToast, useApp } from "@/lib/store";
import type { Kind } from "@/lib/types";

/*
  Settings: the queue's name and kind, the time per person to start from, a note customers see
  when they join, a new QR code (if the old one was shared too widely), starting a new day by hand,
  signing out, and deleting everything.
*/
export default function SettingsPage() {
  const { shop } = useApp();
  if (!shop) return null;
  return <Form key={shop.id} />;
}

function Form() {
  const shop = useApp().shop!;
  const [name, setName] = useState(shop.name);
  const [kind, setKind] = useState<Kind>(shop.kind);
  const [minutes, setMinutes] = useState(shop.minutesEach);
  const [note, setNote] = useState(shop.note);
  const [busy, setBusy] = useState("");
  const demo = Boolean(firebase().auth.currentUser?.isAnonymous);

  function save(e: FormEvent) {
    e.preventDefault();
    updateShop({ name, kind, minutesEach: minutes, note });
    addToast("Saved");
  }

  async function run(what: string, action: () => Promise<unknown>, done: string) {
    setBusy(what);
    try {
      await action();
      addToast(done);
    } catch {
      addToast("That needs a connection. Check it and try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-number text-6xl">Settings</h1>

      <form onSubmit={save} className="panel space-y-5">
        <h2 className="text-lg font-extrabold">Your queue</h2>
        <label className="block text-sm font-bold">
          Name
          <input required maxLength={LIMITS.shopName} value={name} onChange={(e) => setName(e.target.value)} className="field mt-1 font-normal" />
        </label>
        <label className="block text-sm font-bold">
          Kind of place
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="field mt-1 font-normal">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KINDS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Minutes per person, to start with
          <input type="number" required min={1} max={LIMITS.minutes} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="field mt-1 w-28 font-normal" />
          <span className="mt-1 block font-normal text-ink-soft">
            {shop.avgMinutes > 0 ? `QueueUp has learned ${Math.round(shop.avgMinutes)} minutes from the people you've served, and uses that instead.` : "Used for wait times until QueueUp learns the real time from the people you serve."}
          </span>
        </label>
        <label className="block text-sm font-bold">
          A note for customers <span className="font-normal text-ink-soft">(optional)</span>
          <input maxLength={LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash only · Back at 14:00 · Fades take longer" className="field mt-1 font-normal" />
          <span className="mt-1 block font-normal text-ink-soft">Shown on the join page and on everyone&apos;s ticket.</span>
        </label>
        <button type="submit" className="btn">
          <Icon name="check" className="h-4 w-4" />
          Save
        </button>
      </form>

      <section className="panel space-y-3">
        <h2 className="text-lg font-extrabold">Start a new day</h2>
        <p className="text-sm text-ink-soft">Clears today&apos;s tickets and starts the numbers again from 01. The day&apos;s totals are kept for the Today page, without names. QueueUp also offers this by itself the next morning.</p>
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => confirm("Start a new day? Everyone still waiting is taken out of the queue, and the numbers start again from 01.") && run("day", startNewDay, "A new day: numbers start again from 01")}
          className="btn-quiet"
        >
          {busy === "day" ? "Starting…" : "Start a new day now"}
        </button>
      </section>

      <section className="panel space-y-3">
        <h2 className="text-lg font-extrabold">New QR code</h2>
        <p className="text-sm text-ink-soft">
          Your code is <strong className="font-mono tracking-widest text-ink">{shop.code}</strong>. If it was shared somewhere it shouldn&apos;t be, make a new one: the old QR code and posters stop working, so print the new poster.
        </p>
        <button type="button" disabled={busy !== ""} onClick={() => confirm("Make a new QR code? Old posters will stop working.") && run("code", newJoinCode, "New QR code made: print the new poster")} className="btn-quiet">
          <Icon name="refresh" className="h-4 w-4" />
          {busy === "code" ? "Making…" : "Make a new QR code"}
        </button>
      </section>

      <section className="panel space-y-3">
        <h2 className="text-lg font-extrabold">Your account</h2>
        {!demo && (
          <button type="button" onClick={() => signOutUser()} className="btn-quiet">
            <Icon name="logout" className="h-4 w-4" />
            Sign out
          </button>
        )}
        <div className="rounded-xl border-2 border-alert/30 p-4">
          <h3 className="font-bold text-alert">Delete everything</h3>
          <p className="mt-1 text-sm text-ink-soft">Deletes your queue, every ticket, every day&apos;s totals and the QR code. This can&apos;t be undone.</p>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() => confirm(`Delete ${shop.name}'s queue and everything in it? This can't be undone.`) && run("delete", deleteEverything, "Everything is deleted")}
            className="btn mt-3 !bg-alert !text-white dark:!text-[#151311]"
          >
            <Icon name="trash" className="h-4 w-4" />
            {busy === "delete" ? "Deleting…" : "Delete everything"}
          </button>
        </div>
      </section>
    </div>
  );
}
