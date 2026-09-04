import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 by default so the usual `npm run dev` is predictable, but a
    // caller that sets PORT wins -- otherwise a second dev server on this
    // machine just fails to start.
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
  },
});
