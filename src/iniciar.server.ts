import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { abrirBanco } from "./banco.server.ts";
import { criarServidor } from "./servidor.server.ts";

// Raiz de composição do servidor. Abre o banco por `abrirBanco`, como a outra
// raiz, o comando dos dados de exemplo (scripts/dadosDeExemplo.ts).
// BANCO: caminho relativo à raiz do repositório, ou :memory: (o do e2e).
// PORTA_DO_SERVIDOR: a porta do servidor (o e2e usa 3100).
// RELOGIO_DE_TESTE: com o valor `cabecalho`, o `hoje` de cada requisição pode
// vir do cabeçalho `x-hoje`; só o playwright.config.ts a define (ADR-0005).
const raiz = fileURLToPath(new URL("..", import.meta.url));
const BANCO = process.env.BANCO ?? join("data", "biblioteca.sqlite");
const PORTA = Number(process.env.PORTA_DO_SERVIDOR ?? 3000);
const RELOGIO_DE_TESTE = process.env.RELOGIO_DE_TESTE === "cabecalho";

const db = abrirBanco(raiz, BANCO);

const app = criarServidor(db, { relogioDeTeste: RELOGIO_DE_TESTE });

serve({ fetch: app.fetch, port: PORTA }, () => {
	console.log(`servidor em http://localhost:${PORTA}, banco ${BANCO}`);
});
