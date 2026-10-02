import { describe, expect, test } from "vitest";
import {
	dataDeDevolucao,
	emprestar,
	mensagens,
	podePegarEmprestado,
	textoDaDevolucao,
} from "./regras.ts";

describe("emprestar", () => {
	const exemplar = { id: "e1", livroId: "l1" };
	const membro = { id: "m1", emAtraso: 0, suspenso: false };

	test("emprestar recusa um membro com um livro atrasado", () => {
		const resultado = emprestar(
			exemplar,
			{ ...membro, emAtraso: 1 },
			"2026-10-01",
		);
		expect(resultado).toEqual({ ok: false, error: "TemLivrosEmAtraso" });
	});

	test("emprestar empresta por 21 dias a um membro sem nada atrasado", () => {
		const resultado = emprestar(exemplar, membro, "2026-10-01");
		expect(resultado.ok && resultado.value.devolverEm).toBe("2026-10-22");
		expect(resultado).toEqual({
			ok: true,
			value: {
				exemplarId: "e1",
				membroId: "m1",
				emprestadoEm: "2026-10-01",
				devolverEm: "2026-10-22",
				devolvidoEm: null,
			},
		});
	});

	test("emprestar recusa um membro suspenso", () => {
		const resultado = emprestar(
			exemplar,
			{ ...membro, suspenso: true },
			"2026-10-01",
		);
		expect(resultado).toEqual({ ok: false, error: "MembroSuspenso" });
	});

	test("emprestar recusa pela suspensão um membro suspenso e atrasado", () => {
		const resultado = emprestar(
			exemplar,
			{ ...membro, emAtraso: 2, suspenso: true },
			"2026-10-01",
		);
		expect(resultado).toEqual({ ok: false, error: "MembroSuspenso" });
	});
});

describe("podePegarEmprestado", () => {
	const membro = { id: "m1", emAtraso: 0, suspenso: false };

	test("podePegarEmprestado devolve o membro sem nada atrasado e ativo", () => {
		expect(podePegarEmprestado(membro)).toEqual({ ok: true, value: membro });
	});

	test("podePegarEmprestado recusa um membro com um livro atrasado", () => {
		expect(podePegarEmprestado({ ...membro, emAtraso: 1 })).toEqual({
			ok: false,
			error: "TemLivrosEmAtraso",
		});
	});

	test("podePegarEmprestado recusa um membro suspenso", () => {
		expect(podePegarEmprestado({ ...membro, suspenso: true })).toEqual({
			ok: false,
			error: "MembroSuspenso",
		});
	});
});

describe("dataDeDevolucao", () => {
	test("dataDeDevolucao soma o prazo de empréstimo atravessando o fim do mês", () => {
		expect(dataDeDevolucao("2026-10-20")).toBe("2026-11-10");
	});

	test("dataDeDevolucao soma o prazo de empréstimo atravessando o fim do ano", () => {
		expect(dataDeDevolucao("2026-12-20")).toBe("2027-01-10");
	});
});

describe("textoDaDevolucao", () => {
	test("textoDaDevolucao escreve a data de devolução no formato do balcão", () => {
		expect(textoDaDevolucao("2026-10-22")).toBe("Devolver até 22/10/2026");
	});
});

describe("mensagens", () => {
	test("mensagens traz os textos do docs/03, literais", () => {
		expect(mensagens).toEqual({
			TemLivrosEmAtraso: "Devolva primeiro os seus livros atrasados.",
			JaEmprestado: "Este exemplar acabou de ser emprestado a outra pessoa.",
			MembroSuspenso: "A sua matrícula está suspensa.",
			NaoEncontrado: "Este membro ou este exemplar não está cadastrado.",
			Falhou: "Não foi possível acessar o banco da biblioteca. Tente de novo.",
		});
	});
});
