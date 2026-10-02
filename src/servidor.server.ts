import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { rotaDoCatalogo } from "./features/catalogo/rota.server.ts";
import { rotaDeEmprestimos } from "./features/emprestimos/rota.server.ts";
import { rotaDeMembros } from "./features/membros/rota.server.ts";

/**
 * O app Hono onde as rotas das fatias se montam, cada uma fechando sobre o
 * `db`. `relogioDeTeste` liga o cabeçalho `x-hoje`; só o e2e o liga.
 */
export function criarServidor(
	db: DatabaseSync,
	opcoes: { relogioDeTeste: boolean } = { relogioDeTeste: false },
): Hono {
	const app = new Hono();
	app.get("/api/saude", (c) => c.json({ ok: true }));
	app.route("/api/livros", rotaDoCatalogo(db));
	app.route("/api/membros", rotaDeMembros(db));
	app.route("/api/emprestimos", rotaDeEmprestimos(db, opcoes.relogioDeTeste));
	return app;
}
