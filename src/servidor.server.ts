import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";

/** O app Hono onde as rotas das fatias se montam, cada uma fechando sobre o `db`. */
export function criarServidor(
	// biome-ignore lint/correctness/noUnusedFunctionParameters: a primeira rota que fecha sobre o db chega com catalogo
	db: DatabaseSync,
): Hono {
	const app = new Hono();
	app.get("/api/saude", (c) => c.json({ ok: true }));
	return app;
}
