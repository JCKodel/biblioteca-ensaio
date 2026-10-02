import type { BancoDeDadosFalhou } from "../../lib/consultar.server.ts";
import { estadoDe } from "../../lib/estadoDe.ts";
import {
	type CadastroDeExemplarPedido,
	type CadastroDeLivroPedido,
	type Exemplar,
	type Livro,
	type RecusaDeLivro,
	validarLivro,
} from "./regras.ts";
import type { RepositoriosDoCatalogo } from "./repositorio.server.ts";

export type EstadoDoCadastroDeLivro =
	| { tipo: "Cadastrado"; livro: Livro }
	| { tipo: "Recusado"; recusa: RecusaDeLivro }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type EstadoDoCadastroDeExemplar =
	| { tipo: "Cadastrado"; exemplar: Exemplar }
	| { tipo: "Recusado"; recusa: "NaoEncontrado" }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

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
