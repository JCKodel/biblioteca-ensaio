import { describe, expect, test } from "vitest";
import { cadastrar, textoDaSituacao } from "./regras.ts";

describe("cadastrar", () => {
	test("cadastrar apara os espaços antes e depois do nome", () => {
		expect(cadastrar({ nome: "  Capitu  " })).toEqual({
			ok: true,
			value: { nome: "Capitu" },
		});
	});

	test("cadastrar recusa um nome vazio", () => {
		expect(cadastrar({ nome: "" })).toEqual({
			ok: false,
			error: "NomeInvalido",
		});
	});

	test("cadastrar recusa um nome só de espaços", () => {
		expect(cadastrar({ nome: "   " })).toEqual({
			ok: false,
			error: "NomeInvalido",
		});
	});

	test("cadastrar recusa um nome com 121 caracteres", () => {
		expect(cadastrar({ nome: "a".repeat(121) })).toEqual({
			ok: false,
			error: "NomeInvalido",
		});
	});

	test("cadastrar aceita um nome com 120 caracteres", () => {
		expect(cadastrar({ nome: "a".repeat(120) })).toEqual({
			ok: true,
			value: { nome: "a".repeat(120) },
		});
	});
});

describe("textoDaSituacao", () => {
	test("textoDaSituacao diz Ativo para um membro não suspenso", () => {
		expect(textoDaSituacao(false)).toBe("Ativo");
	});

	test("textoDaSituacao diz Suspenso para um membro suspenso", () => {
		expect(textoDaSituacao(true)).toBe("Suspenso");
	});
});
