import { describe, expect, test } from "vitest";
import { err, ok } from "../../../lib/result.ts";
import type { Emprestimo } from "../regras.ts";
import {
	devolucaoPedida,
	type RepositoriosDeDevolucao,
} from "./eventosDeDevolucao.ts";

function naoEsperado(): never {
	throw new Error("não chamado neste teste");
}

function falsos(
	repositorios: Partial<RepositoriosDeDevolucao>,
): RepositoriosDeDevolucao {
	const nenhum = {
		buscarEmprestimo: naoEsperado,
		registrarDevolucao: naoEsperado,
	};
	return { ...nenhum, ...repositorios };
}

const FALHA = {
	codigo: "BancoDeDadosFalhou",
	mensagem: "disk I/O error",
} as const;

const ABERTO: Emprestimo = {
	exemplarId: "e1",
	membroId: "m1",
	emprestadoEm: "2026-10-01",
	devolverEm: "2026-10-22",
	devolvidoEm: null,
};

const PEDIDO = { exemplarId: "e1", membroId: "m1" };

describe("devolucaoPedida", () => {
	test("devolucaoPedida busca, grava e publica Devolvido com a data de hoje", () => {
		const buscados: [string, string][] = [];
		const gravados: Emprestimo[] = [];
		const repositorios = falsos({
			buscarEmprestimo: (exemplarId, membroId) => {
				buscados.push([exemplarId, membroId]);
				return ok(ABERTO);
			},
			registrarDevolucao: (emprestimo) => {
				gravados.push(emprestimo);
				return ok(emprestimo);
			},
		});
		const estado = devolucaoPedida(PEDIDO, "2026-10-30", repositorios);
		const devolvido = { ...ABERTO, devolvidoEm: "2026-10-30" };
		expect(buscados).toEqual([["e1", "m1"]]);
		expect(gravados).toEqual([devolvido]);
		expect(estado).toEqual({ tipo: "Devolvido", emprestimo: devolvido });
	});

	test("devolucaoPedida de um empréstimo já devolvido publica Recusado com JaDevolvido sem gravar", () => {
		const repositorios = falsos({
			buscarEmprestimo: () => ok({ ...ABERTO, devolvidoEm: "2026-10-15" }),
		});
		const estado = devolucaoPedida(PEDIDO, "2026-10-30", repositorios);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "JaDevolvido" });
	});

	test("devolucaoPedida de um par sem empréstimo publica Recusado com NaoEncontrado sem gravar", () => {
		const repositorios = falsos({
			buscarEmprestimo: () => err("NaoEncontrado"),
		});
		const estado = devolucaoPedida(PEDIDO, "2026-10-30", repositorios);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "NaoEncontrado" });
	});

	test("devolucaoPedida publica Recusado com JaDevolvido quando outro pedido gravou antes", () => {
		const repositorios = falsos({
			buscarEmprestimo: () => ok(ABERTO),
			registrarDevolucao: () => err("JaDevolvido"),
		});
		const estado = devolucaoPedida(PEDIDO, "2026-10-30", repositorios);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "JaDevolvido" });
	});

	test("devolucaoPedida publica Falhou quando o banco falha", () => {
		const naBusca = devolucaoPedida(
			PEDIDO,
			"2026-10-30",
			falsos({ buscarEmprestimo: () => err(FALHA) }),
		);
		expect(naBusca).toEqual({ tipo: "Falhou", excecao: FALHA });
		const naGravacao = devolucaoPedida(
			PEDIDO,
			"2026-10-30",
			falsos({
				buscarEmprestimo: () => ok(ABERTO),
				registrarDevolucao: () => err(FALHA),
			}),
		);
		expect(naGravacao).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});
