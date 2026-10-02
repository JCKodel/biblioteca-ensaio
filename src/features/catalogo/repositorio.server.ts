import type { DatabaseSync } from "node:sqlite";
import type {
	DadosDoLivro,
	Exemplar,
	Livro,
	LivroDoCatalogo,
} from "./regras.ts";
import { err, ok, type Result } from "./result.ts";

// Primeira ocorrência concreta de `consultar` e `BancoDeDadosFalhou`: este
// repositório, o único que os usa. A segunda deve ser membros, que os move
// para src/lib/consultar.server.ts e diz que a primeira foi esta. Como no
// capítulo 5 do livro.
export type BancoDeDadosFalhou = {
	codigo: "BancoDeDadosFalhou";
	mensagem: string;
};

/** O único `try`/`catch` perto do banco: a exceção do SQLite vira um valor. */
export function consultar<T>(executar: () => T): Result<T, BancoDeDadosFalhou> {
	try {
		return ok(executar());
	} catch (lancado) {
		const mensagem =
			lancado instanceof Error ? lancado.message : String(lancado);
		return err({ codigo: "BancoDeDadosFalhou", mensagem });
	}
}

/** Os repositórios que os orquestradores recebem, com o `db` já fechado pela rota. */
export type RepositoriosDoCatalogo = {
	inserirLivro: (dados: DadosDoLivro) => Result<Livro, BancoDeDadosFalhou>;
	buscarLivro: (
		id: string,
	) => Result<Livro, "NaoEncontrado" | BancoDeDadosFalhou>;
	inserirExemplar: (livroId: string) => Result<Exemplar, BancoDeDadosFalhou>;
};

type LinhaDeLivro = {
	id: number;
	titulo: string;
	autor: string;
	ano: number | null;
};

// Ids são INTEGER no banco e string no código: a conversão mora aqui.
function paraLivro(linha: LinhaDeLivro): Livro {
	return {
		id: String(linha.id),
		titulo: linha.titulo,
		autor: linha.autor,
		ano: linha.ano,
	};
}

export function inserirLivro(
	db: DatabaseSync,
	dados: DadosDoLivro,
): Result<Livro, BancoDeDadosFalhou> {
	return consultar(() => {
		const { lastInsertRowid } = db
			.prepare("INSERT INTO livro (titulo, autor, ano) VALUES (?, ?, ?)")
			.run(dados.titulo, dados.autor, dados.ano);
		return { id: String(lastInsertRowid), ...dados };
	});
}

export function buscarLivro(
	db: DatabaseSync,
	id: string,
): Result<Livro, "NaoEncontrado" | BancoDeDadosFalhou> {
	const linha = consultar(
		() =>
			db
				.prepare("SELECT id, titulo, autor, ano FROM livro WHERE id = ?")
				.get(Number(id)) as LinhaDeLivro | undefined,
	);
	if (!linha.ok) return linha;
	if (!linha.value) return err("NaoEncontrado");
	return ok(paraLivro(linha.value));
}

export function inserirExemplar(
	db: DatabaseSync,
	livroId: string,
): Result<Exemplar, BancoDeDadosFalhou> {
	return consultar(() => {
		const { lastInsertRowid } = db
			.prepare("INSERT INTO exemplar (livro_id) VALUES (?)")
			.run(Number(livroId));
		return { id: String(lastInsertRowid), livroId };
	});
}

export function listarLivros(
	db: DatabaseSync,
): Result<LivroDoCatalogo[], BancoDeDadosFalhou> {
	return consultar(() => {
		const linhas = db
			.prepare(
				`SELECT livro.id, livro.titulo, livro.autor, livro.ano,
					COUNT(exemplar.id) AS total_de_exemplares
				FROM livro
				LEFT JOIN exemplar ON exemplar.livro_id = livro.id
				GROUP BY livro.id
				ORDER BY livro.id DESC`,
			)
			.all() as (LinhaDeLivro & { total_de_exemplares: number })[];
		return linhas.map((linha) => ({
			...paraLivro(linha),
			totalDeExemplares: linha.total_de_exemplares,
		}));
	});
}
