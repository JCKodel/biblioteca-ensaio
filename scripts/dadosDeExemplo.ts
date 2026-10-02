import { fileURLToPath } from "node:url";
import { abrirBanco } from "../src/banco.server.ts";
import { carregarDadosDeExemplo } from "../src/dadosDeExemplo/carregar.server.ts";
import { dataLocal } from "../src/lib/dataLocal.ts";

// A segunda raiz de composição, ao lado de src/iniciar.server.ts: confere os
// argumentos, abre sempre o banco do `npm run dev` (ignora BANCO e
// PORTA_DO_SERVIDOR), lê `hoje` uma vez, chama a carga, escreve e sai.
// `npm run dados-de-exemplo` e `npm run dados-de-exemplo:apagar` (docs/05 §5).

const BANCO = "data/biblioteca.sqlite";
const APAGAR = "--apagar";

function tabelas(t: {
	livros: number;
	exemplares: number;
	membros: number;
	emprestimos: number;
}): string {
	return `livros: ${t.livros}, exemplares: ${t.exemplares}, membros: ${t.membros}, empréstimos: ${t.emprestimos}`;
}

const argumentos = process.argv.slice(2);
const desconhecido = argumentos.find((argumento) => argumento !== APAGAR);
if (desconhecido !== undefined) {
	console.error(
		`Argumento desconhecido: ${desconhecido}. Use npm run dados-de-exemplo, ou npm run dados-de-exemplo:apagar para apagar tudo antes de carregar.`,
	);
	process.exit(1);
}

const raiz = fileURLToPath(new URL("..", import.meta.url));
const db = abrirBanco(raiz, BANCO);
const hoje = dataLocal();
const resultado = carregarDadosDeExemplo(db, hoje, {
	apagar: argumentos.includes(APAGAR),
});
db.close();

if (resultado.ok) {
	const { apagado, carregado: c } = resultado.value;
	if (apagado) console.log(`Apagado o que havia (${tabelas(apagado)}).`);
	console.log(`Dados de exemplo carregados em ${BANCO}, com hoje ${hoje}.`);
	console.log(`${c.livros} livros e ${c.exemplares} exemplares.`);
	console.log(`${c.membros} membros, ${c.suspensos} suspensos.`);
	const devolvidos = c.devolvidosNoPrazo + c.devolvidosComAtraso;
	const abertos = c.abertosNoPrazo + c.abertosAtrasados;
	console.log(
		`${c.emprestimos} empréstimos: ${devolvidos} devolvidos (${c.devolvidosNoPrazo} no prazo, ${c.devolvidosComAtraso} com atraso) e ${abertos} abertos (${c.abertosNoPrazo} no prazo, ${c.abertosAtrasados} atrasados).`,
	);
} else if (resultado.error.tipo === "JaTemDados") {
	console.error(
		`O banco ${BANCO} já tem dados (${tabelas(resultado.error.havia)}). Nada foi mudado.`,
	);
	console.error(
		"Para apagar tudo e carregar os dados de exemplo: npm run dados-de-exemplo:apagar",
	);
	process.exitCode = 1;
} else {
	console.error(
		`Os dados de exemplo não foram carregados, e nada foi mudado: ${resultado.error.passo}.`,
	);
	process.exitCode = 1;
}
