import type { BancoDeDadosFalhou } from "./consultar.server.ts";

// Primeira ocorrência concreta: features/catalogo/eventosDeCatalogo.ts
// (cadastroDeExemplarPedido). Segunda: features/membros/eventosDeMembros.ts
// (suspensaoPedida), que o trouxe para cá. As recusas são strings e a
// exceção é um objeto com `codigo` (capítulo 7 do livro).
export function estadoDe<R extends string>(
	erro: R | BancoDeDadosFalhou,
):
	| { tipo: "Recusado"; recusa: R }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou } {
	if (typeof erro === "string") return { tipo: "Recusado", recusa: erro };
	return { tipo: "Falhou", excecao: erro };
}
