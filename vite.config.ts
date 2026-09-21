// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      // The guarded wrapper in src/lib/pwa.ts is the only registrar.
      injectRegister: null,
      // The manifest is authored by hand in public/manifest.webmanifest.
      manifest: false,
      filename: "sw.js",
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,woff2,png,svg,webmanifest}"],
        // HTML navigations must never be served cache-first.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigationPreload: false,
        runtimeCaching: [
          {
            // App shell / pages: always try the network first.
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "achtela-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/api/public/images/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "achtela-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "achtela-fonts" },
          },
        ],
      },
    }),
  ],
});
