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

function postarLivro(app: ReturnType<typeof criarServidor>, corpo: unknown) {
	return app.request("/api/livros", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(corpo),
	});
}

describe("rotas do catálogo", () => {
	test("POST /api/livros responde 201 com o livro cadastrado", async () => {
		const { app } = servidor();
		const resposta = await postarLivro(app, {
			titulo: " Dom Casmurro ",
			autor: "Machado de Assis",
			ano: "1899",
		});
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toEqual({
			id: expect.any(String),
			titulo: "Dom Casmurro",
			autor: "Machado de Assis",
			ano: 1899,
		});
	});

	test("POST /api/livros responde 400 com a recusa", async () => {
		const { app } = servidor();
		const resposta = await postarLivro(app, {
			titulo: "Iracema",
			autor: "",
			ano: "",
		});
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ recusa: "AutorInvalido" });
	});

	test("POST /api/livros lê um corpo que não é JSON como pedido vazio e recusa pelo título", async () => {
		const { app } = servidor();
		const resposta = await app.request("/api/livros", {
			method: "POST",
			body: "isto não é JSON",
		});
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ recusa: "TituloInvalido" });
	});

	test("POST /api/livros lê um ano que não é string como sem ano", async () => {
		const { app } = servidor();
		const resposta = await postarLivro(app, {
			titulo: "Iracema",
			autor: "José de Alencar",
			ano: 1865,
		});
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toMatchObject({ ano: null });
	});

	test("POST /api/livros/:livroId/exemplares responde 201 com o exemplar", async () => {
		const { app } = servidor();
		const livro = await (
			await postarLivro(app, {
				titulo: "Iracema",
				autor: "José de Alencar",
				ano: "",
			})
		).json();
		const resposta = await app.request(`/api/livros/${livro.id}/exemplares`, {
			method: "POST",
		});
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toEqual({
			id: expect.any(String),
			livroId: livro.id,
		});
	});

	test("POST /api/livros/:livroId/exemplares responde 404 para um livro inexistente", async () => {
		const { app } = servidor();
		const resposta = await app.request("/api/livros/999/exemplares", {
			method: "POST",
		});
		expect(resposta.status).toBe(404);
		expect(await resposta.json()).toEqual({ recusa: "NaoEncontrado" });
	});

	test("GET /api/livros responde 200 com a lista e o total de exemplares", async () => {
		const { app } = servidor();
		const antigo = await (
			await postarLivro(app, {
				titulo: "Dom Casmurro",
				autor: "Machado de Assis",
				ano: "1899",
			})
		).json();
		const recente = await (
			await postarLivro(app, {
				titulo: "Iracema",
				autor: "José de Alencar",
				ano: "",
			})
		).json();
		await app.request(`/api/livros/${antigo.id}/exemplares`, {
			method: "POST",
		});
		await app.request(`/api/livros/${antigo.id}/exemplares`, {
			method: "POST",
		});

		const resposta = await app.request("/api/livros");
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual([
			{ ...recente, totalDeExemplares: 0 },
			{ ...antigo, totalDeExemplares: 2 },
		]);
	});

	test("uma falha do banco responde 500 sem a mensagem do SQLite, escrita no log", async () => {
		const erros = vi.spyOn(console, "error").mockImplementation(() => {});
		const { db, app } = servidor();
		db.close();
		const resposta = await app.request("/api/livros");
		expect(resposta.status).toBe(500);
		expect(await resposta.json()).toEqual({ falha: "BancoDeDadosFalhou" });
		expect(erros).toHaveBeenCalledWith(expect.stringMatching(/not open/));
		erros.mockRestore();
	});
});
