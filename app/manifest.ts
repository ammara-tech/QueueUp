import type { MetadataRoute } from "next";

/* Makes QueueUp installable: "Add to Home screen" on the counter's phone or tablet opens it full screen */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QueueUp",
    short_name: "QueueUp",
    description: "A walk-in queue on everyone's phone.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#c2301c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
