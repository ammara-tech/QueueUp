/*
  What QueueUp stores in Firestore.

  shops/{shopId}                 one queue: a barber, a clinic, a shop counter…
    The public part a customer needs is here (name, open or not, the numbers waiting, the number
    being served), so the join page and the TV screen can show it without seeing anyone's name.
  shops/{shopId}/tickets/{id}    one person in the queue. Only the owner and that customer can read it.
  shops/{shopId}/days/{date}     a short summary of each finished day, for the Today page's chart.
  codes/{code}                   the join code in the QR code, pointing to its shop.
*/

export type Kind = "barber" | "salon" | "clinic" | "shop" | "office" | "other";

export type Shop = {
  id: string;
  ownerId: string;
  name: string;
  kind: Kind;
  code: string; // the join code in the QR code and link
  open: boolean; // false: paused, nobody can join
  note: string; // a short message on the join page ("Back at 14:00", "Cash only")
  minutesEach: number; // the owner's guess of how long one customer takes
  avgMinutes: number; // learned from real customers (0 until there are some)
  nextNumber: number; // the number the next person gets
  waiting: number[]; // the numbers waiting, in order
  serving: number | null; // the number being served now
  lastJoin: string; // the ticket a customer just added (the security rules check it)
  lastLeave: string; // the ticket a customer just took out of the queue (also checked)
  day: string; // the date these numbers belong to (yyyy-mm-dd)
  createdAt: number;
};

export type TicketStatus = "waiting" | "called" | "served" | "noshow" | "left";

export type Ticket = {
  id: string;
  number: number;
  name: string;
  uid: string; // the customer's (guest) account, or the owner's for a walk-in they added
  walkIn: boolean; // added by the owner at the counter, not by scanning
  status: TicketStatus;
  joinedAt: number;
  calledAt: number; // 0 until called
  doneAt: number; // 0 until served, no-show or left
};

export type Day = {
  id: string; // yyyy-mm-dd
  served: number;
  noShows: number;
  left: number;
  avgWait: number; // minutes from joining to being called
  avgService: number; // minutes from being called to done
};
