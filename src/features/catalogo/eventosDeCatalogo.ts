import {
	type CadastroDeExemplarPedido,
	type CadastroDeLivroPedido,
	type Exemplar,
	type Livro,
	type RecusaDeLivro,
	validarLivro,
} from "./regras.ts";
import type {
	BancoDeDadosFalhou,
	RepositoriosDoCatalogo,
} from "./repositorio.server.ts";

export type EstadoDoCadastroDeLivro =
	| { tipo: "Cadastrado"; livro: Livro }
	| { tipo: "Recusado"; recusa: RecusaDeLivro }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type EstadoDoCadastroDeExemplar =
	| { tipo: "Cadastrado"; exemplar: Exemplar }
	| { tipo: "Recusado"; recusa: "NaoEncontrado" }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

// As recusas são strings e a exceção é um objeto com `codigo` (capítulo 7).
function estadoDe<R extends string>(
	erro: R | BancoDeDadosFalhou,
):
	| { tipo: "Recusado"; recusa: R }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou } {
	if (typeof erro === "string") return { tipo: "Recusado", recusa: erro };
	return { tipo: "Falhou", excecao: erro };
}

export function cadastroDeLivroPedido(
	evento: CadastroDeLivroPedido,
	repositorios: RepositoriosDoCatalogo,
): EstadoDoCadastroDeLivro {
	const dados = validarLivro(evento);
	if (!dados.ok) return estadoDe(dados.error);
	const salvo = repositorios.inserirLivro(dados.value);
	if (!salvo.ok) return { tipo: "Falhou", excecao: salvo.error };
	return { tipo: "Cadastrado", livro: salvo.value };
}

export function cadastroDeExemplarPedido(
	evento: CadastroDeExemplarPedido,
	repositorios: RepositoriosDoCatalogo,
): EstadoDoCadastroDeExemplar {
	const livro = repositorios.buscarLivro(evento.livroId);
	if (!livro.ok) return estadoDe(livro.error);
	const salvo = repositorios.inserirExemplar(livro.value.id);
	if (!salvo.ok) return { tipo: "Falhou", excecao: salvo.error };
	return { tipo: "Cadastrado", exemplar: salvo.value };
}
