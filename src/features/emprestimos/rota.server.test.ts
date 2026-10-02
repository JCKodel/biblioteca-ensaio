import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../banco.server.ts";
import { criarServidor } from "../../servidor.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const MIGRACOES = fileURLToPath(new URL("../../../migracoes", import.meta.url));

type App = ReturnType<typeof criarServidor>;

function servidor(opcoes?: { relogioDeTeste: boolean }) {
	const db = new DatabaseSync(":memory:");
	aplicarMigracoes(db, lerMigracoes(MIGRACOES));
	return { db, app: criarServidor(db, opcoes) };
}

function dataLocal(): string {
	const agora = new Date();
	const mes = String(agora.getMonth() + 1).padStart(2, "0");
	const dia = String(agora.getDate()).padStart(2, "0");
	return `${agora.getFullYear()}-${mes}-${dia}`;
}

function postar(app: App, caminho: string, corpo?: unknown) {
	return app.request(caminho, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: corpo === undefined ? null : JSON.stringify(corpo),
	});
}

/** Um livro com um exemplar, pelas rotas do catálogo. */
async function exemplarNovo(app: App, titulo: string): Promise<string> {
	const livro = await (
		await postar(app, "/api/livros", { titulo, autor: "Machado", ano: "" })
	).json();
	const exemplar = await (
		await postar(app, `/api/livros/${livro.id}/exemplares`)
	).json();
	return exemplar.id;
}

async function membroNovo(app: App, nome: string): Promise<string> {
	return (await (await postar(app, "/api/membros", { nome })).json()).id;
}

function emprestar(app: App, pedido: unknown, xHoje?: string) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (xHoje) headers["x-hoje"] = xHoje;
	return app.request("/api/emprestimos", {
		method: "POST",
		headers,
		body: JSON.stringify(pedido),
	});
}

async function abertos(app: App) {
	return (await app.request("/api/emprestimos")).json();
}

describe("rotas do empréstimo, com o relógio de teste", () => {
	test("POST /api/emprestimos responde 201 com a devolução 21 dias depois de x-hoje", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		const resposta = await emprestar(
			app,
			{ exemplarId, membroId },
			"2026-10-01",
		);
		expect(resposta.status).toBe(201);
		expect(await resposta.json()).toEqual({
			exemplarId,
			membroId,
			emprestadoEm: "2026-10-01",
			devolverEm: "2026-10-22",
			devolvidoEm: null,
		});
	});

	test("POST /api/emprestimos responde 409 TemLivrosEmAtraso depois da devolução, sem gravar nada", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const primeiro = await exemplarNovo(app, "Dom Casmurro");
		const segundo = await exemplarNovo(app, "Quincas Borba");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId: primeiro, membroId }, "2026-10-01");
		const resposta = await emprestar(
			app,
			{ exemplarId: segundo, membroId },
			"2026-10-30",
		);
		expect(resposta.status).toBe(409);
		expect(await resposta.json()).toEqual({ recusa: "TemLivrosEmAtraso" });
		expect(await abertos(app)).toHaveLength(1);
	});

	test("no dia da devolução o membro ainda não está atrasado", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const primeiro = await exemplarNovo(app, "Dom Casmurro");
		const segundo = await exemplarNovo(app, "Quincas Borba");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId: primeiro, membroId }, "2026-10-01");
		const resposta = await emprestar(
			app,
			{ exemplarId: segundo, membroId },
			"2026-10-22",
		);
		expect(resposta.status).toBe(201);
	});

	test("POST /api/emprestimos responde 400 HojeInvalido a um x-hoje que não é uma data, sem gravar nada", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		for (const xHoje of ["2026-02-30", "ontem"]) {
			const resposta = await emprestar(app, { exemplarId, membroId }, xHoje);
			expect(resposta.status).toBe(400);
			expect(await resposta.json()).toEqual({ falha: "HojeInvalido" });
		}
		expect(await abertos(app)).toEqual([]);
	});

	test("POST /api/emprestimos sem x-hoje usa a data local, também com o relógio de teste", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		const resposta = await emprestar(app, { exemplarId, membroId });
		expect(resposta.status).toBe(201);
		expect((await resposta.json()).emprestadoEm).toBe(dataLocal());
	});

	test("GET /api/emprestimos/membros conta o atraso pelo x-hoje e responde 400 a um x-hoje inválido", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId, membroId }, "2026-10-01");
		const membros = (dia: string) =>
			app.request("/api/emprestimos/membros", { headers: { "x-hoje": dia } });
		expect(await (await membros("2026-10-22")).json()).toEqual([
			{ id: membroId, nome: "Capitu", emAtraso: 0, suspenso: false },
		]);
		expect(await (await membros("2026-10-23")).json()).toEqual([
			{ id: membroId, nome: "Capitu", emAtraso: 1, suspenso: false },
		]);
		const invalido = await membros("2026-13-01");
		expect(invalido.status).toBe(400);
		expect(await invalido.json()).toEqual({ falha: "HojeInvalido" });
	});
});

