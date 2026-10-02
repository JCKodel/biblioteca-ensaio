import type { DatabaseSync } from "node:sqlite";
import {
	cadastroDeExemplarPedido,
	cadastroDeLivroPedido,
} from "../features/catalogo/eventosDeCatalogo.ts";
import { repositoriosDoCatalogo } from "../features/catalogo/repositorio.server.ts";
import { devolucaoPedida } from "../features/emprestimos/devolucao/eventosDeDevolucao.ts";
import { emprestimoPedido } from "../features/emprestimos/eventosDeEmprestimo.ts";
import {
	repositoriosDeDevolucao,
	repositoriosDeEmprestimo,
} from "../features/emprestimos/repositorio.server.ts";
import {
	cadastroDeMembroPedido,
	suspensaoPedida,
} from "../features/membros/eventosDeMembros.ts";
import { repositoriosDeMembros } from "../features/membros/repositorio.server.ts";
import type { BancoDeDadosFalhou } from "../lib/consultar.server.ts";
import { err, ok, type Result } from "../lib/result.ts";
import {
	type EmprestimoDoPlano,
	eventosDoPlano,
	LIVROS,
	MEMBROS,
	planejarEmprestimos,
	SUSPENSOS,
} from "./plano.ts";
import {
	apagarTabelas,
	type Contagem,
	comecarTransacao,
	confirmarTransacao,
	contarCarga,
	contarTabelas,
	desfazerTransacao,
	type Tabelas,
} from "./repositorio.server.ts";

export type { Contagem, Tabelas };

export type DadosDeExemploCarregados = {
	apagado: Tabelas | null;
	carregado: Contagem;
};

export type DadosDeExemploNaoCarregados =
	| { tipo: "JaTemDados"; havia: Tabelas }
	| { tipo: "Falhou"; passo: string };

/** O estado que um orquestrador publica quando não é o que a carga espera. */
type Estado =
	| { tipo: "Recusado"; recusa: string }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

function bancoFalhou(excecao: BancoDeDadosFalhou): string {
	return `o banco falhou (${excecao.mensagem})`;
}

/**
 * O passo que parou a carga: o evento, com o seu artigo, e o motivo. "o
 * empréstimo do exemplar 12 à matrícula 5 em 2026-08-01 foi recusado
 * (TemLivrosEmAtraso)", ou "o banco falhou (database is locked) no empréstimo
 * do exemplar 12 à matrícula 5 em 2026-08-01".
 */
function parou(
	artigo: "o" | "a",
	evento: string,
	estado: Estado,
): Result<never, DadosDeExemploNaoCarregados> {
	const passo =
		estado.tipo === "Recusado"
			? `${artigo} ${evento} foi ${artigo === "o" ? "recusado" : "recusada"} (${estado.recusa})`
			: `${bancoFalhou(estado.excecao)} ${artigo === "o" ? "no" : "na"} ${evento}`;
	return err({ tipo: "Falhou", passo });
}

/**
 * Reproduz a história do plano pelos orquestradores, numa transação: os
 * livros, os exemplares, os membros, os empréstimos e as devoluções em ordem
 * de data, e as suspensões por último. Um banco com dados é recusado, a não
 * ser com `apagar`. Qualquer recusa ou falha desfaz tudo, inclusive o que o
 * `apagar` apagou. As contagens vêm do banco, com `hoje`, depois da carga.
 */
export function carregarDadosDeExemplo(
	db: DatabaseSync,
	hoje: string,
	opcoes: { apagar: boolean },
	plano: EmprestimoDoPlano[] = planejarEmprestimos(),
): Result<DadosDeExemploCarregados, DadosDeExemploNaoCarregados> {
	const comecou = comecarTransacao(db);
	if (!comecou.ok)
		return err({ tipo: "Falhou", passo: bancoFalhou(comecou.error) });

	const resultado = carregarNaTransacao(db, hoje, opcoes, plano);
	if (!resultado.ok) {
		desfazerTransacao(db);
		return resultado;
	}
	const confirmou = confirmarTransacao(db);
	if (!confirmou.ok) {
		desfazerTransacao(db);
		return err({ tipo: "Falhou", passo: bancoFalhou(confirmou.error) });
	}
	return resultado;
}

