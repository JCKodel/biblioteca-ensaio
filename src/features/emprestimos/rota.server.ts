import type { DatabaseSync } from "node:sqlite";
import { type Context, Hono } from "hono";
import { dataLocal } from "../../lib/dataLocal.ts";
import { falhou } from "../../lib/falhou.server.ts";
import { err, ok, type Result } from "../../lib/result.ts";
import { listaDeAtrasosPedida } from "./atrasos/eventosDeAtrasos.ts";
import { devolucaoPedida } from "./devolucao/eventosDeDevolucao.ts";
import { emprestimoPedido } from "./eventosDeEmprestimo.ts";
import {
	listarEmprestimosAbertos,
	listarExemplaresDisponiveis,
	listarMembrosDoEmprestimo,
	repositoriosDeAtrasos,
	repositoriosDeDevolucao,
	repositoriosDeEmprestimo,
} from "./repositorio.server.ts";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * O relógio, lido uma vez onde a requisição chega. Desligado, ignora `xHoje`.
 * Ligado (só no e2e), um `xHoje` presente é o `hoje`, se for um dia que existe.
 */
export function lerHoje(
	xHoje: string | undefined,
	relogioDeTeste: boolean,
): Result<string, "HojeInvalido"> {
	if (!relogioDeTeste || xHoje === undefined) return ok(dataLocal());
	if (!DATA.test(xHoje)) return err("HojeInvalido");
	// Um mês 13 dá uma data inválida, e `2026-02-30` vira outro dia.
	const dia = new Date(`${xHoje}T00:00:00Z`);
	if (Number.isNaN(dia.getTime())) return err("HojeInvalido");
	return dia.toISOString().slice(0, 10) === xHoje
		? ok(xHoje)
		: err("HojeInvalido");
}

function campo(corpo: unknown, nome: "exemplarId" | "membroId"): string {
	if (typeof corpo !== "object" || corpo === null) return "";
	const valor = (corpo as Record<string, unknown>)[nome];
	return typeof valor === "string" ? valor : "";
}

/**
 * O corpo de um `EmprestimoPedido` ou de uma `DevolucaoPedida`, que têm a
 * mesma forma. A fronteira HTTP é uma borda com o mundo de fora (capítulo 5):
 * um corpo que não é JSON faz c.req.json() lançar, e vira aqui um pedido
 * vazio. Primeira ocorrência: o POST /api/emprestimos; segunda: o POST
 * /api/emprestimos/devolucao, que a trouxe para esta função.
 */
async function lerPedido(
	c: Context,
): Promise<{ exemplarId: string; membroId: string }> {
	let corpo: unknown;
	try {
		corpo = await c.req.json();
	} catch {
		corpo = {};
	}
	return {
		exemplarId: campo(corpo, "exemplarId"),
		membroId: campo(corpo, "membroId"),
	};
}

/** As rotas do empréstimo, montadas em /api/emprestimos, fechando sobre o `db`. */
export function rotaDeEmprestimos(
	db: DatabaseSync,
	relogioDeTeste: boolean,
): Hono {
	const rota = new Hono();

	rota.get("/", (c) => {
		const emprestimos = listarEmprestimosAbertos(db);
		if (!emprestimos.ok) return falhou(c, emprestimos.error);
		return c.json(emprestimos.value, 200);
	});

	rota.get("/exemplares", (c) => {
		const exemplares = listarExemplaresDisponiveis(db);
		if (!exemplares.ok) return falhou(c, exemplares.error);
		return c.json(exemplares.value, 200);
	});

	rota.get("/membros", (c) => {
		const hoje = lerHoje(c.req.header("x-hoje"), relogioDeTeste);
		if (!hoje.ok) return c.json({ falha: hoje.error }, 400);
		const membros = listarMembrosDoEmprestimo(db, hoje.value);
		if (!membros.ok) return falhou(c, membros.error);
		return c.json(membros.value, 200);
	});

	rota.post("/", async (c) => {
		const hoje = lerHoje(c.req.header("x-hoje"), relogioDeTeste);
		if (!hoje.ok) return c.json({ falha: hoje.error }, 400);
		// O `hoje` muda a cada requisição, então os repositórios são montados
		// aqui, fechando sobre o `db` e esse `hoje`.
		const estado = emprestimoPedido(
			await lerPedido(c),
			hoje.value,
			repositoriosDeEmprestimo(db, hoje.value),
		);
		if (estado.tipo === "Emprestado") return c.json(estado.emprestimo, 201);
		if (estado.tipo === "Recusado") {
			const status = estado.recusa === "NaoEncontrado" ? 404 : 409;
			return c.json({ recusa: estado.recusa }, status);
		}
		return falhou(c, estado.excecao);
	});

	// A devolução não lê `hoje` nos repositórios (a regra o põe no
	// `Emprestimo`), então eles são montados uma vez, fechando sobre o `db`.
	const repositoriosDaDevolucao = repositoriosDeDevolucao(db);

	rota.post("/devolucao", async (c) => {
		const hoje = lerHoje(c.req.header("x-hoje"), relogioDeTeste);
		if (!hoje.ok) return c.json({ falha: hoje.error }, 400);
		const estado = devolucaoPedida(
			await lerPedido(c),
			hoje.value,
			repositoriosDaDevolucao,
		);
		if (estado.tipo === "Devolvido") return c.json(estado.emprestimo, 200);
		if (estado.tipo === "Recusado") {
			const status = estado.recusa === "NaoEncontrado" ? 404 : 409;
			return c.json({ recusa: estado.recusa }, status);
		}
		return falhou(c, estado.excecao);
	});

	// Os repositórios dos atrasos recebem o `hoje` do orquestrador a cada
	// chamada, então são montados uma vez, fechando só sobre o `db`.
	const repositoriosDosAtrasos = repositoriosDeAtrasos(db);

	rota.get("/atrasados", (c) => {
		const hoje = lerHoje(c.req.header("x-hoje"), relogioDeTeste);
		if (!hoje.ok) return c.json({ falha: hoje.error }, 400);
		const estado = listaDeAtrasosPedida(hoje.value, repositoriosDosAtrasos);
		if (estado.tipo === "Listado") return c.json(estado.atrasados, 200);
		return falhou(c, estado.excecao);
	});

	return rota;
}
