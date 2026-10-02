import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { falhou } from "../../lib/falhou.server.ts";
import {
	cadastroDeExemplarPedido,
	cadastroDeLivroPedido,
} from "./eventosDeCatalogo.ts";
import type { CadastroDeLivroPedido } from "./regras.ts";
import { listarLivros, repositoriosDoCatalogo } from "./repositorio.server.ts";

function campo(corpo: unknown, nome: keyof CadastroDeLivroPedido): string {
	if (typeof corpo !== "object" || corpo === null) return "";
	const valor = (corpo as Record<string, unknown>)[nome];
	return typeof valor === "string" ? valor : "";
}

/** As rotas do catálogo, montadas em /api/livros, fechando sobre o `db`. */
export function rotaDoCatalogo(db: DatabaseSync): Hono {
	const repositorios = repositoriosDoCatalogo(db);
	const rota = new Hono();

	rota.get("/", (c) => {
		const livros = listarLivros(db);
		if (!livros.ok) return falhou(c, livros.error);
		return c.json(livros.value, 200);
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
		const estado = cadastroDeLivroPedido(
			{
				titulo: campo(corpo, "titulo"),
				autor: campo(corpo, "autor"),
				ano: campo(corpo, "ano"),
			},
			repositorios,
		);
		if (estado.tipo === "Cadastrado") return c.json(estado.livro, 201);
		if (estado.tipo === "Recusado")
			return c.json({ recusa: estado.recusa }, 400);
		return falhou(c, estado.excecao);
	});

	rota.post("/:livroId/exemplares", (c) => {
		const estado = cadastroDeExemplarPedido(
			{ livroId: c.req.param("livroId") },
			repositorios,
		);
		if (estado.tipo === "Cadastrado") return c.json(estado.exemplar, 201);
		if (estado.tipo === "Recusado")
			return c.json({ recusa: estado.recusa }, 404);
		return falhou(c, estado.excecao);
	});

	return rota;
}
