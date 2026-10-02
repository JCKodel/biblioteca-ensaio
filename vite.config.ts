import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		strictPort: true,
		// O e2e passa PORTA_DO_SERVIDOR=3100, para não falar com o npm run dev.
		proxy: {
			"/api": `http://localhost:${process.env.PORTA_DO_SERVIDOR ?? 3000}`,
		},
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
});
