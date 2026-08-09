import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "BillingEngine",
        short_name: "BillingEngine",
        description: "Premium Subscription Billing Management System",
        theme_color: "#C5A059",
        background_color: "#FAF6EE",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["business", "finance", "productivity"],
        icons: [
          { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    } ),
  ],
});