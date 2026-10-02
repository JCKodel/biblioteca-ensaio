import type { CadastroDeLivroPedido } from "../features/catalogo/regras.ts";
import {
	dataDeDevolucao,
	type Emprestimo,
} from "../features/emprestimos/regras.ts";
import { somarDias } from "../lib/somarDias.ts";

// O plano dos dados de exemplo: puro, sem relógio e sem `Math.random`. Os
// números moram aqui e no docs/05 §5, que o curso cita.

/** Um livro como a bibliotecária o digitaria (`ano` como string), e quantos exemplares tem. */
export type LivroDeExemplo = CadastroDeLivroPedido & { exemplares: number };

/** Os livros, nesta ordem: o id é a linha (1 é Dom Casmurro); os exemplares saem em ordem, 1 a 60. */
export const LIVROS: LivroDeExemplo[] = [
	{
		titulo: "Dom Casmurro",
		autor: "Machado de Assis",
		ano: "1899",
		exemplares: 3,
	},
	{
		titulo: "Memórias Póstumas de Brás Cubas",
		autor: "Machado de Assis",
		ano: "1881",
		exemplares: 3,
	},
	{
		titulo: "Quincas Borba",
		autor: "Machado de Assis",
		ano: "1891",
		exemplares: 2,
	},
	{
		titulo: "O Alienista",
		autor: "Machado de Assis",
		ano: "1882",
		exemplares: 3,
	},
	{ titulo: "Iracema", autor: "José de Alencar", ano: "1865", exemplares: 3 },
	{ titulo: "O Guarani", autor: "José de Alencar", ano: "1857", exemplares: 2 },
	{ titulo: "Senhora", autor: "José de Alencar", ano: "1875", exemplares: 2 },
	{ titulo: "Lucíola", autor: "José de Alencar", ano: "1862", exemplares: 1 },
	{ titulo: "O Cortiço", autor: "Aluísio Azevedo", ano: "1890", exemplares: 3 },
	{ titulo: "O Ateneu", autor: "Raul Pompeia", ano: "1888", exemplares: 1 },
	{
		titulo: "Triste Fim de Policarpo Quaresma",
		autor: "Lima Barreto",
		ano: "1915",
		exemplares: 2,
	},
	{
		titulo: "Os Sertões",
		autor: "Euclides da Cunha",
		ano: "1902",
		exemplares: 2,
	},
	{
		titulo: "Memórias de um Sargento de Milícias",
		autor: "Manuel Antônio de Almeida",
		ano: "1854",
		exemplares: 1,
	},
	{
		titulo: "A Moreninha",
		autor: "Joaquim Manuel de Macedo",
		ano: "1844",
		exemplares: 2,
	},
	{
		titulo: "Inocência",
		autor: "Visconde de Taunay",
		ano: "1872",
		exemplares: 1,
	},
	{
		titulo: "Macunaíma",
		autor: "Mário de Andrade",
		ano: "1928",
		exemplares: 2,
	},
	{
		titulo: "Vidas Secas",
		autor: "Graciliano Ramos",
		ano: "1938",
		exemplares: 3,
	},
	{
		titulo: "São Bernardo",
		autor: "Graciliano Ramos",
		ano: "1934",
		exemplares: 2,
	},
	{
		titulo: "O Quinze",
		autor: "Rachel de Queiroz",
		ano: "1930",
		exemplares: 2,
	},
	{
		titulo: "Capitães da Areia",
		autor: "Jorge Amado",
		ano: "1937",
		exemplares: 3,
	},
	{
		titulo: "Grande Sertão: Veredas",
		autor: "João Guimarães Rosa",
		ano: "1956",
		exemplares: 2,
	},
	{
		titulo: "A Hora da Estrela",
		autor: "Clarice Lispector",
		ano: "1977",
		exemplares: 3,
	},
	{
		titulo: "Morte e Vida Severina",
		autor: "João Cabral de Melo Neto",
		ano: "1955",
		exemplares: 2,
	},
	{
		titulo: "Os Lusíadas",
		autor: "Luís de Camões",
		ano: "1572",
		exemplares: 1,
	},
	{
		titulo: "Amor de Perdição",
		autor: "Camilo Castelo Branco",
		ano: "1862",
		exemplares: 1,
	},
	{
		titulo: "O Primo Basílio",
		autor: "Eça de Queirós",
		ano: "1878",
		exemplares: 2,
	},
	{ titulo: "Os Maias", autor: "Eça de Queirós", ano: "1888", exemplares: 2 },
	{
		titulo: "A Cidade e as Serras",
		autor: "Eça de Queirós",
		ano: "1901",
		exemplares: 1,
	},
	{ titulo: "Mensagem", autor: "Fernando Pessoa", ano: "1934", exemplares: 1 },
	{
		titulo: "Ensaio sobre a Cegueira",
		autor: "José Saramago",
		ano: "1995",
		exemplares: 2,
	},
];

