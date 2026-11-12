import { describe, expect, it } from "vitest";
import { readDay, readShop, readTicket } from "@/lib/read";
import { ticketChanges } from "@/lib/queue";
import type { Ticket } from "@/lib/types";

describe("reading what's saved", () => {
  it("turns a broken or empty shop into safe defaults", () => {
    const shop = readShop("s1", { waiting: [3, "x", -1, 3, 4.5, 5], serving: "7", kind: "spaceship", minutesEach: 999 });
    expect(shop.name).toBe("My queue");
    expect(shop.kind).toBe("other");
    expect(shop.waiting).toEqual([3, 5]);
    expect(shop.serving).toBeNull();
    expect(shop.minutesEach).toBe(120);
    expect(shop.nextNumber).toBe(1);
    expect(shop.open).toBe(false);
  });
  it("keeps a good ticket as it is, and fixes an odd status", () => {
    const good = { number: 4, name: "Lerato", uid: "u", walkIn: true, status: "called", joinedAt: 1, calledAt: 2, doneAt: 0 };
    expect(readTicket("t", good)).toEqual({ id: "t", ...good });
    expect(readTicket("t", { ...good, status: "teleported" }).status).toBe("waiting");
  });
  it("reads a day's summary", () => {
    expect(readDay("2026-11-10", { served: 21, noShows: "2" })).toEqual({ id: "2026-11-10", served: 21, noShows: 0, left: 0, avgWait: 0, avgService: 0 });
  });
});

describe("messages for the owner", () => {
  const t = (id: string, number: number, status: Ticket["status"], walkIn = false): Ticket => ({ id, number, name: "Lerato", uid: "u", walkIn, status, joinedAt: 0, calledAt: 0, doneAt: 0 });
  it("says when someone joins by scanning, but not for walk-ins the owner added", () => {
    expect(ticketChanges([], [t("a", 12, "waiting"), t("b", 13, "waiting", true)])).toEqual(["Lerato joined: number 12"]);
  });
  it("says when someone takes themselves out of the line", () => {
    expect(ticketChanges([t("a", 8, "waiting")], [t("a", 8, "left")])).toEqual(["Number 08 (Lerato) left the queue"]);
    expect(ticketChanges([t("a", 8, "called")], [t("a", 8, "served")])).toEqual([]);
  });
});
