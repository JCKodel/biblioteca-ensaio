import type { BancoDeDadosFalhou } from "../../../lib/consultar.server.ts";
import { estadoDe } from "../../../lib/estadoDe.ts";
import type { Result } from "../../../lib/result.ts";
import {
	devolver,
	type Emprestimo,
	type RecusaDeDevolucao,
} from "../regras.ts";

export type DevolucaoPedida = { exemplarId: string; membroId: string };

export type EstadoDaDevolucao =
	| { tipo: "Devolvido"; emprestimo: Emprestimo }
	| { tipo: "Recusado"; recusa: RecusaDeDevolucao | "NaoEncontrado" }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type RepositoriosDeDevolucao = {
	buscarEmprestimo(
		exemplarId: string,
		membroId: string,
	): Result<Emprestimo, "NaoEncontrado" | BancoDeDadosFalhou>;
	registrarDevolucao(
		emprestimo: Emprestimo,
	): Result<Emprestimo, "JaDevolvido" | BancoDeDadosFalhou>;
};

export function devolucaoPedida(
	evento: DevolucaoPedida,
	hoje: string,
	repositorios: RepositoriosDeDevolucao,
): EstadoDaDevolucao {
	const emprestimo = repositorios.buscarEmprestimo(
		evento.exemplarId,
		evento.membroId,
	);
	if (!emprestimo.ok) return estadoDe(emprestimo.error);
	const devolvido = devolver(emprestimo.value, hoje);
	if (!devolvido.ok) return estadoDe(devolvido.error);
	const salvo = repositorios.registrarDevolucao(devolvido.value);
	if (!salvo.ok) return estadoDe(salvo.error);
	return { tipo: "Devolvido", emprestimo: salvo.value };
}
