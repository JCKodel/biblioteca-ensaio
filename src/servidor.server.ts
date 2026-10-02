import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { rotaDoCatalogo } from "./features/catalogo/rota.server.ts";

/** O app Hono onde as rotas das fatias se montam, cada uma fechando sobre o `db`. */
export function criarServidor(db: DatabaseSync): Hono {
	const app = new Hono();
	app.get("/api/saude", (c) => c.json({ ok: true }));
	app.route("/api/livros", rotaDoCatalogo(db));
	return app;
}