/** Os nomes dos membros, nesta ordem: a matrícula é a linha (1 é Ana Beatriz Souza). */
export const MEMBROS: string[] = [
	"Ana Beatriz Souza",
	"Bruno Carvalho Lima",
	"Carla Mendes Rocha",
	"Daniel Ferreira Alves",
	"Eduarda Nascimento",
	"Felipe Araújo Costa",
	"Gabriela Ribeiro Santos",
	"Henrique Barbosa",
	"Isabela Moreira Dias",
	"João Pedro Martins",
	"Juliana Teixeira Gomes",
	"Lucas Almeida Pereira",
	"Mariana Castro Freitas",
	"Mateus Cardoso",
	"Natália Pinto Correia",
	"Otávio Monteiro",
	"Patrícia Vieira Lopes",
	"Rafael Cunha Batista",
	"Renata Duarte",
	"Rodrigo Nunes Farias",
	"Sofia Campos Ramos",
	"Thiago Moura Reis",
	"Vanessa Lima Cavalcanti",
	"Vinícius Rocha Melo",
	"Yasmin Oliveira Prado",
];

/** As matrículas suspensas no último passo da carga, depois de todos os empréstimos. */
export const SUSPENSOS: number[] = [8, 19];

/**
 * Um empréstimo dos dados de exemplo, em dias antes de `hoje` (docs/03), com
 * o exemplar e o membro pela ordem de cadastro (1 é o primeiro).
 * `devolvidoHaDias` é `null` num empréstimo que fica aberto.
 */
export type EmprestimoDoPlano = {
	exemplar: number;
	membro: number;
	emprestadoHaDias: number;
	devolvidoHaDias: number | null;
};

export type SituacaoDoEmprestimo =
	| "DevolvidoNoPrazo"
	| "DevolvidoComAtraso"
	| "AbertoNoPrazo"
	| "AbertoAtrasado";

export type EventoDoPlano = {
	tipo: "Emprestar" | "Devolver";
	em: string;
	exemplar: number;
	membro: number;
};

/**
 * [exemplar, matrícula, emprestado há dias, devolvido há dias], do mais
 * antigo para o mais recente. Os abertos atrasados: exemplares 1 e 20 à
 * matrícula 3 (há 40 dias), 34 à 12 (há 30) e 26 à 21 (há 60); o 46 à
 * matrícula 5, há 21 dias, vence hoje. O plano.test.ts confere cada frase do
 * Contrato da entrega.
 */
const PLANO: [number, number, number, number | null][] = [
	[41, 19, 90, 86],
	[10, 17, 88, 62],
	[16, 3, 88, 82],
	[11, 18, 86, 76],
	[48, 21, 85, 75],
	[1, 18, 84, 79],
	[6, 20, 84, 76],
	[45, 23, 84, 74],
	[28, 7, 83, 79],
	[55, 20, 81, 76],
	[13, 6, 80, 72],
	[30, 7, 80, 52],
	[36, 16, 80, 63],
	[5, 18, 77, 73],
	[29, 9, 77, 66],
	[46, 20, 76, 72],
	[55, 20, 76, 63],
	[8, 23, 75, 56],
	[14, 13, 73, 68],
	[38, 17, 73, 49],
	[58, 12, 73, 57],
	[23, 11, 72, 45],
	[32, 8, 71, 64],
	[60, 7, 69, 49],
	[15, 7, 68, 52],
	[31, 11, 68, 58],
	[39, 21, 68, 64],
	[42, 3, 67, 62],
	[45, 5, 66, 52],
	[44, 12, 65, 56],
	[21, 1, 64, 47],
	[17, 1, 62, 49],
	[13, 21, 61, 49],
	[40, 4, 61, 31],
	[55, 10, 61, 43],
	[5, 13, 60, 26],
	[26, 21, 60, null],
	[22, 23, 59, 46],
	[37, 22, 59, 44],
	[16, 13, 58, 45],
	[34, 1, 58, 50],
	[11, 21, 57, 41],
	[57, 10, 57, 54],
	[39, 8, 56, 46],
	[3, 19, 55, 51],
	[4, 6, 55, 46],
	[6, 3, 55, 42],
	[19, 3, 55, 48],
	[46, 12, 55, 51],
	[48, 10, 53, 33],
	[50, 2, 53, 49],
	[27, 2, 52, 36],
	[56, 2, 52, 37],
	[18, 4, 51, 39],
	[25, 22, 50, 44],
	[46, 20, 50, 21],
	[49, 15, 48, 44],
	[35, 13, 47, 44],
	[24, 6, 46, 35],
	[57, 6, 46, 29],
	[4, 19, 45, 22],
	[45, 9, 42, 25],
	[10, 5, 41, 34],
	[33, 7, 41, 35],
	[41, 13, 41, 38],
	[1, 3, 40, null],
	[20, 3, 40, null],
	[14, 2, 39, 29],
	[47, 22, 39, 12],
	[8, 20, 38, 33],
	[39, 15, 33, 24],
	[55, 2, 33, 25],
	[7, 3, 30, 5],
	[27, 14, 30, 1],
	[34, 12, 30, null],
	[49, 15, 30, 5],
	[12, 18, 29, 26],
	[28, 2, 29, 4],
	[54, 20, 29, 16],
	[2, 2, 28, 23],
	[6, 2, 28, 10],
	[17, 10, 28, 4],
	[21, 23, 27, 0],
	[23, 17, 27, 12],
	[50, 2, 27, 21],
	[11, 1, 26, 17],
	[13, 12, 26, 3],
	[22, 1, 26, 3],
	[30, 23, 26, 11],
	[43, 11, 26, 10],
	[10, 19, 25, 21],
	[48, 11, 25, 19],
	[5, 6, 24, 13],
	[8, 5, 24, 3],
	[57, 13, 23, 2],
	[32, 19, 22, 17],
	[40, 16, 22, 0],
	[2, 5, 21, 10],
	[25, 15, 21, 6],
	[44, 11, 21, 11],
	[46, 5, 21, null],
	[39, 17, 20, 0],
	[41, 7, 20, 7],
	[3, 12, 19, 14],
	[15, 23, 19, 14],
	[59, 1, 19, null],
	[4, 6, 18, 11],
	[29, 10, 16, null],
	[42, 1, 15, 5],
	[3, 12, 14, 1],
	[32, 20, 13, null],
	[56, 6, 13, 1],
	[58, 18, 13, 10],
	[24, 5, 10, 5],
	[2, 11, 8, 5],
	[44, 18, 8, 4],
	[9, 16, 7, null],
	[43, 9, 5, null],
	[4, 4, 4, null],
	[7, 18, 4, null],
];

