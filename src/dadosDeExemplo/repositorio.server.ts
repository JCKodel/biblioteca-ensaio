import type { DatabaseSync } from "node:sqlite";
import { type BancoDeDadosFalhou, consultar } from "../lib/consultar.server.ts";
import type { Result } from "../lib/result.ts";

// O SQL próprio dos dados de exemplo: a transação, a contagem e o apagar.
// Livros, exemplares, membros e empréstimos entram pelos orquestradores das
// fatias, nunca por um INSERT daqui.

export type Tabelas = {
	livros: number;
	exemplares: number;
	membros: number;
	emprestimos: number;
};

export type Contagem = Tabelas & {
	suspensos: number;
	devolvidosNoPrazo: number;
	devolvidosComAtraso: number;
	abertosNoPrazo: number;
	abertosAtrasados: number;
};

export function comecarTransacao(
	db: DatabaseSync,
): Result<void, BancoDeDadosFalhou> {
	return consultar(() => {
		db.exec("BEGIN");
	});
}

export function confirmarTransacao(
	db: DatabaseSync,
): Result<void, BancoDeDadosFalhou> {
	return consultar(() => {
		db.exec("COMMIT");
	});
}

export function desfazerTransacao(
	db: DatabaseSync,
): Result<void, BancoDeDadosFalhou> {
	return consultar(() => {
		db.exec("ROLLBACK");
	});
}

export function contarTabelas(
	db: DatabaseSync,
): Result<Tabelas, BancoDeDadosFalhou> {
	return consultar(
		() =>
			db
				.prepare(
					`SELECT
						(SELECT COUNT(*) FROM livro) AS livros,
						(SELECT COUNT(*) FROM exemplar) AS exemplares,
						(SELECT COUNT(*) FROM membro) AS membros,
						(SELECT COUNT(*) FROM emprestimo) AS emprestimos`,
				)
				.get() as Tabelas,
	);
}

/** Na ordem das chaves estrangeiras. As migrações e o `user_version` ficam. */
export function apagarTabelas(
	db: DatabaseSync,
): Result<void, BancoDeDadosFalhou> {
	return consultar(() => {
		db.exec("DELETE FROM emprestimo");
		db.exec("DELETE FROM exemplar");
		db.exec("DELETE FROM membro");
		db.exec("DELETE FROM livro");
	});
}

/**
 * As quatro tabelas, os suspensos e os empréstimos por situação, com `hoje`:
 * aberto atrasado é `devolver_em < hoje`, como em `emAtraso`.
 */
export function contarCarga(
	db: DatabaseSync,
	hoje: string,
): Result<Contagem, BancoDeDadosFalhou> {
	return consultar(
		() =>
			db
				.prepare(
					`SELECT
						(SELECT COUNT(*) FROM livro) AS livros,
						(SELECT COUNT(*) FROM exemplar) AS exemplares,
						(SELECT COUNT(*) FROM membro) AS membros,
						(SELECT COUNT(*) FROM emprestimo) AS emprestimos,
						(SELECT COUNT(*) FROM membro WHERE suspenso = 1) AS suspensos,
						(SELECT COUNT(*) FROM emprestimo
							WHERE devolvido_em IS NOT NULL AND devolvido_em <= devolver_em)
							AS devolvidosNoPrazo,
						(SELECT COUNT(*) FROM emprestimo
							WHERE devolvido_em IS NOT NULL AND devolvido_em > devolver_em)
							AS devolvidosComAtraso,
						(SELECT COUNT(*) FROM emprestimo
							WHERE devolvido_em IS NULL AND devolver_em >= ?)
							AS abertosNoPrazo,
						(SELECT COUNT(*) FROM emprestimo
							WHERE devolvido_em IS NULL AND devolver_em < ?)
							AS abertosAtrasados`,
				)
				.get(hoje, hoje) as Contagem,
	);
}