describe("rotas do empréstimo, sem o relógio de teste", () => {
	test("sem RELOGIO_DE_TESTE, x-hoje é ignorado", async () => {
		const { app } = servidor();
		const primeiro = await exemplarNovo(app, "Dom Casmurro");
		const segundo = await exemplarNovo(app, "Quincas Borba");
		const membroId = await membroNovo(app, "Capitu");
		const valido = await emprestar(
			app,
			{ exemplarId: primeiro, membroId },
			"2000-01-01",
		);
		expect(valido.status).toBe(201);
		expect((await valido.json()).emprestadoEm).toBe(dataLocal());
		const invalido = await emprestar(
			app,
			{ exemplarId: segundo, membroId },
			"ontem",
		);
		expect(invalido.status).toBe(201);
		expect((await invalido.json()).emprestadoEm).toBe(dataLocal());
	});

	test("POST /api/emprestimos responde 409 MembroSuspenso depois da suspensão", async () => {
		const { app } = servidor();
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		await postar(app, `/api/membros/${membroId}/suspensao`);
		const resposta = await emprestar(app, { exemplarId, membroId });
		expect(resposta.status).toBe(409);
		expect(await resposta.json()).toEqual({ recusa: "MembroSuspenso" });
		expect(await abertos(app)).toEqual([]);
	});

	test("POST /api/emprestimos responde 409 JaEmprestado no segundo pedido do mesmo exemplar", async () => {
		const { app } = servidor();
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const capitu = await membroNovo(app, "Capitu");
		const bentinho = await membroNovo(app, "Bentinho");
		await emprestar(app, { exemplarId, membroId: capitu });
		const resposta = await emprestar(app, { exemplarId, membroId: bentinho });
		expect(resposta.status).toBe(409);
		expect(await resposta.json()).toEqual({ recusa: "JaEmprestado" });
		expect(await abertos(app)).toHaveLength(1);
	});

	test("POST /api/emprestimos responde 404 NaoEncontrado a ids inexistentes, campos que não são string e um corpo que não é JSON", async () => {
		const { app } = servidor();
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		const respostas = [
			await emprestar(app, { exemplarId, membroId: "999" }),
			await emprestar(app, { exemplarId: "999", membroId }),
			await emprestar(app, { exemplarId: 1, membroId: 1 }),
			await app.request("/api/emprestimos", {
				method: "POST",
				body: "isto não é JSON",
			}),
		];
		for (const resposta of respostas) {
			expect(resposta.status).toBe(404);
			expect(await resposta.json()).toEqual({ recusa: "NaoEncontrado" });
		}
		expect(await abertos(app)).toEqual([]);
	});

	test("os três GET listam os abertos, os exemplares disponíveis e os membros", async () => {
		const { app } = servidor();
		const emprestado = await exemplarNovo(app, "Dom Casmurro");
		const livre = await exemplarNovo(app, "Quincas Borba");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId: emprestado, membroId });

		const lista = await app.request("/api/emprestimos");
		expect(lista.status).toBe(200);
		expect(await lista.json()).toEqual([
			{
				exemplarId: emprestado,
				titulo: "Dom Casmurro",
				membroId,
				nome: "Capitu",
				devolverEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			},
		]);

		const exemplares = await app.request("/api/emprestimos/exemplares");
		expect(exemplares.status).toBe(200);
		expect(await exemplares.json()).toEqual([
			{ id: livre, livroId: expect.any(String), titulo: "Quincas Borba" },
		]);

		const membros = await app.request("/api/emprestimos/membros");
		expect(membros.status).toBe(200);
		expect(await membros.json()).toEqual([
			{ id: membroId, nome: "Capitu", emAtraso: 0, suspenso: false },
		]);
	});

	test("com o banco fechado, as rotas respondem 500 e escrevem a mensagem no terminal", async () => {
		const { db, app } = servidor();
		const erros = vi.spyOn(console, "error").mockImplementation(() => {});
		db.close();
		for (const [caminho, metodo] of [
			["/api/emprestimos", "GET"],
			["/api/emprestimos/exemplares", "GET"],
			["/api/emprestimos/membros", "GET"],
			["/api/emprestimos", "POST"],
		] as const) {
			const resposta = await app.request(caminho, {
				method: metodo,
				body:
					metodo === "POST"
						? JSON.stringify({ exemplarId: "1", membroId: "1" })
						: null,
			});
			expect(resposta.status).toBe(500);
			expect(await resposta.json()).toEqual({ falha: "BancoDeDadosFalhou" });
		}
		expect(erros).toHaveBeenCalledWith(expect.stringMatching(/not open/));
		erros.mockRestore();
	});
});

function devolver(app: App, pedido: unknown, xHoje?: string) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (xHoje) headers["x-hoje"] = xHoje;
	return app.request("/api/emprestimos/devolucao", {
		method: "POST",
		headers,
		body: JSON.stringify(pedido),
	});
}

async function disponiveis(app: App) {
	return (await app.request("/api/emprestimos/exemplares")).json();
}