/** Sempre a mesma lista, que não depende de `hoje`. */
export function planejarEmprestimos(): EmprestimoDoPlano[] {
	return PLANO.map(([exemplar, membro, emprestadoHaDias, devolvidoHaDias]) => ({
		exemplar,
		membro,
		emprestadoHaDias,
		devolvidoHaDias,
	}));
}

/**
 * O `Emprestimo` que o plano descreve, com os ids pela posição: a data de
 * devolução é a que `emprestar` fixaria naquele dia.
 */
export function emprestimoDoPlano(
	item: EmprestimoDoPlano,
	hoje: string,
): Emprestimo {
	const emprestadoEm = somarDias(hoje, -item.emprestadoHaDias);
	return {
		exemplarId: String(item.exemplar),
		membroId: String(item.membro),
		emprestadoEm,
		devolverEm: dataDeDevolucao(emprestadoEm),
		devolvidoEm:
			item.devolvidoHaDias === null
				? null
				: somarDias(hoje, -item.devolvidoHaDias),
	};
}

/**
 * Devolvido até a data de devolução, inclusive, está no prazo. Aberto, está
 * atrasado com a data de devolução antes de `hoje`, como em `emAtraso`: o
 * que vence hoje está no prazo. Mora no plano até uma tela a usar.
 */
export function situacaoDoEmprestimo(
	emprestimo: Emprestimo,
	hoje: string,
): SituacaoDoEmprestimo {
	if (emprestimo.devolvidoEm !== null) {
		return emprestimo.devolvidoEm <= emprestimo.devolverEm
			? "DevolvidoNoPrazo"
			: "DevolvidoComAtraso";
	}
	return emprestimo.devolverEm < hoje ? "AbertoAtrasado" : "AbertoNoPrazo";
}

/**
 * Os empréstimos e as devoluções do plano, em ordem de data; no mesmo dia, as
 * devoluções antes dos empréstimos, e cada tipo na ordem do plano.
 */
export function eventosDoPlano(
	plano: EmprestimoDoPlano[],
	hoje: string,
): EventoDoPlano[] {
	const eventos = plano.flatMap((item): EventoDoPlano[] => {
		const emprestimo = emprestimoDoPlano(item, hoje);
		const { exemplar, membro } = item;
		const emprestar: EventoDoPlano = {
			tipo: "Emprestar",
			em: emprestimo.emprestadoEm,
			exemplar,
			membro,
		};
		if (emprestimo.devolvidoEm === null) return [emprestar];
		return [
			emprestar,
			{ tipo: "Devolver", em: emprestimo.devolvidoEm, exemplar, membro },
		];
	});
	const ordemDoTipo = (evento: EventoDoPlano) =>
		evento.tipo === "Devolver" ? 0 : 1;
	// `sort` é estável: no mesmo dia e no mesmo tipo, fica a ordem do plano.
	return eventos.sort(
		(a, b) => a.em.localeCompare(b.em) || ordemDoTipo(a) - ordemDoTipo(b),
	);
}
