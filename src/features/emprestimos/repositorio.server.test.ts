import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../banco.server.ts";
import {
	inserirExemplar,
	inserirLivro,
} from "../catalogo/repositorio.server.ts";
import {
	definirSuspenso,
	inserirMembro,
} from "../membros/repositorio.server.ts";
import type { Emprestimo } from "./regras.ts";
import {
	buscarEmprestimo,
	buscarExemplar,
	buscarMembro,
	inserirEmprestimo,
	listarEmprestimosAbertos,
	listarEmprestimosAtrasados,
	listarExemplaresDisponiveis,
	listarMembrosDoEmprestimo,
	registrarDevolucao,
} from "./repositorio.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const MIGRACOES = fileURLToPath(new URL("../../../migracoes", import.meta.url));

function bancoNovo(): DatabaseSync {
	const db = new DatabaseSync(":memory:");
	aplicarMigracoes(db, lerMigracoes(MIGRACOES));
	return db;
}

function valor<T>(
	resultado: { ok: true; value: T } | { ok: false; error: unknown },
): T {
	if (!resultado.ok) throw new Error(JSON.stringify(resultado.error));
	return resultado.value;
}

function livroComExemplar(db: DatabaseSync, titulo: string) {
	const livro = valor(
		inserirLivro(db, { titulo, autor: "Machado de Assis", ano: null }),
	);
	return valor(inserirExemplar(db, livro.id));
}

function membro(db: DatabaseSync, nome: string) {
	return valor(inserirMembro(db, { nome }));
}

function emprestimo(
	exemplarId: string,
	membroId: string,
	campos: Partial<Emprestimo> = {},
): Emprestimo {
	return {
		exemplarId,
		membroId,
		emprestadoEm: "2026-10-01",
		devolverEm: "2026-10-22",
		devolvidoEm: null,
		...campos,
	};
}

