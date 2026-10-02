import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { abrirBanco } from "../banco.server.ts";
import {
	listarEmprestimosAbertos,
	listarExemplaresDisponiveis,
	listarMembrosDoEmprestimo,
} from "../features/emprestimos/repositorio.server.ts";
import { somarDias } from "../lib/somarDias.ts";
import { carregarDadosDeExemplo } from "./carregar.server.ts";
import type { EmprestimoDoPlano } from "./plano.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const HOJE = "2026-10-02";

const CONTAGEM = {
	livros: 30,
	exemplares: 60,
	membros: 25,
	emprestimos: 120,
	suspensos: 2,
	devolvidosNoPrazo: 90,
	devolvidosComAtraso: 18,
	abertosNoPrazo: 8,
	abertosAtrasados: 4,
};

/** Um plano que a regra recusa: a matrícula 1 pega o exemplar 2 com o 1 atrasado. */
const PLANO_RECUSADO: EmprestimoDoPlano[] = [
	{ exemplar: 1, membro: 1, emprestadoHaDias: 60, devolvidoHaDias: null },
	{ exemplar: 2, membro: 1, emprestadoHaDias: 10, devolvidoHaDias: null },
];

function bancoNovo(): DatabaseSync {
	return abrirBanco(RAIZ, ":memory:");
}

function valor<T>(
	resultado: { ok: true; value: T } | { ok: false; error: unknown },
): T {
	if (!resultado.ok) throw new Error(JSON.stringify(resultado.error));
	return resultado.value;
}

/** Tudo o que as quatro tabelas guardam, para comparar antes e depois. */
function fotografia(db: DatabaseSync) {
	return ["livro", "exemplar", "membro", "emprestimo"].map((tabela) =>
		db.prepare(`SELECT * FROM ${tabela} ORDER BY id`).all(),
	);
}

function contarTudo(db: DatabaseSync) {
	const contar = (tabela: string) =>
		(db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number })
			.n;
	return {
		livros: contar("livro"),
		exemplares: contar("exemplar"),
		membros: contar("membro"),
		emprestimos: contar("emprestimo"),
	};
}

describe("carregarDadosDeExemplo num banco vazio", () => {
	const db = bancoNovo();
	const carregado = carregarDadosDeExemplo(db, HOJE, { apagar: false });

	test("a carga devolve exatamente a contagem do Comportamento, sem nada apagado", () => {
		expect(carregado).toEqual({
			ok: true,
			value: { apagado: null, carregado: CONTAGEM },
		});
	});

	test("o livro 1 é Dom Casmurro e a matrícula 3 é Carla Mendes Rocha", () => {
		expect(db.prepare("SELECT titulo FROM livro WHERE id = 1").get()).toEqual({
			titulo: "Dom Casmurro",
		});
		expect(db.prepare("SELECT nome FROM membro WHERE id = 3").get()).toEqual({
			nome: "Carla Mendes Rocha",
		});
	});

	test("emAtraso é 2 na matrícula 3, 1 nas 12 e 21 e 0 nas outras, e só as 8 e 19 estão suspensas", () => {
		const membros = valor(listarMembrosDoEmprestimo(db, HOJE));
		expect(membros).toHaveLength(25);
		for (const membro of membros) {
			const emAtraso =
				membro.id === "3"
					? 2
					: membro.id === "12" || membro.id === "21"
						? 1
						: 0;
			expect(membro.emAtraso, `matrícula ${membro.id}`).toBe(emAtraso);
			expect(membro.suspenso, `matrícula ${membro.id}`).toBe(
				membro.id === "8" || membro.id === "19",
			);
		}
	});

	test("a tela de empréstimo tem 12 empréstimos abertos e 48 exemplares disponíveis", () => {
		expect(valor(listarEmprestimosAbertos(db))).toHaveLength(12);
		expect(valor(listarExemplaresDisponiveis(db))).toHaveLength(48);
	});

	test("todo devolver_em é emprestado_em mais 21 dias", () => {
		const linhas = db
			.prepare("SELECT emprestado_em, devolver_em FROM emprestimo")
			.all() as { emprestado_em: string; devolver_em: string }[];
		expect(linhas).toHaveLength(120);
		for (const linha of linhas) {
			expect(linha.devolver_em).toBe(somarDias(linha.emprestado_em, 21));
		}
	});
});

