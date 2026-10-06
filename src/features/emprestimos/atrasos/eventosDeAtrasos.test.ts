import { describe, expect, test } from "vitest";
import { err, ok } from "../../../lib/result.ts";
import type { EmprestimoAberto } from "../regras.ts";
import {
	listaDeAtrasosPedida,
	type RepositoriosDeAtrasos,
} from "./eventosDeAtrasos.ts";

function naoEsperado(): never {
	throw new Error("não chamado neste teste");
}

function falsos(
	repositorios: Partial<RepositoriosDeAtrasos>,
): RepositoriosDeAtrasos {
	const nenhum = { listarEmprestimosAtrasados: naoEsperado };
	return { ...nenhum, ...repositorios };
}

const FALHA = {
	codigo: "BancoDeDadosFalhou",
	mensagem: "disk I/O error",
} as const;

const SERTOES: EmprestimoAberto = {
	exemplarId: "26",
	titulo: "Os Sertões",
	membroId: "21",
	nome: "Sofia Campos Ramos",
	devolverEm: "2026-08-24",
};

const DOM_CASMURRO: EmprestimoAberto = {
	exemplarId: "1",
	titulo: "Dom Casmurro",
	membroId: "3",
	nome: "Carla Mendes Rocha",
	devolverEm: "2026-09-13",
};

describe("listaDeAtrasosPedida", () => {
	test("listaDeAtrasosPedida pede os atrasados de hoje e publica Listado com os dias contados, na ordem do repositório", () => {
		const pedidos: string[] = [];
		const repositorios = falsos({
			listarEmprestimosAtrasados: (hoje) => {
				pedidos.push(hoje);
				return ok([SERTOES, DOM_CASMURRO]);
			},
		});
		const estado = listaDeAtrasosPedida("2026-10-02", repositorios);
		expect(pedidos).toEqual(["2026-10-02"]);
		expect(estado).toEqual({
			tipo: "Listado",
			atrasados: [
				{ ...SERTOES, diasDeAtraso: 39 },
				{ ...DOM_CASMURRO, diasDeAtraso: 19 },
			],
		});
	});

	test("listaDeAtrasosPedida sem nenhum atrasado publica Listado vazio", () => {
		const estado = listaDeAtrasosPedida(
			"2026-10-02",
			falsos({ listarEmprestimosAtrasados: () => ok([]) }),
		);
		expect(estado).toEqual({ tipo: "Listado", atrasados: [] });
	});

	test("listaDeAtrasosPedida publica Falhou quando o banco falha", () => {
		const estado = listaDeAtrasosPedida(
			"2026-10-02",
			falsos({ listarEmprestimosAtrasados: () => err(FALHA) }),
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});
