import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["ride-india-logo.svg"],
      manifest: {
        name: "Ride India Moto Tourism",
        short_name: "RideIndia",
        description: "Bike rentals, tourism routes, bookings, payments and ride planning.",
        theme_color: "#0b1222",
        background_color: "#04060d",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "ride-india-logo.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "ride-india-logo.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
