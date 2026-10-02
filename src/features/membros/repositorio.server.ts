import type { DatabaseSync } from "node:sqlite";
import {
	type BancoDeDadosFalhou,
	consultar,
} from "../../lib/consultar.server.ts";
import { err, ok, type Result } from "../../lib/result.ts";
import type { DadosDoMembro, MembroDoCadastro } from "./regras.ts";

/** Os repositórios que os orquestradores recebem, com o `db` já fechado pela rota. */
export type RepositoriosDeMembros = {
	inserirMembro: (
		dados: DadosDoMembro,
	) => Result<MembroDoCadastro, BancoDeDadosFalhou>;
	definirSuspenso: (
		id: string,
		suspenso: boolean,
	) => Result<MembroDoCadastro, "NaoEncontrado" | BancoDeDadosFalhou>;
};

type LinhaDeMembro = { id: number; nome: string; suspenso: number };

// Ids são INTEGER no banco e string no código, e o SQLite não tem booleano:
// `suspenso` é gravado 0 ou 1 e lido boolean. As duas conversões moram aqui.
function paraMembro(linha: LinhaDeMembro): MembroDoCadastro {
	return {
		id: String(linha.id),
		nome: linha.nome,
		suspenso: linha.suspenso === 1,
	};
}

export function inserirMembro(
	db: DatabaseSync,
	dados: DadosDoMembro,
): Result<MembroDoCadastro, BancoDeDadosFalhou> {
	return consultar(() => {
		const { lastInsertRowid } = db
			.prepare("INSERT INTO membro (nome, suspenso) VALUES (?, 0)")
			.run(dados.nome);
		return { id: String(lastInsertRowid), nome: dados.nome, suspenso: false };
	});
}

export function listarMembros(
	db: DatabaseSync,
): Result<MembroDoCadastro[], BancoDeDadosFalhou> {
	return consultar(() => {
		const linhas = db
			.prepare("SELECT id, nome, suspenso FROM membro ORDER BY membro.id DESC")
			.all() as LinhaDeMembro[];
		return linhas.map(paraMembro);
	});
}

/** Grava a situação; gravar a que já estava lá devolve o membro, sem recusa. */
export function definirSuspenso(
	db: DatabaseSync,
	id: string,
	suspenso: boolean,
): Result<MembroDoCadastro, "NaoEncontrado" | BancoDeDadosFalhou> {
	const linha = consultar(
		() =>
			db
				.prepare(
					"UPDATE membro SET suspenso = ? WHERE id = ? RETURNING id, nome, suspenso",
				)
				.get(suspenso ? 1 : 0, Number(id)) as LinhaDeMembro | undefined,
	);
	if (!linha.ok) return linha;
	if (!linha.value) return err("NaoEncontrado");
	return ok(paraMembro(linha.value));
}
