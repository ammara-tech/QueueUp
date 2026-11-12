"use client";

import Icon from "@/components/Icon";
import { busiestHour, dayLabel, minutesPerPerson, summarise, todayIso } from "@/lib/queue";
import { useApp } from "@/lib/store";

/*
  How today is going, and the days before: people served, how long they waited, how long a turn
  took, people who didn't come, and the busiest hour. Each day is saved as a short summary when you
  start the next day's queue, so the chart has no names in it.
*/
export default function TodayPage() {
  const { shop, tickets, days } = useApp();
  if (!shop) return null;
  const today = summarise(shop.day || todayIso(), tickets);
  const busy = busiestHour(tickets);
  const chart = [...days.filter((d) => d.id !== today.id).slice(-6), today];
  const most = Math.max(1, ...chart.map((d) => d.served));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-number text-6xl">Today</h1>
        <p className="text-ink-soft">{dayLabel(today.id)}{shop.day !== todayIso() && " (start today's queue on the Queue page to begin a new day)"}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big label="Served" value={String(today.served)} />
        <Big label="Average wait" value={today.avgWait ? `${Math.round(today.avgWait)} min` : "–"} />
        <Big label="Average turn" value={today.avgService ? `${Math.round(today.avgService)} min` : "–"} />
        <Big label="Didn't come or left" value={String(today.noShows + today.left)} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="chart-title" className="panel">
          <h2 id="chart-title" className="text-lg font-extrabold">
            People served, day by day
          </h2>
          <ol className="mt-5 flex h-56 items-end gap-3">
            {chart.map((d) => (
              <li key={d.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="font-number text-2xl">{d.served}</span>
                <span
                  className={`w-full rounded-t-lg ${d.id === today.id ? "bg-brand" : "bg-mustard"}`}
                  style={{ height: `${Math.max(3, (d.served / most) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold text-ink-soft">
                  {d.id === today.id ? "Today" : dayLabel(d.id).split(" ")[0].replace(",", "")}
                  <span className="sr-only"> ({dayLabel(d.id)}): {d.served} served</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel space-y-4">
          <h2 className="text-lg font-extrabold">Good to know</h2>
          <p className="flex gap-3 text-sm">
            <Icon name="clock" className="h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong>Busiest hour today:</strong> {busy || "not enough customers yet"}
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <Icon name="people" className="h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong>Time per person:</strong>{" "}
              {shop.avgMinutes > 0 ? `${Math.round(minutesPerPerson(shop))} minutes, learned from the people you've served. Customers' wait times use this.` : `your guess of ${shop.minutesEach} minutes, until you've served a few people.`}
            </span>
          </p>
          <p className="flex gap-3 text-sm">
            <Icon name="ticket" className="h-5 w-5 shrink-0 text-brand" />
            <span>
              <strong>Joined by scanning today:</strong> {tickets.filter((t) => !t.walkIn).length} of {tickets.length}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="font-number mt-1 text-5xl">{value}</dd>
    </div>
  );
}
