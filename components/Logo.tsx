/* QueueUp's logo: a tomato-red tile with a paper ticket coming out of it, its number in red */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#c2301c" />
      <path d="M9 9h14v5.2a1.8 1.8 0 0 0 0 3.6V23H9v-5.2a1.8 1.8 0 0 0 0-3.6V9Z" fill="#fffaf1" />
      <path d="M12.6 12.6h2.6v6.8M17.6 12.6h2.6l-2 6.8" fill="none" stroke="#c2301c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="5.5" width="14" height="2" rx="1" fill="#f2c14e" />
    </svg>
  );
}