describe("repositório do empréstimo", () => {
	test("inserirEmprestimo grava e devolve o mesmo empréstimo", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const novo = emprestimo(exemplar.id, capitu.id);
		expect(inserirEmprestimo(db, novo)).toEqual({ ok: true, value: novo });
	});

	test("inserirEmprestimo recusa um segundo empréstimo aberto do mesmo exemplar", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const bentinho = membro(db, "Bentinho");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(inserirEmprestimo(db, emprestimo(exemplar.id, bentinho.id))).toEqual(
			{ ok: false, error: "JaEmprestado" },
		);
	});

	test("inserirEmprestimo aceita um novo empréstimo de um exemplar cujo empréstimo já foi devolvido", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-05" }),
			),
		);
		const novo = emprestimo(exemplar.id, capitu.id, {
			emprestadoEm: "2026-10-06",
			devolverEm: "2026-10-27",
		});
		expect(inserirEmprestimo(db, novo)).toEqual({ ok: true, value: novo });
	});

	test("inserirEmprestimo de um exemplar inexistente devolve BancoDeDadosFalhou, não JaEmprestado", () => {
		const db = bancoNovo();
		const capitu = membro(db, "Capitu");
		expect(inserirEmprestimo(db, emprestimo("999", capitu.id))).toEqual({
			ok: false,
			error: {
				codigo: "BancoDeDadosFalhou",
				mensagem: expect.stringMatching(/FOREIGN KEY/),
			},
		});
	});

	test("buscarMembro conta como atrasado um empréstimo aberto com a devolução antes de hoje", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, {
					emprestadoEm: "2026-01-01",
					devolverEm: "2026-01-22",
				}),
			),
		);
		expect(buscarMembro(db, capitu.id, "2026-10-01")).toEqual({
			ok: true,
			value: { id: capitu.id, emAtraso: 1, suspenso: false },
		});
	});

	test("buscarMembro não conta como atrasado no dia da devolução", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, {
					emprestadoEm: "2026-01-01",
					devolverEm: "2026-01-22",
				}),
			),
		);
		expect(buscarMembro(db, capitu.id, "2026-01-22")).toEqual({
			ok: true,
			value: { id: capitu.id, emAtraso: 0, suspenso: false },
		});
	});

	test("buscarMembro não conta um empréstimo devolvido", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, {
					emprestadoEm: "2026-01-01",
					devolverEm: "2026-01-22",
					devolvidoEm: "2026-01-30",
				}),
			),
		);
		expect(buscarMembro(db, capitu.id, "2026-10-01")).toEqual({
			ok: true,
			value: { id: capitu.id, emAtraso: 0, suspenso: false },
		});
	});

	test("buscarMembro lê suspenso como booleano", () => {
		const db = bancoNovo();
		const capitu = membro(db, "Capitu");
		valor(definirSuspenso(db, capitu.id, true));
		expect(buscarMembro(db, capitu.id, "2026-10-01")).toEqual({
			ok: true,
			value: { id: capitu.id, emAtraso: 0, suspenso: true },
		});
	});

	test("buscarMembro de um id inexistente devolve NaoEncontrado", () => {
		expect(buscarMembro(bancoNovo(), "999", "2026-10-01")).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
	});

	test("buscarExemplar devolve o exemplar com o livro", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		expect(buscarExemplar(db, exemplar.id)).toEqual({
			ok: true,
			value: exemplar,
		});
	});

	test("buscarExemplar de um id inexistente devolve NaoEncontrado", () => {
		expect(buscarExemplar(bancoNovo(), "999")).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
	});

	test("listarEmprestimosAbertos devolve os abertos com título e nome, o mais recente primeiro", () => {
		const db = bancoNovo();
		const dom = livroComExemplar(db, "Dom Casmurro");
		const memorias = livroComExemplar(db, "Memórias Póstumas");
		const quincas = livroComExemplar(db, "Quincas Borba");
		const capitu = membro(db, "Capitu");
		const bentinho = membro(db, "Bentinho");
		valor(inserirEmprestimo(db, emprestimo(dom.id, capitu.id)));
		valor(
			inserirEmprestimo(
				db,
				emprestimo(quincas.id, capitu.id, { devolvidoEm: "2026-10-02" }),
			),
		);
		valor(inserirEmprestimo(db, emprestimo(memorias.id, bentinho.id)));
		expect(listarEmprestimosAbertos(db)).toEqual({
			ok: true,
			value: [
				{
					exemplarId: memorias.id,
					titulo: "Memórias Póstumas",
					membroId: bentinho.id,
					nome: "Bentinho",
					devolverEm: "2026-10-22",
				},
				{
					exemplarId: dom.id,
					titulo: "Dom Casmurro",
					membroId: capitu.id,
					nome: "Capitu",
					devolverEm: "2026-10-22",
				},
			],
		});
	});

	test("listarExemplaresDisponiveis deixa de fora o exemplar emprestado, por título e depois id", () => {
		const db = bancoNovo();
		const quincas = livroComExemplar(db, "Quincas Borba");
		const dom = livroComExemplar(db, "dom Casmurro");
		const emprestado = livroComExemplar(db, "Esaú e Jacó");
		const segundoDom = valor(inserirExemplar(db, dom.livroId));
		const capitu = membro(db, "Capitu");
		valor(inserirEmprestimo(db, emprestimo(emprestado.id, capitu.id)));
		expect(listarExemplaresDisponiveis(db)).toEqual({
			ok: true,
			value: [
				{ ...dom, titulo: "dom Casmurro" },
				{ ...segundoDom, titulo: "dom Casmurro" },
				{ ...quincas, titulo: "Quincas Borba" },
			],
		});
	});

	test("listarMembrosDoEmprestimo devolve todos os membros por nome, com emAtraso e suspenso", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const escobar = membro(db, "Escobar");
		const capitu = membro(db, "capitu");
		const bentinho = membro(db, "Bentinho");
		valor(definirSuspenso(db, escobar.id, true));
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, {
					emprestadoEm: "2026-01-01",
					devolverEm: "2026-01-22",
				}),
			),
		);
		expect(listarMembrosDoEmprestimo(db, "2026-10-01")).toEqual({
			ok: true,
			value: [
				{ id: bentinho.id, nome: "Bentinho", emAtraso: 0, suspenso: false },
				{ id: capitu.id, nome: "capitu", emAtraso: 1, suspenso: false },
				{ id: escobar.id, nome: "Escobar", emAtraso: 0, suspenso: true },
			],
		});
	});

	test("com o banco fechado, cada função devolve BancoDeDadosFalhou em vez de lançar", () => {
		const db = bancoNovo();
		db.close();
		const falha = {
			ok: false,
			error: {
				codigo: "BancoDeDadosFalhou",
				mensagem: expect.stringMatching(/not open/),
			},
		};
		expect(buscarMembro(db, "1", "2026-10-01")).toEqual(falha);
		expect(buscarExemplar(db, "1")).toEqual(falha);
		expect(inserirEmprestimo(db, emprestimo("1", "1"))).toEqual(falha);
		expect(listarEmprestimosAbertos(db)).toEqual(falha);
		expect(listarEmprestimosAtrasados(db, "2026-10-23")).toEqual(falha);
		expect(listarExemplaresDisponiveis(db)).toEqual(falha);
		expect(listarMembrosDoEmprestimo(db, "2026-10-01")).toEqual(falha);
		expect(buscarEmprestimo(db, "1", "1")).toEqual(falha);
		expect(
			registrarDevolucao(
				db,
				emprestimo("1", "1", { devolvidoEm: "2026-10-15" }),
			),
		).toEqual(falha);
	});
});

