"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { updateShop } from "@/lib/actions";
import { numberLabel } from "@/lib/queue";
import { useApp } from "@/lib/store";

/*
  The top of the owner's pages: the black "Now serving" board you'd see above a counter, with the
  number glowing red, how many are waiting, and a switch to pause the queue (nobody can join while
  it's paused). Under it, the pages, as tabs.
*/
const PAGES: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Queue", icon: "ticket" },
  { href: "/today", label: "Today", icon: "chart" },
  { href: "/poster", label: "QR code", icon: "qr" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function Header() {
  const { shop, pending } = useApp();
  const path = usePathname();
  if (!shop) return null;
  const isCurrent = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="no-print">
      <div className="bg-board text-board-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`QueueUp: ${shop.name}`}>
            <Logo className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-board-soft">QueueUp</span>
              <span className="block truncate font-bold leading-tight">{shop.name}</span>
            </span>
          </Link>

          <p className="order-last flex w-full items-baseline gap-3 sm:order-none sm:ml-auto sm:w-auto" aria-live="polite">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-board-soft">Now serving</span>
            <span className="font-number led text-4xl">{shop.serving ? numberLabel(shop.serving) : "––"}</span>
            <span className="text-sm text-board-soft">
              · <strong className="text-board-ink">{shop.waiting.length}</strong> waiting
            </span>
            {pending && <span className="sr-only">Saving your changes</span>}
          </p>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <button
              type="button"
              onClick={() => updateShop({ open: !shop.open })}
              aria-pressed={!shop.open}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${shop.open ? "bg-[#1f6b3a] text-white" : "bg-mustard text-on-mustard"}`}
              title={shop.open ? "Pause the queue: nobody new can join" : "Open the queue again"}
            >
              <Icon name={shop.open ? "play" : "pause"} className="h-4 w-4" />
              {shop.open ? "Open" : "Paused"}
            </button>
            <ThemeToggle className="inline-flex h-10 min-w-10 items-center justify-center rounded-full text-board-soft hover:bg-white/10 hover:text-board-ink" />
          </div>
        </div>
      </div>

      <nav aria-label="Pages" className="border-b-2 border-line">
        <ul className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-3 pt-3 sm:gap-1 sm:px-4">
          {PAGES.map((p) => {
            const current = isCurrent(p.href);
            return (
              <li key={p.href} className="shrink-0">
                <Link
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  className={`-mb-0.5 flex items-center gap-1.5 rounded-t-xl border-2 px-2.5 py-2 text-sm font-bold sm:px-4 ${
                    current ? "border-line border-b-page bg-page text-brand" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  <Icon name={p.icon} className="h-4 w-4" />
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
