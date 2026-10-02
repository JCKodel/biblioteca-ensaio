import { describe, expect, test } from "vitest";
import { validarLivro } from "../features/catalogo/regras.ts";
import type { Emprestimo } from "../features/emprestimos/regras.ts";
import { cadastrar } from "../features/membros/regras.ts";
import { somarDias } from "../lib/somarDias.ts";
import {
	type EmprestimoDoPlano,
	emprestimoDoPlano,
	eventosDoPlano,
	LIVROS,
	MEMBROS,
	planejarEmprestimos,
	SUSPENSOS,
	situacaoDoEmprestimo,
} from "./plano.ts";

/** O livro (1 é o primeiro) de cada exemplar (1 é o primeiro), pela ordem de `LIVROS`. */
const LIVRO_DO_EXEMPLAR: number[] = LIVROS.flatMap((livro, indice) =>
	Array.from({ length: livro.exemplares }, () => indice + 1),
);

function exemplaresDoLivro(titulo: string): number[] {
	const livro = LIVROS.findIndex((l) => l.titulo === titulo) + 1;
	return LIVRO_DO_EXEMPLAR.flatMap((l, indice) =>
		l === livro ? [indice + 1] : [],
	);
}

describe("os livros e os membros", () => {
	test("LIVROS tem 30 livros e 60 exemplares: 8 com 3, 14 com 2 e 8 com 1", () => {
		expect(LIVROS).toHaveLength(30);
		expect(LIVRO_DO_EXEMPLAR).toHaveLength(60);
		const com = (n: number) => LIVROS.filter((l) => l.exemplares === n).length;
		expect([com(3), com(2), com(1)]).toEqual([8, 14, 8]);
	});

	test("os exemplares saem em ordem, livro a livro, como o Contrato cita", () => {
		expect(LIVROS[0]?.titulo).toBe("Dom Casmurro");
		expect(exemplaresDoLivro("Dom Casmurro")).toEqual([1, 2, 3]);
		expect(exemplaresDoLivro("O Cortiço")).toEqual([20, 21, 22]);
		expect(exemplaresDoLivro("Os Sertões")).toEqual([26, 27]);
		expect(exemplaresDoLivro("Vidas Secas")).toEqual([34, 35, 36]);
		expect(exemplaresDoLivro("A Hora da Estrela")).toEqual([46, 47, 48]);
		expect(exemplaresDoLivro("Os Lusíadas")).toEqual([51]);
		expect(exemplaresDoLivro("Amor de Perdição")).toEqual([52]);
	});

	test("todo livro de LIVROS passa por validarLivro, com o ano", () => {
		for (const livro of LIVROS) {
			const validado = validarLivro(livro);
			expect(validado.ok, livro.titulo).toBe(true);
			if (validado.ok) expect(validado.value.ano).not.toBeNull();
		}
	});

	test("todo nome de MEMBROS passa por cadastrar, e são 25 nomes diferentes", () => {
		expect(MEMBROS).toHaveLength(25);
		expect(new Set(MEMBROS).size).toBe(25);
		for (const nome of MEMBROS) expect(cadastrar({ nome }).ok, nome).toBe(true);
		expect(MEMBROS[0]).toBe("Ana Beatriz Souza");
		expect(MEMBROS[2]).toBe("Carla Mendes Rocha");
		expect(SUSPENSOS).toEqual([8, 19]);
	});
});

