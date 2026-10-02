import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

export type Migracao = { numero: number; nome: string; sql: string };

const FORMATO = /^(\d{4})-.+\.sql$/;

function formato(numero: number): string {
	return String(numero).padStart(4, "0");
}

/**
 * Lê `migracoes/NNNN-descricao.sql` em ordem numérica. Números repetidos, um
 * buraco na sequência ou um .sql fora do formato impedem a partida: é um bug
 * de quem escreveu a migração, então lança, nomeando os arquivos.
 */
export function lerMigracoes(pasta: string): Migracao[] {
	const nomes = readdirSync(pasta)
		.filter((nome) => nome.endsWith(".sql"))
		.sort();

	const migracoes = nomes.map((nome) => {
		const encontrado = FORMATO.exec(nome);
		if (!encontrado?.[1]) {
			throw new Error(
				`Migração fora do formato NNNN-descricao.sql: ${nome} (em ${pasta})`,
			);
		}
		return {
			numero: Number(encontrado[1]),
			nome,
			sql: readFileSync(join(pasta, nome), "utf8"),
		};
	});

	migracoes.forEach((atual, indice) => {
		const anterior = migracoes[indice - 1];
		const esperado = indice + 1;
		if (anterior && anterior.numero === atual.numero) {
			throw new Error(
				`Duas migrações com o número ${formato(atual.numero)}: ${anterior.nome} e ${atual.nome}`,
			);
		}
		if (atual.numero !== esperado) {
			const entre = anterior
				? `entre ${anterior.nome} e ${atual.nome}`
				: `antes de ${atual.nome}`;
			throw new Error(`Falta a migração ${formato(esperado)} ${entre}`);
		}
	});

	return migracoes;
}

/**
 * Aplica, em ordem, as migrações com número acima do `PRAGMA user_version`,
 * cada uma numa transação com a sua anotação. Escreve o nome de cada uma
 * antes de rodá-la e devolve os nomes das aplicadas. Não captura exceções:
 * uma migração com erro derruba o processo e o SQLite desfaz a transação.
 */
export function aplicarMigracoes(
	db: DatabaseSync,
	migracoes: Migracao[],
): string[] {
	const { user_version: atual } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	const aplicadas: string[] = [];
	for (const migracao of migracoes) {
		if (migracao.numero <= atual) continue;
		console.log(`migração ${migracao.nome}`);
		db.exec("BEGIN");
		db.exec(migracao.sql);
		db.exec(`PRAGMA user_version = ${migracao.numero}`);
		db.exec("COMMIT");
		aplicadas.push(migracao.nome);
	}
	return aplicadas;
}