describe("repositório da devolução", () => {
	function abertos(db: DatabaseSync) {
		return valor(listarEmprestimosAbertos(db)).map((aberto) => [
			aberto.exemplarId,
			aberto.membroId,
		]);
	}

	function disponiveis(db: DatabaseSync) {
		return valor(listarExemplaresDisponiveis(db)).map((e) => e.id);
	}

	test("buscarEmprestimo acha o empréstimo aberto do exemplar a esse membro", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const aberto = emprestimo(exemplar.id, capitu.id);
		valor(inserirEmprestimo(db, aberto));
		expect(buscarEmprestimo(db, exemplar.id, capitu.id)).toEqual({
			ok: true,
			value: aberto,
		});
	});

	test("buscarEmprestimo de um par sem empréstimo devolve NaoEncontrado", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const bentinho = membro(db, "Bentinho");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(buscarEmprestimo(db, exemplar.id, bentinho.id)).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
		expect(buscarEmprestimo(db, "999", capitu.id)).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
	});

	test("buscarEmprestimo acha o aberto quando o mesmo exemplar já foi devolvido pelo mesmo membro", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-10" }),
			),
		);
		const novo = emprestimo(exemplar.id, capitu.id, {
			emprestadoEm: "2026-10-10",
			devolverEm: "2026-10-31",
		});
		valor(inserirEmprestimo(db, novo));
		expect(buscarEmprestimo(db, exemplar.id, capitu.id)).toEqual({
			ok: true,
			value: novo,
		});
	});

	test("registrarDevolucao grava o dia da devolução e libera o exemplar", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const bentinho = membro(db, "Bentinho");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(disponiveis(db)).toEqual([]);

		const devolvido = emprestimo(exemplar.id, capitu.id, {
			devolvidoEm: "2026-10-15",
		});
		expect(registrarDevolucao(db, devolvido)).toEqual({
			ok: true,
			value: devolvido,
		});
		expect(buscarEmprestimo(db, exemplar.id, capitu.id)).toEqual({
			ok: true,
			value: devolvido,
		});
		expect(disponiveis(db)).toEqual([exemplar.id]);
		expect(abertos(db)).toEqual([]);
		const novo = emprestimo(exemplar.id, bentinho.id, {
			emprestadoEm: "2026-10-15",
			devolverEm: "2026-11-05",
		});
		expect(inserirEmprestimo(db, novo)).toEqual({ ok: true, value: novo });
	});

	test("registrarDevolucao recusa um empréstimo já devolvido", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		const primeira = emprestimo(exemplar.id, capitu.id, {
			devolvidoEm: "2026-10-15",
		});
		valor(registrarDevolucao(db, primeira));
		expect(
			registrarDevolucao(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-16" }),
			),
		).toEqual({ ok: false, error: "JaDevolvido" });
		expect(buscarEmprestimo(db, exemplar.id, capitu.id)).toEqual({
			ok: true,
			value: primeira,
		});
	});

	test("registrarDevolucao de uma tela parada não encerra o empréstimo de outro membro", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		const bentinho = membro(db, "Bentinho");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		valor(
			registrarDevolucao(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-15" }),
			),
		);
		valor(
			inserirEmprestimo(
				db,
				emprestimo(exemplar.id, bentinho.id, {
					emprestadoEm: "2026-10-15",
					devolverEm: "2026-11-05",
				}),
			),
		);
		expect(
			registrarDevolucao(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-16" }),
			),
		).toEqual({ ok: false, error: "JaDevolvido" });
		expect(abertos(db)).toEqual([[exemplar.id, bentinho.id]]);
	});

	test("buscarMembro deixa de contar o livro atrasado depois da devolução", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(valor(buscarMembro(db, capitu.id, "2026-10-30")).emAtraso).toBe(1);
		valor(
			registrarDevolucao(
				db,
				emprestimo(exemplar.id, capitu.id, { devolvidoEm: "2026-10-30" }),
			),
		);
		expect(valor(buscarMembro(db, capitu.id, "2026-10-30")).emAtraso).toBe(0);
	});
});

