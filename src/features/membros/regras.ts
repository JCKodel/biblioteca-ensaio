import { MENSAGEM_DE_FALHA } from "../../lib/mensagemDeFalha.ts";
import { err, ok, type Result } from "../../lib/result.ts";

/** Um membro como o cadastro o guarda e a lista o mostra (docs/03). */
export type MembroDoCadastro = { id: string; nome: string; suspenso: boolean };

/** Como a bibliotecária digitou. */
export type CadastroDeMembroPedido = { nome: string };
export type DadosDoMembro = { nome: string };
export type RecusaDeMembro = "NomeInvalido";

/** `suspenso: true` suspende; `false` reativa. */
export type SuspensaoPedida = { membroId: string; suspenso: boolean };

const MAXIMO_DE_CARACTERES_DO_NOME = 120;

/** Apara o nome e confere que ele tem de 1 a 120 caracteres. */
export function cadastrar(
	pedido: CadastroDeMembroPedido,
): Result<DadosDoMembro, RecusaDeMembro> {
	const nome = pedido.nome.trim();
	if (nome.length < 1 || nome.length > MAXIMO_DE_CARACTERES_DO_NOME) {
		return err("NomeInvalido");
	}
	return ok({ nome });
}

export function textoDaSituacao(suspenso: boolean): "Ativo" | "Suspenso" {
	return suspenso ? "Suspenso" : "Ativo";
}

/** Os textos do docs/03, literais. */
export const mensagens: Record<
	RecusaDeMembro | "NaoEncontrado" | "Falhou",
	string
> = {
	NomeInvalido: "Informe o nome, com até 120 caracteres.",
	NaoEncontrado: "Este membro não está cadastrado.",
	Falhou: MENSAGEM_DE_FALHA,
};
