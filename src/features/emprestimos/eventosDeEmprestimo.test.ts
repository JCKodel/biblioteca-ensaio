import { describe, expect, test } from "vitest";
import { err, ok } from "../../lib/result.ts";
import {
	emprestimoPedido,
	type RepositoriosDeEmprestimo,
} from "./eventosDeEmprestimo.ts";
import type { Emprestimo } from "./regras.ts";

function naoEsperado(): never {
	throw new Error("não chamado neste teste");
}

function falsos(
	repositorios: Partial<RepositoriosDeEmprestimo>,
): RepositoriosDeEmprestimo {
	const nenhum = {
		buscarMembro: naoEsperado,
		buscarExemplar: naoEsperado,
		inserirEmprestimo: naoEsperado,
	};
	return { ...nenhum, ...repositorios };
}

const FALHA = {
	codigo: "BancoDeDadosFalhou",
	mensagem: "disk I/O error",
} as const;

describe("emprestimoPedido", () => {
	test("emprestimoPedido recusa um membro com um livro atrasado e não salva nada", () => {
		const repositorios = falsos({
			buscarMembro: () => ok({ id: "m1", emAtraso: 1, suspenso: false }),
			buscarExemplar: () => ok({ id: "e1", livroId: "l1" }),
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m1" },
			"2026-10-01",
			repositorios,
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "TemLivrosEmAtraso" });
	});

	test("emprestimoPedido recusa um membro suspenso e não salva nada", () => {
		const repositorios = falsos({
			buscarMembro: () => ok({ id: "m1", emAtraso: 0, suspenso: true }),
			buscarExemplar: () => ok({ id: "e1", livroId: "l1" }),
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m1" },
			"2026-10-01",
			repositorios,
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "MembroSuspenso" });
	});

	test("emprestimoPedido de um membro inexistente publica Recusado com NaoEncontrado sem buscar o exemplar", () => {
		const repositorios = falsos({
			buscarMembro: () => err("NaoEncontrado"),
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m999" },
			"2026-10-01",
			repositorios,
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "NaoEncontrado" });
	});

	test("emprestimoPedido salva um pedido válido e publica Emprestado com a devolução 21 dias depois", () => {
		const salvos: Emprestimo[] = [];
		const repositorios = falsos({
			buscarMembro: () => ok({ id: "m1", emAtraso: 0, suspenso: false }),
			buscarExemplar: () => ok({ id: "e1", livroId: "l1" }),
			inserirEmprestimo: (emprestimo) => {
				salvos.push(emprestimo);
				return ok(emprestimo);
			},
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m1" },
			"2026-10-01",
			repositorios,
		);
		const esperado = {
			exemplarId: "e1",
			membroId: "m1",
			emprestadoEm: "2026-10-01",
			devolverEm: "2026-10-22",
			devolvidoEm: null,
		};
		expect(salvos).toEqual([esperado]);
		expect(estado).toEqual({ tipo: "Emprestado", emprestimo: esperado });
	});

	test("emprestimoPedido publica Recusado com JaEmprestado quando o banco já tem o exemplar emprestado", () => {
		const repositorios = falsos({
			buscarMembro: () => ok({ id: "m1", emAtraso: 0, suspenso: false }),
			buscarExemplar: () => ok({ id: "e1", livroId: "l1" }),
			inserirEmprestimo: () => err("JaEmprestado"),
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m1" },
			"2026-10-01",
			repositorios,
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "JaEmprestado" });
	});

	test("emprestimoPedido publica Falhou quando o banco falha", () => {
		const repositorios = falsos({
			buscarMembro: () => err(FALHA),
		});
		const estado = emprestimoPedido(
			{ exemplarId: "e1", membroId: "m1" },
			"2026-10-01",
			repositorios,
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});
