import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { aplicarMigracoes, lerMigracoes } from "./banco.server.ts";
import { criarServidor } from "./servidor.server.ts";

// Raiz de composição: o único lugar que abre o banco.
// BANCO: caminho relativo à raiz do repositório, ou :memory: (o do e2e).
// PORTA_DO_SERVIDOR: a porta do servidor (o e2e usa 3100).
const raiz = fileURLToPath(new URL("..", import.meta.url));
const BANCO = process.env.BANCO ?? join("data", "biblioteca.sqlite");
const PORTA = Number(process.env.PORTA_DO_SERVIDOR ?? 3000);

let caminho = BANCO;
if (BANCO !== ":memory:") {
	caminho = resolve(raiz, BANCO);
	mkdirSync(dirname(caminho), { recursive: true });
}
const db = new DatabaseSync(caminho);
aplicarMigracoes(db, lerMigracoes(join(raiz, "migracoes")));

serve({ fetch: criarServidor(db).fetch, port: PORTA }, () => {
	console.log(`servidor em http://localhost:${PORTA}, banco ${BANCO}`);
});
