import type { BancoDeDadosFalhou } from "../../../lib/consultar.server.ts";
import type { Result } from "../../../lib/result.ts";
import {
	diasDeAtraso,
	type EmprestimoAberto,
	type EmprestimoAtrasado,
} from "../regras.ts";

export type EstadoDosAtrasos =
	| { tipo: "Listado"; atrasados: EmprestimoAtrasado[] }
	| { tipo: "Falhou"; excecao: BancoDeDadosFalhou };

export type RepositoriosDeAtrasos = {
	listarEmprestimosAtrasados(
		hoje: string,
	): Result<EmprestimoAberto[], BancoDeDadosFalhou>;
};

/** Os atrasados de `hoje`, na ordem do repositório, cada um com os dias de atraso. */
export function listaDeAtrasosPedida(
	hoje: string,
	repositorios: RepositoriosDeAtrasos,
): EstadoDosAtrasos {
	const abertos = repositorios.listarEmprestimosAtrasados(hoje);
	if (!abertos.ok) return { tipo: "Falhou", excecao: abertos.error };
	return {
		tipo: "Listado",
		atrasados: abertos.value.map((aberto) => ({
			...aberto,
			diasDeAtraso: diasDeAtraso(aberto.devolverEm, hoje),
		})),
	};
}
