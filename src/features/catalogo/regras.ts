import { MENSAGEM_DE_FALHA } from "../../lib/mensagemDeFalha.ts";
import { err, ok, type Result } from "../../lib/result.ts";

export type Livro = {
	id: string;
	titulo: string;
	autor: string;
	ano: number | null;
};
export type Exemplar = { id: string; livroId: string };
export type LivroDoCatalogo = Livro & { totalDeExemplares: number };

/** Como a bibliotecária digitou; `ano` vazio é sem ano. */
export type CadastroDeLivroPedido = {
	titulo: string;
	autor: string;
	ano: string;
};
export type DadosDoLivro = {
	titulo: string;
	autor: string;
	ano: number | null;
};
export type RecusaDeLivro = "TituloInvalido" | "AutorInvalido" | "AnoInvalido";
export type CadastroDeExemplarPedido = { livroId: string };

const MAXIMO_DE_CARACTERES = 200;
const ANO = /^\d{1,4}$/;

function textoValido(texto: string): boolean {
	return texto.length >= 1 && texto.length <= MAXIMO_DE_CARACTERES;
}

/** Apara os três campos e confere título, autor e ano, nessa ordem. */
export function validarLivro(
	pedido: CadastroDeLivroPedido,
): Result<DadosDoLivro, RecusaDeLivro> {
	const titulo = pedido.titulo.trim();
	const autor = pedido.autor.trim();
	const ano = pedido.ano.trim();
	if (!textoValido(titulo)) return err("TituloInvalido");
	if (!textoValido(autor)) return err("AutorInvalido");
	if (ano === "") return ok({ titulo, autor, ano: null });
	if (!ANO.test(ano) || Number(ano) < 1) return err("AnoInvalido");
	return ok({ titulo, autor, ano: Number(ano) });
}

export function textoDeExemplares(total: number): string {
	if (total === 0) return "nenhum exemplar";
	if (total === 1) return "1 exemplar";
	return `${total} exemplares`;
}

/** Sem acentos nem maiúsculas: "Eça" e "eca" ficam iguais. */
function normalizado(texto: string): string {
	return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Os livros, na mesma ordem, cujo título ou autor contém a busca aparada. */
export function buscarNoCatalogo(
	livros: LivroDoCatalogo[],
	busca: string,
): LivroDoCatalogo[] {
	const trecho = normalizado(busca.trim());
	if (trecho === "") return livros;
	return livros.filter(
		(livro) =>
			normalizado(livro.titulo).includes(trecho) ||
			normalizado(livro.autor).includes(trecho),
	);
}

/** Os textos do docs/03, literais. */
export const mensagens: Record<
	RecusaDeLivro | "NaoEncontrado" | "Falhou",
	string
> = {
	TituloInvalido: "Informe o título, com até 200 caracteres.",
	AutorInvalido: "Informe o autor, com até 200 caracteres.",
	AnoInvalido: "O ano é um número de até quatro algarismos, ou fica em branco.",
	NaoEncontrado: "Este livro não está no catálogo.",
	Falhou: MENSAGEM_DE_FALHA,
};
