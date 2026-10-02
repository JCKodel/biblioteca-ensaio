import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { aplicarMigracoes, lerMigracoes } from "../../banco.server.ts";
import {
	definirSuspenso,
	inserirMembro,
	listarMembros,
} from "./repositorio.server.ts";

vi.spyOn(console, "log").mockImplementation(() => {});

const MIGRACOES = fileURLToPath(new URL("../../../migracoes", import.meta.url));

function bancoNovo(): DatabaseSync {
	const db = new DatabaseSync(":memory:");
	aplicarMigracoes(db, lerMigracoes(MIGRACOES));
	return db;
}

function inserido(db: DatabaseSync, nome: string) {
	const resultado = inserirMembro(db, { nome });
	if (!resultado.ok) throw new Error(resultado.error.mensagem);
	return resultado.value;
}

describe("repositório dos membros", () => {
	test("inserirMembro devolve o membro com um id string e suspenso falso", () => {
		expect(inserirMembro(bancoNovo(), { nome: "Capitu" })).toEqual({
			ok: true,
			value: { id: expect.any(String), nome: "Capitu", suspenso: false },
		});
	});

	test("listarMembros devolve o mais recente primeiro, com suspenso booleano", () => {
		const db = bancoNovo();
		const antigo = inserido(db, "Capitu");
		const recente = inserido(db, "Bentinho");
		definirSuspenso(db, antigo.id, true);
		expect(listarMembros(db)).toEqual({
			ok: true,
			value: [
				{ ...recente, suspenso: false },
				{ ...antigo, suspenso: true },
			],
		});
	});

	test("definirSuspenso suspende e reativa um membro", () => {
		const db = bancoNovo();
		const membro = inserido(db, "Capitu");
		expect(definirSuspenso(db, membro.id, true)).toEqual({
			ok: true,
			value: { ...membro, suspenso: true },
		});
		expect(definirSuspenso(db, membro.id, false)).toEqual({
			ok: true,
			value: { ...membro, suspenso: false },
		});
	});

	test("definirSuspenso gravando o mesmo valor duas vezes devolve o membro", () => {
		const db = bancoNovo();
		const membro = inserido(db, "Capitu");
		definirSuspenso(db, membro.id, true);
		expect(definirSuspenso(db, membro.id, true)).toEqual({
			ok: true,
			value: { ...membro, suspenso: true },
		});
	});

	test("definirSuspenso de um id inexistente devolve NaoEncontrado", () => {
		expect(definirSuspenso(bancoNovo(), "999", true)).toEqual({
			ok: false,
			error: "NaoEncontrado",
		});
	});

	test("com o banco fechado, definirSuspenso devolve BancoDeDadosFalhou em vez de lançar", () => {
		const db = bancoNovo();
		const membro = inserido(db, "Capitu");
		db.close();
		expect(definirSuspenso(db, membro.id, true)).toEqual({
			ok: false,
			error: { codigo: "BancoDeDadosFalhou", mensagem: expect.any(String) },
		});
	});

	test("com o banco fechado, inserirMembro e listarMembros devolvem BancoDeDadosFalhou", () => {
		const db = bancoNovo();
		db.close();
		const falha = {
			ok: false,
			error: { codigo: "BancoDeDadosFalhou", mensagem: expect.any(String) },
		};
		expect(inserirMembro(db, { nome: "Capitu" })).toEqual(falha);
		expect(listarMembros(db)).toEqual(falha);
	});
});
