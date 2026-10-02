import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";
import { criarServidor } from "./servidor.server.ts";

test("GET /api/saude responde 200 com ok verdadeiro", async () => {
	const app = criarServidor(new DatabaseSync(":memory:"));
	const resposta = await app.request("/api/saude");
	expect(resposta.status).toBe(200);
	expect(await resposta.json()).toEqual({ ok: true });
});