describe("carregarDadosDeExemplo num banco que já tem dados", () => {
	test("a segunda carga sem apagar é JaTemDados com o que havia, e o banco não muda", () => {
		const db = bancoNovo();
		valor(carregarDadosDeExemplo(db, HOJE, { apagar: false }));
		const antes = fotografia(db);
		expect(carregarDadosDeExemplo(db, HOJE, { apagar: false })).toEqual({
			ok: false,
			error: {
				tipo: "JaTemDados",
				havia: { livros: 30, exemplares: 60, membros: 25, emprestimos: 120 },
			},
		});
		expect(fotografia(db)).toEqual(antes);
	});

	test("com apagar, apagado é o que havia, a contagem é a mesma e os ids recomeçam em 1", () => {
		const db = bancoNovo();
		db.exec(`INSERT INTO livro (titulo, autor, ano) VALUES ('A', 'B', 2000), ('C', 'D', 2001), ('E', 'F', NULL);
			INSERT INTO exemplar (livro_id) VALUES (1), (1), (2), (3), (3);
			INSERT INTO membro (nome) VALUES ('G'), ('H');
			INSERT INTO emprestimo (exemplar_id, membro_id, emprestado_em, devolver_em)
				VALUES (5, 2, '2026-09-01', '2026-09-22');`);
		expect(carregarDadosDeExemplo(db, HOJE, { apagar: true })).toEqual({
			ok: true,
			value: {
				apagado: { livros: 3, exemplares: 5, membros: 2, emprestimos: 1 },
				carregado: CONTAGEM,
			},
		});
		const ids = (tabela: string) =>
			db
				.prepare(`SELECT MIN(id) AS menor, MAX(id) AS maior FROM ${tabela}`)
				.get();
		expect(ids("livro")).toEqual({ menor: 1, maior: 30 });
		expect(ids("exemplar")).toEqual({ menor: 1, maior: 60 });
		expect(ids("membro")).toEqual({ menor: 1, maior: 25 });
		expect(ids("emprestimo")).toEqual({ menor: 1, maior: 120 });
		expect(db.prepare("SELECT titulo FROM livro WHERE id = 1").get()).toEqual({
			titulo: "Dom Casmurro",
		});
	});

	test("com apagar num banco vazio, só carrega", () => {
		expect(carregarDadosDeExemplo(bancoNovo(), HOJE, { apagar: true })).toEqual(
			{ ok: true, value: { apagado: null, carregado: CONTAGEM } },
		);
	});
});

describe("carregarDadosDeExemplo com um plano que a regra recusa", () => {
	const passo = `o empréstimo do exemplar 2 à matrícula 1 em ${somarDias(HOJE, -10)} foi recusado (TemLivrosEmAtraso)`;

	test("num banco vazio, dá Falhou com o passo, e o banco fica vazio", () => {
		const db = bancoNovo();
		expect(
			carregarDadosDeExemplo(db, HOJE, { apagar: false }, PLANO_RECUSADO),
		).toEqual({ ok: false, error: { tipo: "Falhou", passo } });
		expect(contarTudo(db)).toEqual({
			livros: 0,
			exemplares: 0,
			membros: 0,
			emprestimos: 0,
		});
		expect(db.prepare("PRAGMA user_version").get()).toEqual({
			user_version: 3,
		});
	});

	test("com apagar sobre dados, dá Falhou com o passo, e os dados de antes ficam", () => {
		const db = bancoNovo();
		valor(carregarDadosDeExemplo(db, HOJE, { apagar: false }));
		const antes = fotografia(db);
		expect(
			carregarDadosDeExemplo(db, HOJE, { apagar: true }, PLANO_RECUSADO),
		).toEqual({ ok: false, error: { tipo: "Falhou", passo } });
		expect(fotografia(db)).toEqual(antes);
	});
});
