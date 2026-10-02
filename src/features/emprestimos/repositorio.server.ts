import type { DatabaseSync } from "node:sqlite";
import {
	type BancoDeDadosFalhou,
	consultar,
} from "../../lib/consultar.server.ts";
import { err, ok, type Result } from "../../lib/result.ts";
import type { Exemplar } from "../catalogo/regras.ts";
import type { Membro } from "../membros/regras.ts";
import type {
	Emprestimo,
	EmprestimoAberto,
	ExemplarDisponivel,
	MembroDoEmprestimo,
} from "./regras.ts";

// Ids são INTEGER no banco e string no código, `suspenso` é 0 ou 1 no banco e
// boolean no código, e as datas são TEXT YYYY-MM-DD, que o SQLite compara na
// ordem certa. As conversões moram aqui.

/** Quantos empréstimos abertos do membro têm a devolução antes de `hoje`. */
const EM_ATRASO = `(SELECT COUNT(*) FROM emprestimo
	WHERE emprestimo.membro_id = membro.id
		AND emprestimo.devolvido_em IS NULL
		AND emprestimo.devolver_em < ?)`;

const JA_EMPRESTADO = "UNIQUE constraint failed: emprestimo.exemplar_id";

type LinhaDeMembro = {
	id: number;
	nome: string;
	em_atraso: number;
	suspenso: number;
};

function paraMembroDoEmprestimo(linha: LinhaDeMembro): MembroDoEmprestimo {
	return {
		id: String(linha.id),
		nome: linha.nome,
		emAtraso: linha.em_atraso,
		suspenso: linha.suspenso === 1,
	};
}

export function buscarMembro(
	db: DatabaseSync,
	id: string,
	hoje: string,
): Result<Membro, "NaoEncontrado" | BancoDeDadosFalhou> {
	const linha = consultar(
		() =>
			db
				.prepare(
					`SELECT membro.id, membro.nome, membro.suspenso, ${EM_ATRASO} AS em_atraso
					FROM membro WHERE membro.id = ?`,
				)
				.get(hoje, Number(id)) as LinhaDeMembro | undefined,
	);
	if (!linha.ok) return linha;
	if (!linha.value) return err("NaoEncontrado");
	const {
		id: membroId,
		emAtraso,
		suspenso,
	} = paraMembroDoEmprestimo(linha.value);
	return ok({ id: membroId, emAtraso, suspenso });
}

/** Não olha empréstimos: quem sabe se o exemplar está livre é o índice. */
export function buscarExemplar(
	db: DatabaseSync,
	id: string,
): Result<Exemplar, "NaoEncontrado" | BancoDeDadosFalhou> {
	const linha = consultar(
		() =>
			db
				.prepare("SELECT id, livro_id FROM exemplar WHERE id = ?")
				.get(Number(id)) as { id: number; livro_id: number } | undefined,
	);
	if (!linha.ok) return linha;
	if (!linha.value) return err("NaoEncontrado");
	return ok({
		id: String(linha.value.id),
		livroId: String(linha.value.livro_id),
	});
}

/** A violação do índice de empréstimo aberto vira `JaEmprestado`; outra falha continua falha. */
export function inserirEmprestimo(
	db: DatabaseSync,
	emprestimo: Emprestimo,
): Result<Emprestimo, "JaEmprestado" | BancoDeDadosFalhou> {
	const salvo = consultar(() => {
		db.prepare(
			`INSERT INTO emprestimo
				(exemplar_id, membro_id, emprestado_em, devolver_em, devolvido_em)
			VALUES (?, ?, ?, ?, ?)`,
		).run(
			Number(emprestimo.exemplarId),
			Number(emprestimo.membroId),
			emprestimo.emprestadoEm,
			emprestimo.devolverEm,
			emprestimo.devolvidoEm,
		);
		return emprestimo;
	});
	if (!salvo.ok && salvo.error.mensagem.includes(JA_EMPRESTADO)) {
		return err("JaEmprestado");
	}
	return salvo;
}

