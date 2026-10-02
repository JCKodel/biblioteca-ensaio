import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import {
	abrirBanco,
	aplicarMigracoes,
	lerMigracoes,
	type Migracao,
} from "./banco.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

function pastaCom(arquivos: Record<string, string>): string {
	const pasta = mkdtempSync(join(tmpdir(), "migracoes-"));
	for (const [nome, sql] of Object.entries(arquivos)) {
		writeFileSync(join(pasta, nome), sql);
	}
	return pasta;
}

function versao(db: DatabaseSync): number {
	const linha = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	return linha.user_version;
}

function migracao(numero: number, sql: string): Migracao {
	return { numero, nome: `${String(numero).padStart(4, "0")}-m.sql`, sql };
}

describe("lerMigracoes", () => {
	test("lerMigracoes lê os arquivos em ordem numérica e ignora o que não é .sql", () => {
		const pasta = pastaCom({
			"0002-segunda.sql": "SELECT 2;",
			"0001-primeira.sql": "SELECT 1;",
			".gitkeep": "",
		});
		expect(lerMigracoes(pasta)).toEqual([
			{ numero: 1, nome: "0001-primeira.sql", sql: "SELECT 1;" },
			{ numero: 2, nome: "0002-segunda.sql", sql: "SELECT 2;" },
		]);
	});

	test("lerMigracoes recusa dois arquivos com o mesmo número, nomeando os dois", () => {
		const pasta = pastaCom({ "0001-a.sql": "", "0001-b.sql": "" });
		expect(() => lerMigracoes(pasta)).toThrow(/0001-a\.sql.*0001-b\.sql/);
	});

	test("lerMigracoes recusa um número faltando na sequência, nomeando os arquivos em volta", () => {
		const pasta = pastaCom({ "0001-a.sql": "", "0003-c.sql": "" });
		expect(() => lerMigracoes(pasta)).toThrow(/0002.*0001-a\.sql.*0003-c\.sql/);
	});

	test("lerMigracoes recusa uma sequência que não começa em 0001", () => {
		const pasta = pastaCom({ "0002-b.sql": "" });
		expect(() => lerMigracoes(pasta)).toThrow(/0001.*0002-b\.sql/);
	});

	test("lerMigracoes recusa um .sql fora do formato NNNN-descricao.sql", () => {
		const pasta = pastaCom({ "1-a.sql": "" });
		expect(() => lerMigracoes(pasta)).toThrow(/1-a\.sql/);
	});

	test("lerMigracoes devolve nenhuma migração para uma pasta só com .gitkeep", () => {
		expect(lerMigracoes(pastaCom({ ".gitkeep": "" }))).toEqual([]);
	});
});

describe("aplicarMigracoes", () => {
	test("aplicarMigracoes aplica as pendentes em ordem e anota a última no user_version", () => {
		const db = new DatabaseSync(":memory:");
		const aplicadas = aplicarMigracoes(db, [
			migracao(1, "CREATE TABLE livro (titulo TEXT);"),
			migracao(2, "INSERT INTO livro VALUES ('Dom Casmurro');"),
		]);
		expect(aplicadas).toEqual(["0001-m.sql", "0002-m.sql"]);
		expect(versao(db)).toBe(2);
		expect(db.prepare("SELECT titulo FROM livro").all()).toEqual([
			{ titulo: "Dom Casmurro" },
		]);
	});

	test("aplicarMigracoes não reaplica uma migração já aplicada", () => {
		const db = new DatabaseSync(":memory:");
		const migracoes = [migracao(1, "CREATE TABLE livro (titulo TEXT);")];
		aplicarMigracoes(db, migracoes);
		expect(aplicarMigracoes(db, migracoes)).toEqual([]);
		expect(versao(db)).toBe(1);
	});

	test("aplicarMigracoes deixa o user_version em 0 sem nenhuma migração", () => {
		const db = new DatabaseSync(":memory:");
		expect(aplicarMigracoes(db, [])).toEqual([]);
		expect(versao(db)).toBe(0);
	});

	test("uma migração com erro não fica gravada no banco", () => {
		const arquivo = join(mkdtempSync(join(tmpdir(), "banco-")), "b.sqlite");
		const db = new DatabaseSync(arquivo);
		expect(() =>
			aplicarMigracoes(db, [
				migracao(1, "CREATE TABLE livro (titulo TEXT);"),
				migracao(
					2,
					"CREATE TABLE membro (nome TEXT); INSERT INTO nada VALUES (1);",
				),
			]),
		).toThrow(/nada/);
		db.close();

		const reaberto = new DatabaseSync(arquivo);
		expect(versao(reaberto)).toBe(1);
		expect(
			reaberto
				.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
				.all(),
		).toEqual([{ name: "livro" }]);
	});
});

describe("abrirBanco", () => {
	test("abrirBanco com :memory: aplica as três migrações de migracoes/", () => {
		const raiz = fileURLToPath(new URL("..", import.meta.url));
		const db = abrirBanco(raiz, ":memory:");
		expect(versao(db)).toBe(3);
		expect(
			db
				.prepare(
					"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
				)
				.all(),
		).toEqual([
			{ name: "emprestimo" },
			{ name: "exemplar" },
			{ name: "livro" },
			{ name: "membro" },
		]);
	});
});