describe("situacaoDoEmprestimo", () => {
	const hoje = "2026-10-02";
	const emprestimo: Emprestimo = {
		exemplarId: "1",
		membroId: "1",
		emprestadoEm: "2026-09-01",
		devolverEm: "2026-09-22",
		devolvidoEm: null,
	};

	test("situacaoDoEmprestimo: devolvido até a data de devolução, inclusive, é DevolvidoNoPrazo", () => {
		expect(
			situacaoDoEmprestimo({ ...emprestimo, devolvidoEm: "2026-09-22" }, hoje),
		).toBe("DevolvidoNoPrazo");
	});

	test("situacaoDoEmprestimo: devolvido depois da data de devolução é DevolvidoComAtraso", () => {
		expect(
			situacaoDoEmprestimo({ ...emprestimo, devolvidoEm: "2026-09-23" }, hoje),
		).toBe("DevolvidoComAtraso");
	});

	test("situacaoDoEmprestimo: aberto com a data de devolução antes de hoje é AbertoAtrasado", () => {
		expect(situacaoDoEmprestimo(emprestimo, hoje)).toBe("AbertoAtrasado");
	});

	test("situacaoDoEmprestimo: aberto com a data de devolução depois de hoje é AbertoNoPrazo", () => {
		expect(
			situacaoDoEmprestimo({ ...emprestimo, devolverEm: "2026-10-03" }, hoje),
		).toBe("AbertoNoPrazo");
	});

	test("situacaoDoEmprestimo: aberto que vence hoje está no prazo", () => {
		expect(
			situacaoDoEmprestimo({ ...emprestimo, devolverEm: hoje }, hoje),
		).toBe("AbertoNoPrazo");
	});
});

describe("eventosDoPlano", () => {
	test("eventosDoPlano põe os eventos em ordem de data, e a devolução antes do empréstimo no mesmo dia", () => {
		const plano: EmprestimoDoPlano[] = [
			{ exemplar: 1, membro: 2, emprestadoHaDias: 5, devolvidoHaDias: null },
			{ exemplar: 1, membro: 1, emprestadoHaDias: 10, devolvidoHaDias: 5 },
		];
		expect(eventosDoPlano(plano, "2026-10-02")).toEqual([
			{ tipo: "Emprestar", em: "2026-09-22", exemplar: 1, membro: 1 },
			{ tipo: "Devolver", em: "2026-09-27", exemplar: 1, membro: 1 },
			{ tipo: "Emprestar", em: "2026-09-27", exemplar: 1, membro: 2 },
		]);
	});

	test("eventosDoPlano mantém a ordem do plano entre eventos do mesmo tipo no mesmo dia", () => {
		const plano: EmprestimoDoPlano[] = [
			{ exemplar: 2, membro: 2, emprestadoHaDias: 3, devolvidoHaDias: null },
			{ exemplar: 1, membro: 1, emprestadoHaDias: 3, devolvidoHaDias: null },
		];
		expect(
			eventosDoPlano(plano, "2026-10-02").map((evento) => evento.exemplar),
		).toEqual([2, 1]);
	});
});

test("planejarEmprestimos duas vezes dá a mesma lista", () => {
	expect(planejarEmprestimos()).toEqual(planejarEmprestimos());
});