export function listarEmprestimosAbertos(
	db: DatabaseSync,
): Result<EmprestimoAberto[], BancoDeDadosFalhou> {
	return consultar(() => {
		const linhas = db
			.prepare(
				`SELECT emprestimo.exemplar_id, livro.titulo, emprestimo.membro_id,
					membro.nome, emprestimo.devolver_em
				FROM emprestimo
				JOIN exemplar ON exemplar.id = emprestimo.exemplar_id
				JOIN livro ON livro.id = exemplar.livro_id
				JOIN membro ON membro.id = emprestimo.membro_id
				WHERE emprestimo.devolvido_em IS NULL
				ORDER BY emprestimo.id DESC`,
			)
			.all() as {
			exemplar_id: number;
			titulo: string;
			membro_id: number;
			nome: string;
			devolver_em: string;
		}[];
		return linhas.map((linha) => ({
			exemplarId: String(linha.exemplar_id),
			titulo: linha.titulo,
			membroId: String(linha.membro_id),
			nome: linha.nome,
			devolverEm: linha.devolver_em,
		}));
	});
}

export function listarExemplaresDisponiveis(
	db: DatabaseSync,
): Result<ExemplarDisponivel[], BancoDeDadosFalhou> {
	return consultar(() => {
		const linhas = db
			.prepare(
				`SELECT exemplar.id, exemplar.livro_id, livro.titulo
				FROM exemplar
				JOIN livro ON livro.id = exemplar.livro_id
				WHERE NOT EXISTS (
					SELECT 1 FROM emprestimo
					WHERE emprestimo.exemplar_id = exemplar.id
						AND emprestimo.devolvido_em IS NULL
				)
				ORDER BY livro.titulo COLLATE NOCASE, exemplar.id`,
			)
			.all() as { id: number; livro_id: number; titulo: string }[];
		return linhas.map((linha) => ({
			id: String(linha.id),
			livroId: String(linha.livro_id),
			titulo: linha.titulo,
		}));
	});
}

export function listarMembrosDoEmprestimo(
	db: DatabaseSync,
	hoje: string,
): Result<MembroDoEmprestimo[], BancoDeDadosFalhou> {
	return consultar(() => {
		const linhas = db
			.prepare(
				`SELECT membro.id, membro.nome, membro.suspenso, ${EM_ATRASO} AS em_atraso
				FROM membro
				ORDER BY membro.nome COLLATE NOCASE, membro.id`,
			)
			.all(hoje) as LinhaDeMembro[];
		return linhas.map(paraMembroDoEmprestimo);
	});
}

/**
 * O empréstimo mais recente desse exemplar a esse membro, aberto ou devolvido:
 * quem decide `JaDevolvido` é a regra `devolver`, não o SQL.
 */
export function buscarEmprestimo(
	db: DatabaseSync,
	exemplarId: string,
	membroId: string,
): Result<Emprestimo, "NaoEncontrado" | BancoDeDadosFalhou> {
	const linha = consultar(
		() =>
			db
				.prepare(
					`SELECT exemplar_id, membro_id, emprestado_em, devolver_em, devolvido_em
					FROM emprestimo
					WHERE exemplar_id = ? AND membro_id = ?
					ORDER BY id DESC
					LIMIT 1`,
				)
				.get(Number(exemplarId), Number(membroId)) as
				| {
						exemplar_id: number;
						membro_id: number;
						emprestado_em: string;
						devolver_em: string;
						devolvido_em: string | null;
				  }
				| undefined,
	);
	if (!linha.ok) return linha;
	if (!linha.value) return err("NaoEncontrado");
	return ok({
		exemplarId: String(linha.value.exemplar_id),
		membroId: String(linha.value.membro_id),
		emprestadoEm: linha.value.emprestado_em,
		devolverEm: linha.value.devolver_em,
		devolvidoEm: linha.value.devolvido_em,
	});
}

/**
 * Grava só onde o empréstimo ainda está aberto: nenhuma linha mudada é
 * `JaDevolvido`, porque outro pedido chegou antes. É o lugar onde dois
 * bibliotecários não competem, como o índice no `JaEmprestado`.
 */
export function registrarDevolucao(
	db: DatabaseSync,
	emprestimo: Emprestimo,
): Result<Emprestimo, "JaDevolvido" | BancoDeDadosFalhou> {
	const mudadas = consultar(
		() =>
			db
				.prepare(
					`UPDATE emprestimo SET devolvido_em = ?
					WHERE exemplar_id = ? AND membro_id = ? AND devolvido_em IS NULL`,
				)
				.run(
					emprestimo.devolvidoEm,
					Number(emprestimo.exemplarId),
					Number(emprestimo.membroId),
				).changes,
	);
	if (!mudadas.ok) return mudadas;
	if (Number(mudadas.value) === 0) return err("JaDevolvido");
	return ok(emprestimo);
}
