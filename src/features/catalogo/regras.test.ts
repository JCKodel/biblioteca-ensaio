import { describe, expect, test } from "vitest";
import {
	buscarNoCatalogo,
	type LivroDoCatalogo,
	textoDeExemplares,
	validarLivro,
} from "./regras.ts";

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

function livro(
	id: string,
	titulo: string,
	autor: string,
	ano: number | null = null,
): LivroDoCatalogo {
	return { id, titulo, autor, ano, totalDeExemplares: 1 };
}

const domCasmurro = livro("1", "Dom Casmurro", "Machado de Assis", 1899);
const memorias = livro(
	"2",
	"Memórias Póstumas de Brás Cubas",
	"Machado de Assis",
);
const iracema = livro("5", "Iracema", "José de Alencar");
const primoBasilio = livro("21", "O Primo Basílio", "Eça de Queirós");
const vidasSecas = livro("19", "Vidas Secas", "Graciliano Ramos");
const catalogo = [vidasSecas, primoBasilio, iracema, memorias, domCasmurro];

function titulos(livros: LivroDoCatalogo[]): string[] {
	return livros.map((l) => l.titulo);
}

describe("buscarNoCatalogo", () => {
	test("buscarNoCatalogo acha por trecho do título", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "cubas"))).toEqual([
			"Memórias Póstumas de Brás Cubas",
		]);
	});

	test("buscarNoCatalogo acha por trecho do autor", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "assis"))).toEqual([
			"Memórias Póstumas de Brás Cubas",
			"Dom Casmurro",
		]);
	});

	test("buscarNoCatalogo ignora maiúsculas", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "IRACEMA"))).toEqual(["Iracema"]);
	});

	test("buscarNoCatalogo ignora acentos nos dois lados", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "memorias"))).toEqual([
			"Memórias Póstumas de Brás Cubas",
		]);
		expect(titulos(buscarNoCatalogo(catalogo, "MEMÓRIAS"))).toEqual([
			"Memórias Póstumas de Brás Cubas",
		]);
		expect(titulos(buscarNoCatalogo(catalogo, "eca de"))).toEqual([
			"O Primo Basílio",
		]);
		expect(titulos(buscarNoCatalogo(catalogo, "eca"))).toEqual([
			"Vidas Secas",
			"O Primo Basílio",
		]);
	});

	test("buscarNoCatalogo apara a busca", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "  iracema "))).toEqual([
			"Iracema",
		]);
	});

	test("buscarNoCatalogo com a busca vazia ou só com espaços devolve a lista inteira", () => {
		expect(buscarNoCatalogo(catalogo, "")).toEqual(catalogo);
		expect(buscarNoCatalogo(catalogo, "   ")).toEqual(catalogo);
	});

	test("buscarNoCatalogo devolve [] quando nada combina", () => {
		expect(buscarNoCatalogo(catalogo, "machado assis")).toEqual([]);
	});

	test("buscarNoCatalogo mantém a ordem da lista", () => {
		expect(titulos(buscarNoCatalogo(catalogo, "de"))).toEqual([
			"O Primo Basílio",
			"Iracema",
			"Memórias Póstumas de Brás Cubas",
			"Dom Casmurro",
		]);
	});

	test("buscarNoCatalogo mostra uma vez o livro que combina por título e autor", () => {
		const iracemaDeIracema = livro("9", "Iracema", "Iracema Lima");
		expect(buscarNoCatalogo([iracemaDeIracema], "iracema")).toEqual([
			iracemaDeIracema,
		]);
	});

	test("buscarNoCatalogo não busca pelo ano", () => {
		expect(buscarNoCatalogo(catalogo, "1899")).toEqual([]);
	});
});
