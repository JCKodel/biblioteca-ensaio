import { describe, expect, test } from "vitest";
import {
	dataDeDevolucao,
	devolver,
	diasDeAtraso,
	emprestar,
	mensagens,
	mensagensDaDevolucao,
	podePegarEmprestado,
	textoDaDevolucao,
	textoDoAtraso,
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

describe("devolver", () => {
	const aberto = {
		exemplarId: "e1",
		membroId: "m1",
		emprestadoEm: "2026-10-01",
		devolverEm: "2026-10-22",
		devolvidoEm: null,
	};

	test("devolver encerra um empréstimo aberto com a data de hoje", () => {
		expect(devolver(aberto, "2026-10-15")).toEqual({
			ok: true,
			value: { ...aberto, devolvidoEm: "2026-10-15" },
		});
	});

	test("devolver recusa um empréstimo já devolvido", () => {
		const devolvido = { ...aberto, devolvidoEm: "2026-10-15" };
		expect(devolver(devolvido, "2026-10-16")).toEqual({
			ok: false,
			error: "JaDevolvido",
		});
	});

	test("devolver aceita um empréstimo atrasado e registra o dia em que voltou", () => {
		expect(devolver(aberto, "2026-10-30")).toEqual({
			ok: true,
			value: {
				...aberto,
				devolverEm: "2026-10-22",
				devolvidoEm: "2026-10-30",
			},
		});
	});
});

describe("mensagensDaDevolucao", () => {
	test("mensagensDaDevolucao traz os textos do docs/03, literais", () => {
		expect(mensagensDaDevolucao).toEqual({
			JaDevolvido: "Este empréstimo já foi devolvido.",
			NaoEncontrado: "Este exemplar não está emprestado a este membro.",
			Falhou: "Não foi possível acessar o banco da biblioteca. Tente de novo.",
		});
	});
});

describe("diasDeAtraso", () => {
	test("diasDeAtraso de uma devolução para ontem é 1", () => {
		expect(diasDeAtraso("2026-10-22", "2026-10-23")).toBe(1);
	});

	test("diasDeAtraso conta 19 dias de 13/09 a 02/10", () => {
		expect(diasDeAtraso("2026-09-13", "2026-10-02")).toBe(19);
	});

	test("diasDeAtraso conta dias de calendário atravessando o fim do mês", () => {
		expect(diasDeAtraso("2026-09-30", "2026-10-02")).toBe(2);
	});

	test("diasDeAtraso conta dias de calendário atravessando o fim do ano", () => {
		expect(diasDeAtraso("2026-12-31", "2027-01-02")).toBe(2);
	});
});

describe("textoDoAtraso", () => {
	test("textoDoAtraso escreve um dia no singular", () => {
		expect(textoDoAtraso(1)).toBe("Atrasado há 1 dia");
	});

	test("textoDoAtraso escreve dois ou mais dias no plural", () => {
		expect(textoDoAtraso(2)).toBe("Atrasado há 2 dias");
		expect(textoDoAtraso(19)).toBe("Atrasado há 19 dias");
	});
});
