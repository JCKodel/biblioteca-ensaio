import { useCallback, useEffect, useState } from "react";
import type {
	CadastroDeLivroPedido,
	LivroDoCatalogo,
	RecusaDeLivro,
} from "./regras.ts";

// O orquestrador do cliente: chama as rotas do catálogo, recarrega a lista
// depois de cada cadastro e publica o estado que a tela renderiza.

export type ListaDoCatalogo =
	| { tipo: "Carregando" }
	| { tipo: "Carregada"; livros: LivroDoCatalogo[] }
	| { tipo: "Falhou" };

/** O que a tela mostra abaixo do formulário depois de um cadastro. */
export type AvisoDoCatalogo = RecusaDeLivro | "NaoEncontrado" | "Falhou";

const PEDIDO_VAZIO: CadastroDeLivroPedido = { titulo: "", autor: "", ano: "" };

type Resposta = { status: number; corpo: unknown };

// A rede é uma borda com o mundo de fora: um servidor que não responde, ou
// uma resposta que não é JSON, vira `null`, e a tela mostra a mensagem de Falhou.
async function chamar(
	caminho: string,
	init?: RequestInit,
): Promise<Resposta | null> {
	try {
		const resposta = await fetch(caminho, init);
		return { status: resposta.status, corpo: await resposta.json() };
	} catch {
		return null;
	}
}

function recusaDe(resposta: Resposta): AvisoDoCatalogo {
	return (resposta.corpo as { recusa: AvisoDoCatalogo }).recusa;
}

export function useCatalogo() {
	const [pedido, setPedido] = useState<CadastroDeLivroPedido>(PEDIDO_VAZIO);
	const [lista, setLista] = useState<ListaDoCatalogo>({ tipo: "Carregando" });
	const [aviso, setAviso] = useState<AvisoDoCatalogo | null>(null);
	const [cadastrandoLivro, setCadastrandoLivro] = useState(false);
	const [livroRecebendoExemplar, setLivroRecebendoExemplar] = useState<
		string | null
	>(null);

	const recarregar = useCallback(async () => {
		const resposta = await chamar("/api/livros");
		if (resposta?.status === 200) {
			setLista({
				tipo: "Carregada",
				livros: resposta.corpo as LivroDoCatalogo[],
			});
		} else {
			setLista({ tipo: "Falhou" });
		}
	}, []);

	useEffect(() => {
		recarregar();
	}, [recarregar]);

	function alterarCampo(campo: keyof CadastroDeLivroPedido, valor: string) {
		setPedido((atual) => ({ ...atual, [campo]: valor }));
	}

	async function cadastrarLivro() {
		setCadastrandoLivro(true);
		setAviso(null);
		const resposta = await chamar("/api/livros", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(pedido),
		});
		if (resposta?.status === 201) {
			setPedido(PEDIDO_VAZIO);
			await recarregar();
		} else if (resposta?.status === 400) {
			setAviso(recusaDe(resposta));
		} else {
			setAviso("Falhou");
		}
		setCadastrandoLivro(false);
	}

	async function adicionarExemplar(livroId: string) {
		setLivroRecebendoExemplar(livroId);
		setAviso(null);
		const resposta = await chamar(
			`/api/livros/${encodeURIComponent(livroId)}/exemplares`,
			{ method: "POST" },
		);
		if (resposta?.status === 201) {
			await recarregar();
		} else if (resposta?.status === 404) {
			setAviso(recusaDe(resposta));
		} else {
			setAviso("Falhou");
		}
		setLivroRecebendoExemplar(null);
	}

	return {
		pedido,
		lista,
		aviso,
		cadastrandoLivro,
		livroRecebendoExemplar,
		alterarCampo,
		cadastrarLivro,
		adicionarExemplar,
	};
}
