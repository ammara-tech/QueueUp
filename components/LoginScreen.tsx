"use client";

import { useEffect, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The owner's sign-in screen: a ticket machine at a deli counter. On the left, a red machine
  printing a ticket, showing what a customer sees on their phone; on the right, the form, on a
  paper ticket. On a phone the machine is a band across the top. Customers never need this
  screen: they join a queue by scanning its QR code.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Opened from a "Try the demo" link (…/?demo): the demo box goes to the top
  const [fromDemoLink, setFromDemoLink] = useState(false);
  useEffect(() => {
    setFromDemoLink(new URLSearchParams(window.location.search).has("demo"));
  }, []);

  const demoBox = (
    <div className="rounded-2xl border-2 border-dashed border-mustard bg-mustard-soft p-4">
      <p className="font-bold">Just looking?</p>
      <p className="mt-1 text-sm">Try QueueUp as the owner of a made-up barbershop, with people waiting and a week of numbers. No account needed, and everything is deleted when you end the demo.</p>
      <button type="button" disabled={busy} onClick={() => run(signInDemo)} className="btn mt-3 w-full !bg-mustard py-2.5 !text-on-mustard">
        Try the demo
      </button>
    </div>
  );


  // If Google sign-in went the full-page way and failed, say why when the page comes back.
  useEffect(() => {
    finishRedirectSignIn().catch((e) => {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e); // the code, for whoever is fixing it
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "signIn" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  async function forgot() {
    if (!email.trim()) {
      setError({ text: "Type your email address first, then press \"Forgot your password?\" again.", code: "" });
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <Machine />

      <main className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="ticket m-auto w-full max-w-md rounded-2xl bg-card px-6 pb-6 pt-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] [--tear:7.6rem] sm:px-8">
          <p className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
            <span>For shop owners</span>
            <span className="font-number text-2xl tracking-normal text-brand">Nº 00</span>
          </p>
          <h1 className="font-number mt-2 text-5xl">{mode === "signIn" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-ink-soft">{mode === "signIn" ? "Sign in to run your queue." : "It's free, and takes a minute."}</p>
          <div className="tear -mx-6 mt-5 sm:-mx-8" />
          {fromDemoLink && <div className="mt-5">{demoBox}</div>}

          <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-5 w-full py-3">
            <Icon name="google" />
            Continue with Google
          </button>

          <p className="my-5 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 font-normal" />
            </label>
            <div>
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" className="text-sm font-semibold text-alert">
                <p>{error.text}</p>
                {error.code && <p className="mt-1 text-xs font-normal opacity-70">Error code: {error.code}</p>}
              </div>
            )}
            {notice && (
              <p role="status" className="text-sm text-brand">
                {notice}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn w-full py-3">
              {mode === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signIn" && (
            <button type="button" onClick={forgot} className="mt-4 text-sm font-semibold text-brand hover:underline">
              Forgot your password?
            </button>
          )}

          <p className="mt-6 text-ink-soft">
            {mode === "signIn" ? "New to QueueUp? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "create" : "signIn");
                setError(null);
                setNotice(null);
              }}
              className="font-bold text-brand hover:underline"
            >
              {mode === "signIn" ? "Create an account" : "Sign in"}
            </button>
          </p>
          {!fromDemoLink && <div className="mt-6">{demoBox}</div>}
          <p className="mt-6 text-sm text-ink-soft">Your queue is private: customers see only the numbers, never anyone&apos;s name. It&apos;s stored in Google&apos;s Firebase database, and you can delete everything in Settings.</p>
        </div>
      </main>
    </div>
  );
}

/*
  The ticket machine: the red box with a ticket coming out of its slot, showing what a customer
  sees on their phone. A big line of text, not the page's heading ("Welcome back" is the h1).
  The ticket is decorative: screen readers skip it, and it doesn't move if you've asked your
  device for less motion.
*/
function Machine() {
  return (
    <aside className="relative overflow-hidden bg-brand px-5 pb-8 pt-6 text-white sm:px-10 lg:flex lg:flex-col lg:px-14 lg:py-12 dark:bg-[#7a1d10]">
      <p className="flex items-center gap-2.5 text-xl font-extrabold">
        <span className="rounded-xl bg-white/15 p-1">
          <Logo className="h-8 w-8" />
        </span>
        QueueUp
      </p>

      <p className="font-number mt-8 text-6xl leading-[0.95] sm:text-7xl lg:mt-14 lg:text-[6.5rem]">
        Take a number.
        <br />
        <span className="text-mustard">Wait anywhere.</span>
      </p>
      <p className="mt-5 max-w-md text-lg text-white/90">
        Your customers scan a QR code at the door, take a number, and watch their place in line on their phone. No crowded waiting room, and you call the next person with one tap.
      </p>

      {/* The machine's slot, and a ticket coming out of it */}
      <div aria-hidden="true" className="relative mt-10 hidden max-w-sm select-none lg:block">
        <div className="relative z-10 h-4 rounded-full bg-black/40 shadow-inner" />
        <div className="print ticket relative mx-4 -mt-2 rounded-b-2xl bg-[#fffaf1] px-6 pb-5 pt-6 text-[#1d1a16] shadow-2xl [--tear:4.6rem]">
          <p className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-[#5b544a]">
            <span>Sipho&apos;s Cuts</span>
            <span>Your number</span>
          </p>
          <p className="font-number mt-1 text-right text-6xl text-[#c2301c]">42</p>
          <div className="tear -mx-6 mt-3 !border-[#e3d9c8]" />
          <p className="mt-3 flex items-center justify-between text-sm">
            <span>
              <strong>3rd</strong> in line
            </span>
            <span className="font-semibold">About 35 minutes</span>
          </p>
          <p className="mt-3 rounded-lg bg-[#fdf0cf] px-3 py-2 text-xs font-semibold">Your phone tells you when it&apos;s your turn.</p>
        </div>
      </div>
    </aside>
  );
}
