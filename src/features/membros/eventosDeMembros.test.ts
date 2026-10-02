import { describe, expect, test } from "vitest";
import { err, ok } from "../../lib/result.ts";
import { cadastroDeMembroPedido, suspensaoPedida } from "./eventosDeMembros.ts";
import type { DadosDoMembro } from "./regras.ts";
import type { RepositoriosDeMembros } from "./repositorio.server.ts";

function naoEsperado(): never {
	throw new Error("não chamado neste teste");
}

function falsos(
	repositorios: Partial<RepositoriosDeMembros>,
): RepositoriosDeMembros {
	const nenhum = {
		inserirMembro: naoEsperado,
		definirSuspenso: naoEsperado,
	};
	return { ...nenhum, ...repositorios };
}

const FALHA = {
	codigo: "BancoDeDadosFalhou",
	mensagem: "disk I/O error",
} as const;

describe("cadastroDeMembroPedido", () => {
	test("cadastroDeMembroPedido recusa um nome em branco e não salva nada", () => {
		const estado = cadastroDeMembroPedido({ nome: "  " }, falsos({}));
		expect(estado).toEqual({ tipo: "Recusado", recusa: "NomeInvalido" });
	});

	test("cadastroDeMembroPedido salva o nome aparado e publica Cadastrado", () => {
		const salvos: DadosDoMembro[] = [];
		const estado = cadastroDeMembroPedido(
			{ nome: " Capitu " },
			falsos({
				inserirMembro: (dados) => {
					salvos.push(dados);
					return ok({ id: "7", ...dados, suspenso: false });
				},
			}),
		);
		expect(salvos).toEqual([{ nome: "Capitu" }]);
		expect(estado).toEqual({
			tipo: "Cadastrado",
			membro: { id: "7", nome: "Capitu", suspenso: false },
		});
	});

	test("cadastroDeMembroPedido publica Falhou quando o banco falha", () => {
		const estado = cadastroDeMembroPedido(
			{ nome: "Capitu" },
			falsos({ inserirMembro: () => err(FALHA) }),
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});

describe("suspensaoPedida", () => {
	test("suspensaoPedida de um membro inexistente publica Recusado com NaoEncontrado", () => {
		const estado = suspensaoPedida(
			{ membroId: "999", suspenso: true },
			falsos({ definirSuspenso: () => err("NaoEncontrado") }),
		);
		expect(estado).toEqual({ tipo: "Recusado", recusa: "NaoEncontrado" });
	});

	test("suspensaoPedida grava a situação pedida e publica Alterado", () => {
		const gravados: [string, boolean][] = [];
		const estado = suspensaoPedida(
			{ membroId: "7", suspenso: true },
			falsos({
				definirSuspenso: (id, suspenso) => {
					gravados.push([id, suspenso]);
					return ok({ id, nome: "Capitu", suspenso });
				},
			}),
		);
		expect(gravados).toEqual([["7", true]]);
		expect(estado).toEqual({
			tipo: "Alterado",
			membro: { id: "7", nome: "Capitu", suspenso: true },
		});
	});

	test("suspensaoPedida publica Falhou quando o banco falha", () => {
		const estado = suspensaoPedida(
			{ membroId: "7", suspenso: false },
			falsos({ definirSuspenso: () => err(FALHA) }),
		);
		expect(estado).toEqual({ tipo: "Falhou", excecao: FALHA });
	});
});