describe.each(["2026-10-02", "2028-03-01"])("o plano, com hoje %s", (hoje) => {
	const plano = planejarEmprestimos();
	const emprestimos = plano.map((item) => emprestimoDoPlano(item, hoje));
	const situacoes = emprestimos.map((e) => situacaoDoEmprestimo(e, hoje));
	const quantos = (situacao: string) =>
		situacoes.filter((s) => s === situacao).length;

	test("o plano tem 120 empréstimos: 90 devolvidos no prazo, 18 com atraso, 8 abertos no prazo e 4 abertos atrasados", () => {
		expect(plano).toHaveLength(120);
		expect([
			quantos("DevolvidoNoPrazo"),
			quantos("DevolvidoComAtraso"),
			quantos("AbertoNoPrazo"),
			quantos("AbertoAtrasado"),
		]).toEqual([90, 18, 8, 4]);
	});

	test("emprestadoHaDias vai de 0 a 90, e devolvidoHaDias é null ou de 0 a emprestadoHaDias - 1", () => {
		for (const item of plano) {
			expect(item.emprestadoHaDias).toBeGreaterThanOrEqual(0);
			expect(item.emprestadoHaDias).toBeLessThanOrEqual(90);
			if (item.devolvidoHaDias !== null) {
				expect(item.devolvidoHaDias).toBeGreaterThanOrEqual(0);
				expect(item.devolvidoHaDias).toBeLessThanOrEqual(
					item.emprestadoHaDias - 1,
				);
			}
		}
	});

	test("os abertos atrasados são os exemplares 1 e 20 à matrícula 3, 34 à 12 e 26 à 21, e o 46 à matrícula 5 vence hoje", () => {
		const atrasados = emprestimos
			.filter((_, i) => situacoes[i] === "AbertoAtrasado")
			.map((e) => [Number(e.exemplarId), Number(e.membroId), e.emprestadoEm])
			.sort((a, b) => Number(a[0]) - Number(b[0]));
		expect(atrasados).toEqual([
			[1, 3, somarDias(hoje, -40)],
			[20, 3, somarDias(hoje, -40)],
			[26, 21, somarDias(hoje, -60)],
			[34, 12, somarDias(hoje, -30)],
		]);
		const devolverEm = (exemplar: number) =>
			emprestimos.find(
				(e) => e.exemplarId === String(exemplar) && e.devolvidoEm === null,
			)?.devolverEm;
		expect(devolverEm(1)).toBe(somarDias(hoje, -19));
		expect(devolverEm(34)).toBe(somarDias(hoje, -9));
		expect(devolverEm(26)).toBe(somarDias(hoje, -39));

		const venceHoje = emprestimos.filter(
			(e) => e.devolvidoEm === null && e.devolverEm === hoje,
		);
		expect(venceHoje).toEqual([
			{
				exemplarId: "46",
				membroId: "5",
				emprestadoEm: somarDias(hoje, -21),
				devolverEm: hoje,
				devolvidoEm: null,
			},
		]);
		expect(situacaoDoEmprestimo(venceHoje[0] as Emprestimo, hoje)).toBe(
			"AbertoNoPrazo",
		);
	});

	test("um exemplar nunca tem dois empréstimos ao mesmo tempo, e só o último pode estar aberto", () => {
		for (let exemplar = 1; exemplar <= 60; exemplar++) {
			const dele = emprestimos
				.filter((e) => e.exemplarId === String(exemplar))
				.sort((a, b) => a.emprestadoEm.localeCompare(b.emprestadoEm));
			dele.forEach((atual, i) => {
				const anterior = dele[i - 1];
				if (!anterior) return;
				expect(anterior.devolvidoEm, `exemplar ${exemplar}`).not.toBeNull();
				expect(
					atual.emprestadoEm >= (anterior.devolvidoEm ?? ""),
					`exemplar ${exemplar} em ${atual.emprestadoEm}`,
				).toBe(true);
			});
		}
	});

	test("nenhum membro pega emprestado num dia em que tem um empréstimo aberto vencido", () => {
		for (const novo of emprestimos) {
			const dia = novo.emprestadoEm;
			const vencidos = emprestimos.filter(
				(e) =>
					e.membroId === novo.membroId &&
					e.devolverEm < dia &&
					(e.devolvidoEm === null || e.devolvidoEm > dia),
			);
			expect(vencidos, `matrícula ${novo.membroId} em ${dia}`).toEqual([]);
		}
	});

	test("as matrículas 8 e 19 têm empréstimos, todos devolvidos; 24, 25 e os livros 24, 25 nunca aparecem; os outros, pelo menos uma vez", () => {
		for (const membro of SUSPENSOS) {
			const dele = plano.filter((item) => item.membro === membro);
			expect(dele.length).toBeGreaterThan(0);
			expect(dele.every((item) => item.devolvidoHaDias !== null)).toBe(true);
		}
		const membros = new Set(plano.map((item) => item.membro));
		const livros = new Set(
			plano.map((item) => LIVRO_DO_EXEMPLAR[item.exemplar - 1]),
		);
		for (let n = 1; n <= 25; n++) {
			const nunca = n === 24 || n === 25;
			expect(membros.has(n), `matrícula ${n}`).toBe(!nunca);
		}
		for (let n = 1; n <= 30; n++) {
			const nunca = n === 24 || n === 25;
			expect(livros.has(n), `livro ${n}`).toBe(!nunca);
		}
	});

	test("cada período de 30 dias (0 a 29, 30 a 59, 60 a 90 dias atrás) tem pelo menos 30 empréstimos", () => {
		const periodo = (de: number, ate: number) =>
			plano.filter(
				(item) => item.emprestadoHaDias >= de && item.emprestadoHaDias <= ate,
			).length;
		expect(periodo(0, 29)).toBeGreaterThanOrEqual(30);
		expect(periodo(30, 59)).toBeGreaterThanOrEqual(30);
		expect(periodo(60, 90)).toBeGreaterThanOrEqual(30);
	});
});
