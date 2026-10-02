import { MENSAGEM_DE_FALHA } from "../../lib/mensagemDeFalha.ts";
import { err, ok, type Result } from "../../lib/result.ts";
import type { Exemplar } from "../catalogo/regras.ts";
import type { Membro } from "../membros/regras.ts";

export type Emprestimo = {
	exemplarId: string;
	membroId: string;
	emprestadoEm: string;
	devolverEm: string;
	devolvidoEm: string | null;
};

export type RecusaDeEmprestimo =
	| "TemLivrosEmAtraso"
	| "JaEmprestado"
	| "MembroSuspenso";

/** Um empréstimo aberto como a tela de empréstimo o lista (docs/03). */
export type EmprestimoAberto = {
	exemplarId: string;
	titulo: string;
	membroId: string;
	nome: string;
	devolverEm: string;
};

/** Um exemplar sem empréstimo aberto, com o título do livro (docs/03). */
export type ExemplarDisponivel = {
	id: string;
	livroId: string;
	titulo: string;
};

/** O `Membro` da regra mais o nome, para a escolha da tela (docs/03). */
export type MembroDoEmprestimo = {
	id: string;
	nome: string;
	emAtraso: number;
	suspenso: boolean;
};

export const DIAS_DE_EMPRESTIMO = 21;

export function dataDeDevolucao(hoje: string): string {
	const devolucao = new Date(hoje);
	devolucao.setUTCDate(devolucao.getUTCDate() + DIAS_DE_EMPRESTIMO);
	return devolucao.toISOString().slice(0, 10);
}

/** A suspensão antes do atraso: devolver os livros não basta a um suspenso. */
export function podePegarEmprestado(
	membro: Membro,
): Result<Membro, "TemLivrosEmAtraso" | "MembroSuspenso"> {
	if (membro.suspenso) return err("MembroSuspenso");
	if (membro.emAtraso > 0) return err("TemLivrosEmAtraso");
	return ok(membro);
}

/** `JaEmprestado` nunca sai daqui: só o banco o sabe (docs/02). */
export function emprestar(
	exemplar: Exemplar,
	membro: Membro,
	hoje: string,
): Result<Emprestimo, RecusaDeEmprestimo> {
	const podePegar = podePegarEmprestado(membro);
	if (!podePegar.ok) return podePegar;
	return ok({
		exemplarId: exemplar.id,
		membroId: membro.id,
		emprestadoEm: hoje,
		devolverEm: dataDeDevolucao(hoje),
		devolvidoEm: null,
	});
}

/** `"2026-10-22"` vira "Devolver até 22/10/2026". */
export function textoDaDevolucao(devolverEm: string): string {
	const [ano, mes, dia] = devolverEm.split("-");
	return `Devolver até ${dia}/${mes}/${ano}`;
}

/** Os textos do docs/03, literais. */
export const mensagens: Record<
	RecusaDeEmprestimo | "NaoEncontrado" | "Falhou",
	string
> = {
	TemLivrosEmAtraso: "Devolva primeiro os seus livros atrasados.",
	JaEmprestado: "Este exemplar acabou de ser emprestado a outra pessoa.",
	MembroSuspenso: "A sua matrícula está suspensa.",
	NaoEncontrado: "Este membro ou este exemplar não está cadastrado.",
	Falhou: MENSAGEM_DE_FALHA,
};
