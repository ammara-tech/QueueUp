import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-number text-7xl text-brand">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">That number isn&apos;t in the queue</h1>
      <p className="mt-3 text-ink-soft">The address may be mistyped, or the page has moved.</p>
      <Link href="/" className="btn mt-8">
        Back to QueueUp
      </Link>
    </div>
  );
}