function carregarNaTransacao(
	db: DatabaseSync,
	hoje: string,
	opcoes: { apagar: boolean },
	plano: EmprestimoDoPlano[],
): Result<DadosDeExemploCarregados, DadosDeExemploNaoCarregados> {
	const havia = contarTabelas(db);
	if (!havia.ok)
		return err({ tipo: "Falhou", passo: bancoFalhou(havia.error) });
	const temDados = Object.values(havia.value).some((n) => n > 0);
	if (temDados && !opcoes.apagar)
		return err({ tipo: "JaTemDados", havia: { ...havia.value } });
	if (temDados) {
		const apagou = apagarTabelas(db);
		if (!apagou.ok)
			return err({ tipo: "Falhou", passo: bancoFalhou(apagou.error) });
	}

	const catalogo = repositoriosDoCatalogo(db);
	const membros = repositoriosDeMembros(db);

	const livros: string[] = [];
	for (const [indice, livro] of LIVROS.entries()) {
		const { titulo, autor, ano } = livro;
		const estado = cadastroDeLivroPedido({ titulo, autor, ano }, catalogo);
		if (estado.tipo !== "Cadastrado")
			return parou("o", `cadastro do livro ${indice + 1} (${titulo})`, estado);
		livros.push(estado.livro.id);
	}

	const exemplares: string[] = [];
	for (const [indice, livro] of LIVROS.entries()) {
		const livroId = livros[indice] ?? "";
		for (let n = 0; n < livro.exemplares; n++) {
			const estado = cadastroDeExemplarPedido({ livroId }, catalogo);
			if (estado.tipo !== "Cadastrado")
				return parou(
					"o",
					`cadastro de um exemplar do livro ${livroId}`,
					estado,
				);
			exemplares.push(estado.exemplar.id);
		}
	}

	const matriculas: string[] = [];
	for (const [indice, nome] of MEMBROS.entries()) {
		const estado = cadastroDeMembroPedido({ nome }, membros);
		if (estado.tipo !== "Cadastrado")
			return parou("o", `cadastro do membro ${indice + 1} (${nome})`, estado);
		matriculas.push(estado.membro.id);
	}

	const devolucao = repositoriosDeDevolucao(db);
	for (const evento of eventosDoPlano(plano, hoje)) {
		const pedido = {
			exemplarId: exemplares[evento.exemplar - 1] ?? "",
			membroId: matriculas[evento.membro - 1] ?? "",
		};
		if (evento.tipo === "Emprestar") {
			const estado = emprestimoPedido(
				pedido,
				evento.em,
				repositoriosDeEmprestimo(db, evento.em),
			);
			if (estado.tipo !== "Emprestado")
				return parou(
					"o",
					`empréstimo do exemplar ${pedido.exemplarId} à matrícula ${pedido.membroId} em ${evento.em}`,
					estado,
				);
		} else {
			const estado = devolucaoPedida(pedido, evento.em, devolucao);
			if (estado.tipo !== "Devolvido")
				return parou(
					"a",
					`devolução do exemplar ${pedido.exemplarId} pela matrícula ${pedido.membroId} em ${evento.em}`,
					estado,
				);
		}
	}

	for (const suspenso of SUSPENSOS) {
		const membroId = matriculas[suspenso - 1] ?? "";
		const estado = suspensaoPedida({ membroId, suspenso: true }, membros);
		if (estado.tipo !== "Alterado")
			return parou("a", `suspensão da matrícula ${membroId}`, estado);
	}

	const carregado = contarCarga(db, hoje);
	if (!carregado.ok)
		return err({ tipo: "Falhou", passo: bancoFalhou(carregado.error) });
	return ok({
		apagado: temDados ? { ...havia.value } : null,
		carregado: { ...carregado.value },
	});
}
