import { useCallback, useEffect, useState } from "react";
import { chamar, type Resposta } from "../../lib/chamar.ts";
import type { MembroDoCadastro, RecusaDeMembro } from "./regras.ts";

// O orquestrador do cliente: chama as rotas dos membros, recarrega a lista
// depois de cada cadastro, suspensão ou reativação e publica o estado que a
// tela renderiza.

export type ListaDeMembros =
	| { tipo: "Carregando" }
	| { tipo: "Carregada"; membros: MembroDoCadastro[] }
	| { tipo: "Falhou" };

/** O que a tela mostra abaixo do formulário depois de um pedido. */
export type AvisoDeMembros = RecusaDeMembro | "NaoEncontrado" | "Falhou";

function recusaDe(resposta: Resposta): AvisoDeMembros {
	return (resposta.corpo as { recusa: AvisoDeMembros }).recusa;
}

export function useMembros() {
	const [nome, setNome] = useState("");
	const [lista, setLista] = useState<ListaDeMembros>({ tipo: "Carregando" });
	const [aviso, setAviso] = useState<AvisoDeMembros | null>(null);
	const [cadastrando, setCadastrando] = useState(false);
	const [membroEmAlteracao, setMembroEmAlteracao] = useState<string | null>(
		null,
	);

	const recarregar = useCallback(async () => {
		const resposta = await chamar("/api/membros");
		if (resposta?.status === 200) {
			setLista({
				tipo: "Carregada",
				membros: resposta.corpo as MembroDoCadastro[],
			});
		} else {
			setLista({ tipo: "Falhou" });
		}
	}, []);

	useEffect(() => {
		recarregar();
	}, [recarregar]);

	async function cadastrarMembro() {
		setCadastrando(true);
		setAviso(null);
		const resposta = await chamar("/api/membros", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ nome }),
		});
		if (resposta?.status === 201) {
			setNome("");
			await recarregar();
		} else if (resposta?.status === 400) {
			setAviso(recusaDe(resposta));
		} else {
			setAviso("Falhou");
		}
		setCadastrando(false);
	}

	/** `true` suspende; `false` reativa. */
	async function definirSuspenso(membroId: string, suspenso: boolean) {
		setMembroEmAlteracao(membroId);
		setAviso(null);
		const acao = suspenso ? "suspensao" : "reativacao";
		const resposta = await chamar(
			`/api/membros/${encodeURIComponent(membroId)}/${acao}`,
			{ method: "POST" },
		);
		if (resposta?.status === 200) {
			await recarregar();
		} else if (resposta?.status === 404) {
			setAviso(recusaDe(resposta));
		} else {
			setAviso("Falhou");
		}
		setMembroEmAlteracao(null);
	}

	return {
		nome,
		lista,
		aviso,
		cadastrando,
		membroEmAlteracao,
		setNome,
		cadastrarMembro,
		definirSuspenso,
	};
}
