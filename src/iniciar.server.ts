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
// RELOGIO_DE_TESTE: com o valor `cabecalho`, o `hoje` de cada requisição pode
// vir do cabeçalho `x-hoje`; só o playwright.config.ts a define (ADR-0005).
const raiz = fileURLToPath(new URL("..", import.meta.url));
const BANCO = process.env.BANCO ?? join("data", "biblioteca.sqlite");
const PORTA = Number(process.env.PORTA_DO_SERVIDOR ?? 3000);
const RELOGIO_DE_TESTE = process.env.RELOGIO_DE_TESTE === "cabecalho";

let caminho = BANCO;
if (BANCO !== ":memory:") {
	caminho = resolve(raiz, BANCO);
	mkdirSync(dirname(caminho), { recursive: true });
}
const db = new DatabaseSync(caminho);
aplicarMigracoes(db, lerMigracoes(join(raiz, "migracoes")));

const app = criarServidor(db, { relogioDeTeste: RELOGIO_DE_TESTE });

serve({ fetch: app.fetch, port: PORTA }, () => {
	console.log(`servidor em http://localhost:${PORTA}, banco ${BANCO}`);
});
