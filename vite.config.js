import { defineConfig } from "vite";
export default defineConfig({
  // WSL-mounted Windows directories do not reliably report native fs events.
  server: { watch: { usePolling: true, interval: 500 }, strictPort: true },
  build: {
    rollupOptions: { output: { manualChunks: { renderer: ["three"] } } },
  },
});