describe("repositório dos atrasos", () => {
	function atrasados(db: DatabaseSync, hoje: string) {
		return valor(listarEmprestimosAtrasados(db, hoje)).map(
			(atrasado) => atrasado.exemplarId,
		);
	}

	test("listarEmprestimosAtrasados traz o aberto com a devolução antes de hoje, com título, nome e ids como string", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(listarEmprestimosAtrasados(db, "2026-10-23")).toEqual({
			ok: true,
			value: [
				{
					exemplarId: exemplar.id,
					titulo: "Dom Casmurro",
					membroId: capitu.id,
					nome: "Capitu",
					devolverEm: "2026-10-22",
				},
			],
		});
	});

	test("listarEmprestimosAtrasados não traz o empréstimo que vence hoje", () => {
		const db = bancoNovo();
		const exemplar = livroComExemplar(db, "Dom Casmurro");
		const capitu = membro(db, "Capitu");
		valor(inserirEmprestimo(db, emprestimo(exemplar.id, capitu.id)));
		expect(atrasados(db, "2026-10-22")).toEqual([]);
		expect(atrasados(db, "2026-10-01")).toEqual([]);
	});

	test("listarEmprestimosAtrasados não traz os devolvidos, no prazo ou com atraso", () => {
		const db = bancoNovo();
		const noPrazo = livroComExemplar(db, "Dom Casmurro");
		const comAtraso = livroComExemplar(db, "Quincas Borba");
		const capitu = membro(db, "Capitu");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(noPrazo.id, capitu.id, { devolvidoEm: "2026-10-10" }),
			),
		);
		valor(
			inserirEmprestimo(
				db,
				emprestimo(comAtraso.id, capitu.id, { devolvidoEm: "2026-10-30" }),
			),
		);
		expect(atrasados(db, "2026-10-31")).toEqual([]);
	});

	test("listarEmprestimosAtrasados ordena pela devolução mais antiga e, na mesma data, pelo registrado antes", () => {
		const db = bancoNovo();
		const primeiro = livroComExemplar(db, "Dom Casmurro");
		const segundo = livroComExemplar(db, "O Cortiço");
		const maisAntigo = livroComExemplar(db, "Os Sertões");
		const maisNovo = livroComExemplar(db, "Vidas Secas");
		const carla = membro(db, "Carla");
		const sofia = membro(db, "Sofia");
		const lucas = membro(db, "Lucas");
		valor(
			inserirEmprestimo(
				db,
				emprestimo(maisNovo.id, lucas.id, { devolverEm: "2026-09-23" }),
			),
		);
		valor(
			inserirEmprestimo(
				db,
				emprestimo(primeiro.id, carla.id, { devolverEm: "2026-09-13" }),
			),
		);
		valor(
			inserirEmprestimo(
				db,
				emprestimo(segundo.id, carla.id, { devolverEm: "2026-09-13" }),
			),
		);
		valor(
			inserirEmprestimo(
				db,
				emprestimo(maisAntigo.id, sofia.id, { devolverEm: "2026-08-24" }),
			),
		);
		expect(atrasados(db, "2026-10-02")).toEqual([
			maisAntigo.id,
			primeiro.id,
			segundo.id,
			maisNovo.id,
		]);
	});
});
