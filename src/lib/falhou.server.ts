import type { Context } from "hono";
import type { BancoDeDadosFalhou } from "./consultar.server.ts";

// Primeira ocorrência concreta: features/catalogo/rota.server.ts. Segunda:
// features/membros/rota.server.ts, onde já devia ter saído para cá. Terceira:
// features/emprestimos/rota.server.ts, que a trouxe.

/** Escreve a mensagem do SQLite no terminal e responde `500`, sem ela. */
export function falhou(c: Context, excecao: BancoDeDadosFalhou) {
	console.error(excecao.mensagem);
	return c.json({ falha: "BancoDeDadosFalhou" }, 500);
}
