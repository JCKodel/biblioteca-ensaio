// Primeira ocorrência concreta: features/catalogo (validarLivro e o
// repositório). Segunda: features/membros/regras.ts (cadastrar), que trouxe
// este arquivo para cá. O tipo é o do capítulo 5 do livro.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}
