// Primeira ocorrência concreta: features/catalogo (validarLivro e o repositório).
// A segunda deve ser membros, que move este arquivo para src/lib/result.ts e
// diz que a primeira foi esta. O tipo é o do capítulo 5 do livro.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}
