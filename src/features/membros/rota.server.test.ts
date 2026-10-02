import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../banco.server.ts";
import { criarServidor } from "../../servidor.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const MIGRACOES = fileURLToPath(new URL("../../../migracoes", import.meta.url));

function servidor() {
	const db = new DatabaseSync(":memory:");
	aplicarMigracoes(db, lerMigracoes(MIGRACOES));
	return { db, app: criarServidor(db) };
}

function postarMembro(app: ReturnType<typeof criarServidor>, corpo: unknown) {
	return app.request("/api/membros", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(corpo),
	});
}

async function cadastrado(app: ReturnType<typeof criarServidor>, nome: string) {
	return (await postarMembro(app, { nome })).json();
}

describe("rotas dos membros", () => {
	test("POST /api/membros responde 201 com o membro cadastrado, ativo", async () => {
		const { app } = servidor();
		const resposta = await postarMembro(app, { nome: " Capitu " });
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toEqual({
			id: expect.any(String),
			nome: "Capitu",
			suspenso: false,
		});
	});

	test("POST /api/membros responde 400 com a recusa", async () => {
		const { app } = servidor();
		const resposta = await postarMembro(app, { nome: "   " });
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ recusa: "NomeInvalido" });
	});

	test("POST /api/membros lê um nome que não é string como vazio e recusa", async () => {
		const { app } = servidor();
		const resposta = await postarMembro(app, { nome: 7 });
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ recusa: "NomeInvalido" });
	});

	test("POST /api/membros lê um corpo que não é JSON como pedido vazio e recusa", async () => {
		const { app } = servidor();
		const resposta = await app.request("/api/membros", {
			method: "POST",
			body: "isto não é JSON",
		});
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ recusa: "NomeInvalido" });
	});

	test("POST /api/membros/:membroId/suspensao responde 200 com o membro suspenso", async () => {
		const { app } = servidor();
		const membro = await cadastrado(app, "Capitu");
		const resposta = await app.request(`/api/membros/${membro.id}/suspensao`, {
			method: "POST",
		});
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ ...membro, suspenso: true });
	});

	test("POST /api/membros/:membroId/reativacao responde 200 com o membro ativo", async () => {
		const { app } = servidor();
		const membro = await cadastrado(app, "Capitu");
		await app.request(`/api/membros/${membro.id}/suspensao`, {
			method: "POST",
		});
		const resposta = await app.request(`/api/membros/${membro.id}/reativacao`, {
			method: "POST",
		});
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ ...membro, suspenso: false });
	});

	test("suspender um membro já suspenso responde 200 com a situação gravada", async () => {
		const { app } = servidor();
		const membro = await cadastrado(app, "Capitu");
		const suspender = () =>
			app.request(`/api/membros/${membro.id}/suspensao`, { method: "POST" });
		await suspender();
		const resposta = await suspender();
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({ ...membro, suspenso: true });
	});

	test("suspensão e reativação respondem 404 para um membro inexistente", async () => {
		const { app } = servidor();
		for (const acao of ["suspensao", "reativacao"]) {
			const resposta = await app.request(`/api/membros/999/${acao}`, {
				method: "POST",
			});
			expect(resposta.status).toBe(404);
			expect(await resposta.json()).toEqual({ recusa: "NaoEncontrado" });
		}
	});

	test("GET /api/membros responde 200 com a lista, do mais recente ao mais antigo, com a situação", async () => {
		const { app } = servidor();
		const antigo = await cadastrado(app, "Capitu");
		const recente = await cadastrado(app, "Capitu");
		await app.request(`/api/membros/${antigo.id}/suspensao`, {
			method: "POST",
		});
		const resposta = await app.request("/api/membros");
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual([
			{ ...recente, suspenso: false },
			{ ...antigo, suspenso: true },
		]);
	});

	test("uma falha do banco responde 500 sem a mensagem do SQLite, escrita no log", async () => {
		const erros = vi.spyOn(console, "error").mockImplementation(() => {});
		const { db, app } = servidor();
		db.close();
		for (const [caminho, metodo] of [
			["/api/membros", "GET"],
			["/api/membros", "POST"],
			["/api/membros/1/suspensao", "POST"],
		] as const) {
			const resposta = await app.request(caminho, {
				method: metodo,
				body: metodo === "POST" ? JSON.stringify({ nome: "Capitu" }) : null,
			});
			expect(resposta.status).toBe(500);
			expect(await resposta.json()).toEqual({ falha: "BancoDeDadosFalhou" });
		}
		expect(erros).toHaveBeenCalledWith(expect.stringMatching(/not open/));
		erros.mockRestore();
	});
});
