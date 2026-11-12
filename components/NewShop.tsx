"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { createShop } from "@/lib/actions";
import { KINDS, LIMITS } from "@/lib/queue";
import type { Kind } from "@/lib/types";

/*
  Signed in, but no queue yet: three questions, and the queue is ready, with its QR code.
  The minutes are only a first guess for the wait times customers see: QueueUp learns the real
  time per person from the people you serve.
*/
export default function NewShop() {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("barber");
  const [minutes, setMinutes] = useState(KINDS.barber.minutes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createShop({ name, kind, minutesEach: minutes });
    } catch {
      setError("Couldn't start your queue. Starting one needs a connection: check it and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <p className="font-number text-6xl text-brand">01</p>
      <h1 className="mt-2 text-3xl font-extrabold">Start your queue</h1>
      <p className="mt-2 text-ink-soft">Three questions, and your queue is ready, with a QR code for your door.</p>

      <form onSubmit={submit} className="panel mt-6 space-y-5">
        <label className="block text-sm font-bold">
          What&apos;s your business called?
          <input required maxLength={LIMITS.shopName} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sipho's Cuts" className="field mt-1 font-normal" />
        </label>
        <fieldset>
          <legend className="text-sm font-bold">What kind of place is it?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <label key={k} className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${kind === k ? "border-brand bg-brand-soft" : "border-line"}`}>
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setMinutes(KINDS[k].minutes);
                  }}
                  className="sr-only"
                />
                {KINDS[k].label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold">
          About how many minutes does one person take?
          <input type="number" required min={1} max={LIMITS.minutes} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="field mt-1 w-28 font-normal" />
          <span className="mt-1 block font-normal text-ink-soft">Only a first guess: QueueUp learns the real time from the people you serve.</span>
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn w-full py-3">
          <Icon name="ticket" />
          {busy ? "Starting…" : "Start my queue"}
        </button>
      </form>
    </div>
  );
}
