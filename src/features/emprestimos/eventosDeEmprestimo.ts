import type { BancoDeDadosFalhou } from "../../lib/consultar.server.ts";
import { estadoDe } from "../../lib/estadoDe.ts";
import type { Result } from "../../lib/result.ts";
import type { Exemplar } from "../catalogo/regras.ts";
import type { Membro } from "../membros/regras.ts";
import {
	type Emprestimo,
	emprestar,
	type RecusaDeEmprestimo,
} from "./regras.ts";

export type EmprestimoPedido = { exemplarId: string; membroId: string };

export type EstadoDoEmprestimo =
	| { tipo: "Emprestado"; emprestimo: Emprestimo }
	| { tipo: "Recusado"; recusa: RecusaDeEmprestimo | "NaoEncontrado" }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type RepositoriosDeEmprestimo = {
	buscarMembro(
		id: string,
	): Result<Membro, "NaoEncontrado" | BancoDeDadosFalhou>;
	buscarExemplar(
		id: string,
	): Result<Exemplar, "NaoEncontrado" | BancoDeDadosFalhou>;
	inserirEmprestimo(
		emprestimo: Emprestimo,
	): Result<Emprestimo, "JaEmprestado" | BancoDeDadosFalhou>;
};

export function emprestimoPedido(
	evento: EmprestimoPedido,
	hoje: string,
	repositorios: RepositoriosDeEmprestimo,
): EstadoDoEmprestimo {
	const membro = repositorios.buscarMembro(evento.membroId);
	if (!membro.ok) return estadoDe(membro.error);
	const exemplar = repositorios.buscarExemplar(evento.exemplarId);
	if (!exemplar.ok) return estadoDe(exemplar.error);
	const emprestimo = emprestar(exemplar.value, membro.value, hoje);
	if (!emprestimo.ok) return estadoDe(emprestimo.error);
	const salvo = repositorios.inserirEmprestimo(emprestimo.value);
	if (!salvo.ok) return estadoDe(salvo.error);
	return { tipo: "Emprestado", emprestimo: salvo.value };
}
