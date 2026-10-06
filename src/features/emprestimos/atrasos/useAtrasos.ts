import { useEffect, useState } from "react";
import { chamar } from "../../../lib/chamar.ts";
import type { EmprestimoAtrasado } from "../regras.ts";

// O orquestrador do cliente da lista de atrasos: lê a lista uma vez, ao
// montar, e publica o estado que a tela renderiza. Recarregar a página a lê
// de novo, com o `hoje` daquele momento.

export type ListaDeAtrasos =
	| { tipo: "Carregando" }
	| { tipo: "Listado"; atrasados: EmprestimoAtrasado[] }
	| { tipo: "Falhou" };

export function useAtrasos(): ListaDeAtrasos {
	const [lista, setLista] = useState<ListaDeAtrasos>({ tipo: "Carregando" });

	useEffect(() => {
		async function carregar() {
			const resposta = await chamar("/api/emprestimos/atrasados");
			setLista(
				resposta?.status === 200
					? {
							tipo: "Listado",
							atrasados: resposta.corpo as EmprestimoAtrasado[],
						}
					: { tipo: "Falhou" },
			);
		}
		carregar();
	}, []);

	return lista;
}
