import type { DatabaseSync } from "node:sqlite";
import { type Context, Hono } from "hono";
import type { BancoDeDadosFalhou } from "../../lib/consultar.server.ts";
import {
	cadastroDeMembroPedido,
	type EstadoDaSuspensao,
	suspensaoPedida,
} from "./eventosDeMembros.ts";
import {
	definirSuspenso,
	inserirMembro,
	listarMembros,
	type RepositoriosDeMembros,
} from "./repositorio.server.ts";

function falhou(c: Context, excecao: BancoDeDadosFalhou) {
	console.error(excecao.mensagem);
	return c.json({ falha: "BancoDeDadosFalhou" }, 500);
}

function nome(corpo: unknown): string {
	if (typeof corpo !== "object" || corpo === null) return "";
	const valor = (corpo as Record<string, unknown>).nome;
	return typeof valor === "string" ? valor : "";
}

function respostaDaSuspensao(c: Context, estado: EstadoDaSuspensao) {
	if (estado.tipo === "Alterado") return c.json(estado.membro, 200);
	if (estado.tipo === "Recusado") return c.json({ recusa: estado.recusa }, 404);
	return falhou(c, estado.excecao);
}

/** As rotas dos membros, montadas em /api/membros, fechando sobre o `db`. */
export function rotaDeMembros(db: DatabaseSync): Hono {
	const repositorios: RepositoriosDeMembros = {
		inserirMembro: (dados) => inserirMembro(db, dados),
		definirSuspenso: (id, suspenso) => definirSuspenso(db, id, suspenso),
	};
	const rota = new Hono();

	rota.get("/", (c) => {
		const membros = listarMembros(db);
		if (!membros.ok) return falhou(c, membros.error);
		return c.json(membros.value, 200);
	});

	rota.post("/", async (c) => {
		// A fronteira HTTP é uma borda com o mundo de fora (capítulo 5): um corpo
		// que não é JSON faz c.req.json() lançar, e vira aqui um pedido vazio.
		let corpo: unknown;
		try {
			corpo = await c.req.json();
		} catch {
			corpo = {};
		}
		const estado = cadastroDeMembroPedido({ nome: nome(corpo) }, repositorios);
		if (estado.tipo === "Cadastrado") return c.json(estado.membro, 201);
		if (estado.tipo === "Recusado")
			return c.json({ recusa: estado.recusa }, 400);
		return falhou(c, estado.excecao);
	});

	rota.post("/:membroId/suspensao", (c) =>
		respostaDaSuspensao(
			c,
			suspensaoPedida(
				{ membroId: c.req.param("membroId"), suspenso: true },
				repositorios,
			),
		),
	);

	rota.post("/:membroId/reativacao", (c) =>
		respostaDaSuspensao(
			c,
			suspensaoPedida(
				{ membroId: c.req.param("membroId"), suspenso: false },
				repositorios,
			),
		),
	);

	return rota;
}
