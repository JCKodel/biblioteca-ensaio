import { useState } from "react";
import { chamar } from "../../../lib/chamar.ts";
import type { RecusaDeDevolucao } from "../regras.ts";

// O orquestrador do cliente da devolução: pede a devolução de um empréstimo,
// recarrega as listas da tela de empréstimo depois de uma devolução ou de uma
// recusa (por `depoisDeDevolver`) e publica o estado que a lista renderiza.

/** O que a lista mostra abaixo do título depois de um pedido. */
export type AvisoDeDevolucao = RecusaDeDevolucao | "NaoEncontrado" | "Falhou";

export function useDevolucao(depoisDeDevolver: () => Promise<boolean>) {
	const [devolvendo, setDevolvendo] = useState(false);
	const [aviso, setAviso] = useState<AvisoDeDevolucao | null>(null);

	async function registrarDevolucao(exemplarId: string, membroId: string) {
		setDevolvendo(true);
		setAviso(null);
		const resposta = await chamar("/api/emprestimos/devolucao", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ exemplarId, membroId }),
		});
		if (resposta?.status === 200) {
			if (!(await depoisDeDevolver())) setAviso("Falhou");
		} else if (resposta?.status === 409 || resposta?.status === 404) {
			setAviso((resposta.corpo as { recusa: AvisoDeDevolucao }).recusa);
			if (!(await depoisDeDevolver())) setAviso("Falhou");
		} else {
			setAviso("Falhou");
		}
		setDevolvendo(false);
	}

	return { devolvendo, aviso, registrarDevolucao };
}
