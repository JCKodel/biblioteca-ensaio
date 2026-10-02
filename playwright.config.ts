import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	testMatch: "*.spec.ts",
	use: { baseURL: "http://localhost:5173", browserName: "chromium" },
	projects: [
		{ name: "390", use: { viewport: { width: 390, height: 844 } } },
		{ name: "1280", use: { viewport: { width: 1280, height: 800 } } },
	],
	webServer: [
		{
			command: "node src/iniciar.server.ts",
			url: "http://localhost:3000/api/saude",
			reuseExistingServer: true,
		},
		{
			command: "npx vite",
			url: "http://localhost:5173",
			reuseExistingServer: true,
		},
	],
});
