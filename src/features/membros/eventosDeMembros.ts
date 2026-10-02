import type { BancoDeDadosFalhou } from "../../lib/consultar.server.ts";
import { estadoDe } from "../../lib/estadoDe.ts";
import {
	type CadastroDeMembroPedido,
	cadastrar,
	type MembroDoCadastro,
	type RecusaDeMembro,
	type SuspensaoPedida,
} from "./regras.ts";
import type { RepositoriosDeMembros } from "./repositorio.server.ts";

export type EstadoDoCadastroDeMembro =
	| { tipo: "Cadastrado"; membro: MembroDoCadastro }
	| { tipo: "Recusado"; recusa: RecusaDeMembro }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type EstadoDaSuspensao =
	| { tipo: "Alterado"; membro: MembroDoCadastro }
	| { tipo: "Recusado"; recusa: "NaoEncontrado" }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export function cadastroDeMembroPedido(
	evento: CadastroDeMembroPedido,
	repositorios: RepositoriosDeMembros,
): EstadoDoCadastroDeMembro {
	const dados = cadastrar(evento);
	if (!dados.ok) return { tipo: "Recusado", recusa: dados.error };
	const salvo = repositorios.inserirMembro(dados.value);
	if (!salvo.ok) return { tipo: "Falhou", excecao: salvo.error };
	return { tipo: "Cadastrado", membro: salvo.value };
}

export function suspensaoPedida(
	evento: SuspensaoPedida,
	repositorios: RepositoriosDeMembros,
): EstadoDaSuspensao {
	const salvo = repositorios.definirSuspenso(evento.membroId, evento.suspenso);
	if (!salvo.ok) return estadoDe(salvo.error);
	return { tipo: "Alterado", membro: salvo.value };
}
