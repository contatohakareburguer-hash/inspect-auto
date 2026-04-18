// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false, // we register manually with iframe/preview guard
        devOptions: {
          enabled: false, // never run SW in dev / Lovable preview iframe
        },
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: {
          name: "Inspect Auto",
          short_name: "Inspect",
          description: "Inspeção veicular profissional",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0f172a",
          theme_color: "#0f172a",
          lang: "pt-BR",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        },
        workbox: {
          // Don't intercept OAuth and Supabase callbacks
          navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /^\/api/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false, // we control update via prompt
          runtimeCaching: [
            {
              // Cache-first for images
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "img-cache",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Stale-while-revalidate for fonts/static
              urlPattern: ({ request }) =>
                request.destination === "style" ||
                request.destination === "script" ||
                request.destination === "font",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "static-cache" },
            },
            {
              // Never cache Supabase API (sensitive + needs fresh data)
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
  },
});
