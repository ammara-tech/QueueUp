import type { Metadata, Viewport } from "next";
import { Archivo, Bebas_Neue } from "next/font/google";
import AppShell from "@/components/AppShell";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
// For the big numbers: tall and narrow, like a ticket machine's display
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas", display: "swap" });

export const metadata: Metadata = {
  title: "QueueUp — a walk-in queue on everyone's phone",
  description:
    "A walk-in queue for barbers, clinics and small shops: customers scan a QR code, take a number, and see their place in line live on their phone instead of waiting inside.",
  appleWebApp: { capable: true, title: "QueueUp", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#151311" },
  ],
};

// Applies the saved (or the phone's) light/dark theme before the page is drawn, so there's no flash
const themeScript = `try{var t=localStorage.getItem("queueup:theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;if(localStorage.getItem("queueup:signedIn"))document.documentElement.dataset.signedIn="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${archivo.variable} ${bebas.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
