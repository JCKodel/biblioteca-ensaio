import { defineConfig } from "@playwright/test";

// O e2e tem servidor, cliente e banco próprios (porta 3100, porta 5174,
// :memory:), e nunca reaproveita o npm run dev nem grava no banco dele. As
// variáveis vão pelo env do webServer, igual em todo sistema (ADR-0005).
export default defineConfig({
	testDir: "e2e",
	testMatch: "*.spec.ts",
	use: { baseURL: "http://localhost:5174", browserName: "chromium" },
	projects: [
		{ name: "390", use: { viewport: { width: 390, height: 844 } } },
		{ name: "1280", use: { viewport: { width: 1280, height: 800 } } },
	],
	webServer: [
		{
			command: "node src/iniciar.server.ts",
			env: { BANCO: ":memory:", PORTA_DO_SERVIDOR: "3100" },
			url: "http://localhost:3100/api/saude",
			reuseExistingServer: false,
		},
		{
			command: "npx vite --port 5174 --strictPort",
			env: { PORTA_DO_SERVIDOR: "3100" },
			url: "http://localhost:5174",
			reuseExistingServer: false,
		},
	],
});
