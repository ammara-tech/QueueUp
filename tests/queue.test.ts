import { describe, expect, it } from "vitest";
import { agoLabel, busiestHour, cleanName, shortWait, learnAverage, lineUp, minutesPerPerson, numberLabel, ordinal, placeOf, summarise, todayIso, waitLabel, waitMinutes } from "@/lib/queue";
import type { Ticket } from "@/lib/types";

const min = 60000;
const t = (number: number, status: Ticket["status"], extra: Partial<Ticket> = {}): Ticket => ({
  id: "t" + number, number, name: "Person " + number, uid: "u" + number, walkIn: false, status, joinedAt: 0, calledAt: 0, doneAt: 0, ...extra,
});

describe("names and numbers", () => {
  it("tidies names: spaces, and a length limit", () => {
    expect(cleanName("  Thabo   Nkosi ")).toBe("Thabo Nkosi");
    expect(cleanName("x".repeat(50))).toHaveLength(30);
    expect(cleanName("   ")).toBe("");
  });
  it("shows ticket numbers with at least two digits", () => {
    expect(numberLabel(7)).toBe("07");
    expect(numberLabel(12)).toBe("12");
    expect(numberLabel(104)).toBe("104");
  });
  it("writes places in the line as 1st, 2nd, 3rd…", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });
});

describe("your place and your wait", () => {
  it("finds your place in the line, or 0 when you're not in it", () => {
    expect(placeOf([8, 9, 10], 8)).toBe(1);
    expect(placeOf([8, 9, 10], 10)).toBe(3);
    expect(placeOf([8, 9, 10], 4)).toBe(0);
  });
  it("uses the learned time per person once there is one, otherwise the owner's guess", () => {
    expect(minutesPerPerson({ avgMinutes: 0, minutesEach: 20 })).toBe(20);
    expect(minutesPerPerson({ avgMinutes: 14.5, minutesEach: 20 })).toBe(14.5);
  });
  it("counts everyone ahead, plus half a turn for the person being served", () => {
    expect(waitMinutes(1, 20, false)).toBe(0);
    expect(waitMinutes(1, 20, true)).toBe(10);
    expect(waitMinutes(3, 20, true)).toBe(50);
    expect(waitMinutes(0, 20, true)).toBe(0);
  });
  it("says the wait in rounded words", () => {
    expect(waitLabel(0)).toBe("You're next");
    expect(waitLabel(3)).toBe("Under 5 minutes");
    expect(waitLabel(23)).toBe("About 25 minutes");
    expect(waitLabel(60)).toBe("About 1 h");
    expect(waitLabel(95)).toBe("About 1 h 30 min");
    expect(waitLabel(119)).toBe("About 2 h");
  });
  it("learns how long a turn takes, leaning towards recent customers", () => {
    expect(learnAverage(0, 18)).toBe(18);
    expect(learnAverage(20, 10)).toBe(17);
    expect(learnAverage(20, 0.2)).toBe(20); // a mistaken tap is ignored
    expect(learnAverage(20, 300)).toBe(20); // so is a forgotten "Done"
  });
});

describe("the line", () => {
  it("puts the waiting tickets in queue order and finds who's being served", () => {
    const tickets = [t(5, "called"), t(6, "waiting"), t(7, "waiting"), t(8, "waiting"), t(4, "served")];
    const { waiting, serving } = lineUp({ waiting: [7, 6, 8], serving: 5 }, tickets);
    expect(waiting.map((x) => x.number)).toEqual([7, 6, 8]);
    expect(serving?.number).toBe(5);
  });
  it("leaves out numbers whose ticket isn't waiting any more", () => {
    const { waiting, serving } = lineUp({ waiting: [6, 7], serving: null }, [t(6, "left"), t(7, "waiting")]);
    expect(waiting.map((x) => x.number)).toEqual([7]);
    expect(serving).toBeNull();
  });
});

describe("a day's numbers", () => {
  it("counts who was served, didn't come or left, and the average wait and turn", () => {
    const day = summarise("2026-11-11", [
      t(1, "served", { joinedAt: 0, calledAt: 10 * min, doneAt: 30 * min }),
      t(2, "served", { joinedAt: 0, calledAt: 20 * min, doneAt: 30 * min }),
      t(3, "noshow", { joinedAt: 0, calledAt: 30 * min, doneAt: 32 * min }),
      t(4, "left", { joinedAt: 0, doneAt: 5 * min }),
      t(5, "waiting"),
    ]);
    expect(day).toEqual({ id: "2026-11-11", served: 2, noShows: 1, left: 1, avgWait: 20, avgService: 15 });
  });
  it("finds the busiest hour, by when people joined", () => {
    const at = (h: number, m = 0) => new Date(2026, 10, 11, h, m).getTime();
    expect(busiestHour([t(1, "served", { joinedAt: at(9) }), t(2, "served", { joinedAt: at(10, 5) }), t(3, "served", { joinedAt: at(10, 40) })])).toBe("10:00 – 11:00");
    expect(busiestHour([t(1, "served")])).toBe("");
  });
  it("writes dates and times the way the screens show them", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(agoLabel(0, 30 * 1000)).toBe("just now");
    expect(agoLabel(0, 7 * min)).toBe("7 min ago");
    expect(agoLabel(0, 65 * min)).toBe("1 h 5 min ago");
  });
});

describe("short waits", () => {
  it("fits the wait in a small box", () => {
    expect([0, 2, 23, 60, 95, 119].map(shortWait)).toEqual(["None", "~5 min", "~25 min", "~1 h", "~1 h 30", "~2 h"]);
  });
});
