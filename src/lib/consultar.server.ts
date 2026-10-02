import { err, ok, type Result } from "./result.ts";

// Primeira ocorrência concreta de `consultar` e `BancoDeDadosFalhou`: o
// repositório do catálogo (features/catalogo/repositorio.server.ts). Segunda:
// o repositório dos membros (features/membros/repositorio.server.ts), que os
// trouxe para cá. Como no capítulo 5 do livro.
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
