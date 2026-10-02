import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../banco.server.ts";
import {
	buscarLivro,
	inserirExemplar,
	inserirLivro,
	listarLivros,
} from "./repositorio.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const MIGRACOES = fileURLToPath(new URL("../../../migracoes", import.meta.url));

function bancoNovo(): DatabaseSync {
	const db = new DatabaseSync(":memory:");
	aplicarMigracoes(db, lerMigracoes(MIGRACOES));
	return db;
}

const DOM_CASMURRO = {
	titulo: "Dom Casmurro",
	autor: "Machado de Assis",
	ano: 1899,
};
const IRACEMA = { titulo: "Iracema", autor: "José de Alencar", ano: null };

function inserido(
	db: DatabaseSync,
	dados: typeof DOM_CASMURRO | typeof IRACEMA,
) {
	const resultado = inserirLivro(db, dados);
	if (!resultado.ok) throw new Error(resultado.error.mensagem);
	return resultado.value;
}

describe("repositório do catálogo", () => {
	test("inserirLivro devolve o livro com um id string", () => {
		const resultado = inserirLivro(bancoNovo(), DOM_CASMURRO);
		expect(resultado).toEqual({
			ok: true,
			value: { id: expect.any(String), ...DOM_CASMURRO },
		});
	});

	test("listarLivros devolve o mais recente primeiro, com o total de exemplares de cada um", () => {
		const db = bancoNovo();
		const antigo = inserido(db, DOM_CASMURRO);
		const recente = inserido(db, IRACEMA);
		inserirExemplar(db, antigo.id);
		inserirExemplar(db, antigo.id);
		expect(listarLivros(db)).toEqual({
			ok: true,
			value: [
				{ ...recente, totalDeExemplares: 0 },
				{ ...antigo, totalDeExemplares: 2 },
			],
		});
	});

	test("buscarLivro devolve o livro de um id existente", () => {
		const db = bancoNovo();
		const livro = inserido(db, IRACEMA);
		expect(buscarLivro(db, livro.id)).toEqual({ ok: true, value: livro });
	});

	test("buscarLivro de um id inexistente devolve NaoEncontrado", () => {
		expect(buscarLivro(bancoNovo(), "999")).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
	});

	test("inserirExemplar devolve o exemplar com ids string", () => {
		const db = bancoNovo();
		const livro = inserido(db, IRACEMA);
		expect(inserirExemplar(db, livro.id)).toEqual({
			ok: true,
			value: { id: expect.any(String), livroId: livro.id },
		});
	});

	test("inserirExemplar em um livro inexistente devolve BancoDeDadosFalhou pela chave estrangeira", () => {
		expect(inserirExemplar(bancoNovo(), "999")).toEqual({
			ok: false,
			error: {
				codigo: "BancoDeDadosFalhou",
				mensagem: expect.stringMatching(/FOREIGN KEY/),
			},
		});
	});

	test("com o banco fechado, consultar devolve BancoDeDadosFalhou em vez de lançar", () => {
		const db = bancoNovo();
		db.close();
		expect(listarLivros(db)).toEqual({
			ok: false,
			error: { codigo: "BancoDeDadosFalhou", mensagem: expect.any(String) },
		});
	});
});