describe("rota da devolução, com o relógio de teste", () => {
	test("POST /api/emprestimos/devolucao responde 200 com devolvidoEm do x-hoje, libera o exemplar e o membro volta a pegar", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const outro = await exemplarNovo(app, "Quincas Borba");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId, membroId }, "2026-10-01");

		const resposta = await devolver(
			app,
			{ exemplarId, membroId },
			"2026-10-30",
		);
		expect(resposta.status).toBe(200);
		expect(await resposta.json()).toEqual({
			exemplarId,
			membroId,
			emprestadoEm: "2026-10-01",
			devolverEm: "2026-10-22",
			devolvidoEm: "2026-10-30",
		});
		expect(await abertos(app)).toEqual([]);
		expect(
			(await disponiveis(app)).map((e: { id: string }) => e.id).sort(),
		).toEqual([exemplarId, outro].sort());

		const novo = await emprestar(
			app,
			{ exemplarId: outro, membroId },
			"2026-10-30",
		);
		expect(novo.status).toBe(201);
	});

	test("um membro com dois livros atrasados que devolve um continua recusado", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const primeiro = await exemplarNovo(app, "Dom Casmurro");
		const segundo = await exemplarNovo(app, "Quincas Borba");
		const terceiro = await exemplarNovo(app, "Esaú e Jacó");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId: primeiro, membroId }, "2026-10-01");
		await emprestar(app, { exemplarId: segundo, membroId }, "2026-10-01");
		const devolucao = await devolver(
			app,
			{ exemplarId: primeiro, membroId },
			"2026-10-30",
		);
		expect(devolucao.status).toBe(200);
		const resposta = await emprestar(
			app,
			{ exemplarId: terceiro, membroId },
			"2026-10-30",
		);
		expect(resposta.status).toBe(409);
		expect(await resposta.json()).toEqual({ recusa: "TemLivrosEmAtraso" });
	});

	test("um membro suspenso devolve com 200", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Escobar");
		await emprestar(app, { exemplarId, membroId }, "2026-10-01");
		await postar(app, `/api/membros/${membroId}/suspensao`);
		const resposta = await devolver(
			app,
			{ exemplarId, membroId },
			"2026-10-05",
		);
		expect(resposta.status).toBe(200);
		expect((await resposta.json()).devolvidoEm).toBe("2026-10-05");
	});

	test("a segunda devolução do mesmo empréstimo responde 409 JaDevolvido", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId, membroId }, "2026-10-01");
		await devolver(app, { exemplarId, membroId }, "2026-10-10");
		const resposta = await devolver(
			app,
			{ exemplarId, membroId },
			"2026-10-11",
		);
		expect(resposta.status).toBe(409);
		expect(await resposta.json()).toEqual({ recusa: "JaDevolvido" });
	});

	test("POST /api/emprestimos/devolucao responde 400 HojeInvalido sem gravar nada", async () => {
		const { app } = servidor({ relogioDeTeste: true });
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId, membroId }, "2026-10-01");
		const resposta = await devolver(
			app,
			{ exemplarId, membroId },
			"2026-02-30",
		);
		expect(resposta.status).toBe(400);
		expect(await resposta.json()).toEqual({ falha: "HojeInvalido" });
		expect(await abertos(app)).toHaveLength(1);
	});
});

describe("rota da devolução, sem o relógio de teste", () => {
	test("POST /api/emprestimos/devolucao registra a data local", async () => {
		const { app } = servidor();
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const membroId = await membroNovo(app, "Capitu");
		await emprestar(app, { exemplarId, membroId });
		const resposta = await devolver(
			app,
			{ exemplarId, membroId },
			"2000-01-01",
		);
		expect(resposta.status).toBe(200);
		expect((await resposta.json()).devolvidoEm).toBe(dataLocal());
	});

	test("POST /api/emprestimos/devolucao responde 404 NaoEncontrado a um par sem empréstimo e a um corpo que não é JSON", async () => {
		const { app } = servidor();
		const exemplarId = await exemplarNovo(app, "Dom Casmurro");
		const capitu = await membroNovo(app, "Capitu");
		const bentinho = await membroNovo(app, "Bentinho");
		await emprestar(app, { exemplarId, membroId: capitu });
		const respostas = [
			await devolver(app, { exemplarId, membroId: bentinho }),
			await devolver(app, { exemplarId: "999", membroId: capitu }),
			await app.request("/api/emprestimos/devolucao", {
				method: "POST",
				body: "isto não é JSON",
			}),
		];
		for (const resposta of respostas) {
			expect(resposta.status).toBe(404);
			expect(await resposta.json()).toEqual({ recusa: "NaoEncontrado" });
		}
		expect(await abertos(app)).toHaveLength(1);
	});

	test("com o banco fechado, POST /api/emprestimos/devolucao responde 500 e escreve a mensagem no terminal", async () => {
		const { db, app } = servidor();
		const erros = vi.spyOn(console, "error").mockImplementation(() => {});
		db.close();
		const resposta = await devolver(app, { exemplarId: "1", membroId: "1" });
		expect(resposta.status).toBe(500);
		expect(await resposta.json()).toEqual({ falha: "BancoDeDadosFalhou" });
		expect(erros).toHaveBeenCalledWith(expect.stringMatching(/not open/));
		erros.mockRestore();
	});
});
