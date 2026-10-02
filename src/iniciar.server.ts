import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { aplicarMigracoes, lerMigracoes } from "./banco.server.ts";
import { criarServidor } from "./servidor.server.ts";

// Raiz de composição: o único lugar que abre o banco.
const raiz = fileURLToPath(new URL("..", import.meta.url));
const PORTA = 3000;

mkdirSync(join(raiz, "data"), { recursive: true });
const db = new DatabaseSync(join(raiz, "data", "biblioteca.sqlite"));
aplicarMigracoes(db, lerMigracoes(join(raiz, "migracoes")));

serve({ fetch: criarServidor(db).fetch, port: PORTA }, () => {
	console.log(`servidor em http://localhost:${PORTA}`);
});
