import { describe, expect, test } from "vitest";
import { err, ok } from "../../lib/result.ts";
import {
	cadastroDeExemplarPedido,
	cadastroDeLivroPedido,
} from "./eventosDeCatalogo.ts";
import type { DadosDoLivro } from "./regras.ts";
import type { RepositoriosDoCatalogo } from "./repositorio.server.ts";

function naoEsperado(): never {
	throw new Error("não chamado neste teste");
}

function falsos(
	repositorios: Partial<RepositoriosDoCatalogo>,
): RepositoriosDoCatalogo {
	const nenhum = {
		inserirLivro: naoEsperado,
		buscarLivro: naoEsperado,
		inserirExemplar: naoEsperado,
	};
	return { ...nenhum, ...repositorios };
}

const FALHA = {
	codigo: "BancoDeDadosFalhou",
	mensagem: "disk I/O error",
} as const;

describe("cadastroDeLivroPedido", () => {
	test("cadastroDeLivroPedido recusa um título vazio e não salva nada", () => {
		const estado = cadastroDeLivroPedido(
			{ titulo: " ", autor: "Machado de Assis", ano: "" },
			falsos({}),
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "TituloInvalido" });
	});

	test("cadastroDeLivroPedido salva os dados aparados e publica Cadastrado", () => {
		const salvos: DadosDoLivro[] = [];
		const estado = cadastroDeLivroPedido(
			{ titulo: " Dom Casmurro ", autor: " Machado de Assis ", ano: " 1899 " },
			falsos({
				inserirLivro: (dados) => {
					salvos.push(dados);
					return ok({ id: "7", ...dados });
				},
			}),
		);
		expect(salvos).toEqual([
			{ titulo: "Dom Casmurro", autor: "Machado de Assis", ano: 1899 },
		]);
		expect(estado).toEqual({
			tipo: "Cadastrado",
			livro: {
				id: "7",
				titulo: "Dom Casmurro",
				autor: "Machado de Assis",
				ano: 1899,
			},
		});
	});

	test("cadastroDeLivroPedido publica Falhou quando o banco falha", () => {
		const estado = cadastroDeLivroPedido(
			{ titulo: "Iracema", autor: "José de Alencar", ano: "" },
			falsos({ inserirLivro: () => err(FALHA) }),
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});

describe("cadastroDeExemplarPedido", () => {
	test("cadastroDeExemplarPedido recusa um livro inexistente com NaoEncontrado e não salva nada", () => {
		const estado = cadastroDeExemplarPedido(
			{ livroId: "999" },
			falsos({ buscarLivro: () => err("NaoEncontrado") }),
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "NaoEncontrado" });
	});

	test("cadastroDeExemplarPedido salva um exemplar do livro e publica Cadastrado", () => {
		const estado = cadastroDeExemplarPedido(
			{ livroId: "7" },
			falsos({
				buscarLivro: (id) =>
					ok({ id, titulo: "Iracema", autor: "José de Alencar", ano: null }),
				inserirExemplar: (livroId) => ok({ id: "3", livroId }),
			}),
		);
		expect(estado).toEqual({
			tipo: "Cadastrado",
			exemplar: { id: "3", livroId: "7" },
		});
	});

	test("cadastroDeExemplarPedido publica Falhou quando o banco falha na busca", () => {
		const estado = cadastroDeExemplarPedido(
			{ livroId: "7" },
			falsos({ buscarLivro: () => err(FALHA) }),
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});
