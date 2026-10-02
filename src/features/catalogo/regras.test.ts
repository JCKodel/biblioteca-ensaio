import { describe, expect, test } from "vitest";
import { textoDeExemplares, validarLivro } from "./regras.ts";

const valido = { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: "" };

describe("validarLivro", () => {
	test("validarLivro apara os espaços antes e depois de título, autor e ano", () => {
		expect(
			validarLivro({
				titulo: "  Dom Casmurro ",
				autor: " Machado de Assis  ",
				ano: " 1899 ",
			}),
		).toEqual({
			ok: true,
			value: { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: 1899 },
		});
	});

	test("validarLivro recusa um título vazio", () => {
		expect(validarLivro({ ...valido, titulo: "" })).toEqual({
			ok: false,
			error: "TituloInvalido",
		});
	});

	test("validarLivro recusa um título só de espaços", () => {
		expect(validarLivro({ ...valido, titulo: "   " })).toEqual({
			ok: false,
			error: "TituloInvalido",
		});
	});

	test("validarLivro recusa um título com 201 caracteres", () => {
		expect(validarLivro({ ...valido, titulo: "a".repeat(201) })).toEqual({
			ok: false,
			error: "TituloInvalido",
		});
	});

	test("validarLivro aceita um título com 200 caracteres", () => {
		const resultado = validarLivro({ ...valido, titulo: "a".repeat(200) });
		expect(resultado.ok).toBe(true);
	});

	test("validarLivro recusa um autor vazio", () => {
		expect(validarLivro({ ...valido, autor: "" })).toEqual({
			ok: false,
			error: "AutorInvalido",
		});
	});

	test("validarLivro recusa um autor só de espaços", () => {
		expect(validarLivro({ ...valido, autor: "   " })).toEqual({
			ok: false,
			error: "AutorInvalido",
		});
	});

	test("validarLivro recusa um autor com 201 caracteres", () => {
		expect(validarLivro({ ...valido, autor: "a".repeat(201) })).toEqual({
			ok: false,
			error: "AutorInvalido",
		});
	});

	test("validarLivro aceita um autor com 200 caracteres", () => {
		const resultado = validarLivro({ ...valido, autor: "a".repeat(200) });
		expect(resultado.ok).toBe(true);
	});

	test("validarLivro recusa pelo título quando título e autor estão errados", () => {
		expect(validarLivro({ titulo: "", autor: "", ano: "abc" })).toEqual({
			ok: false,
			error: "TituloInvalido",
		});
	});

	test("validarLivro lê um ano em branco como sem ano", () => {
		expect(validarLivro({ ...valido, ano: "  " })).toEqual({
			ok: true,
			value: { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: null },
		});
	});

	test.each(["abc", "0", "12345"])("validarLivro recusa o ano %j", (ano) => {
		expect(validarLivro({ ...valido, ano })).toEqual({
			ok: false,
			error: "AnoInvalido",
		});
	});

	test("validarLivro aceita o ano 1899", () => {
		expect(validarLivro({ ...valido, ano: "1899" })).toEqual({
			ok: true,
			value: { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: 1899 },
		});
	});
});

describe("textoDeExemplares", () => {
	test("textoDeExemplares diz nenhum exemplar para 0", () => {
		expect(textoDeExemplares(0)).toBe("nenhum exemplar");
	});

	test("textoDeExemplares diz 1 exemplar para 1", () => {
		expect(textoDeExemplares(1)).toBe("1 exemplar");
	});

	test("textoDeExemplares diz 2 exemplares para 2", () => {
		expect(textoDeExemplares(2)).toBe("2 exemplares");
	});
});
