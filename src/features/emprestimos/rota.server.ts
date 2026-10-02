import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { falhou } from "../../lib/falhou.server.ts";
import { err, ok, type Result } from "../../lib/result.ts";
import {
	emprestimoPedido,
	type RepositoriosDeEmprestimo,
} from "./eventosDeEmprestimo.ts";
import {
	buscarExemplar,
	buscarMembro,
	inserirEmprestimo,
	listarEmprestimosAbertos,
	listarExemplaresDisponiveis,
	listarMembrosDoEmprestimo,
} from "./repositorio.server.ts";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** A data local da máquina, a do balcão; `toISOString` daria a de Greenwich. */
function dataLocal(): string {
	const agora = new Date();
	const mes = String(agora.getMonth() + 1).padStart(2, "0");
	const dia = String(agora.getDate()).padStart(2, "0");
	return `${agora.getFullYear()}-${mes}-${dia}`;
}

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
		const repositorios: RepositoriosDeEmprestimo = {
			buscarMembro: (id) => buscarMembro(db, id, hoje.value),
			buscarExemplar: (id) => buscarExemplar(db, id),
			inserirEmprestimo: (emprestimo) => inserirEmprestimo(db, emprestimo),
		};
		// A fronteira HTTP é uma borda com o mundo de fora (capítulo 5): um corpo
		// que não é JSON faz c.req.json() lançar, e vira aqui um pedido vazio.
		let corpo: unknown;
		try {
			corpo = await c.req.json();
		} catch {
			corpo = {};
		}
		const estado = emprestimoPedido(
			{
				exemplarId: campo(corpo, "exemplarId"),
				membroId: campo(corpo, "membroId"),
			},
			hoje.value,
			repositorios,
		);
		if (estado.tipo === "Emprestado") return c.json(estado.emprestimo, 201);
		if (estado.tipo === "Recusado") {
			const status = estado.recusa === "NaoEncontrado" ? 404 : 409;
			return c.json({ recusa: estado.recusa }, status);
		}
		return falhou(c, estado.excecao);
	});

	return rota;
}
