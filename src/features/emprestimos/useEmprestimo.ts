import { useCallback, useEffect, useState } from "react";
import { chamar, type Resposta } from "../../lib/chamar.ts";
import type {
	EmprestimoAberto,
	ExemplarDisponivel,
	MembroDoEmprestimo,
	RecusaDeEmprestimo,
} from "./regras.ts";

// O orquestrador do cliente: carrega as três listas, empresta, recarrega as
// três depois de cada empréstimo (emprestado ou recusado) e publica o estado
// que a tela renderiza.

export type ListasDoEmprestimo =
	| { tipo: "Carregando" }
	| {
			tipo: "Carregadas";
			emprestimos: EmprestimoAberto[];
			exemplares: ExemplarDisponivel[];
			membros: MembroDoEmprestimo[];
	  }
	| { tipo: "Falhou" };

/** O que a tela mostra abaixo do formulário depois de um pedido. */
export type AvisoDeEmprestimo = RecusaDeEmprestimo | "NaoEncontrado" | "Falhou";

function recusaDe(resposta: Resposta): AvisoDeEmprestimo {
	return (resposta.corpo as { recusa: AvisoDeEmprestimo }).recusa;
}

export function useEmprestimo() {
	const [membroId, setMembroId] = useState("");
	const [exemplarId, setExemplarId] = useState("");
	const [listas, setListas] = useState<ListasDoEmprestimo>({
		tipo: "Carregando",
	});
	const [aviso, setAviso] = useState<AvisoDeEmprestimo | null>(null);
	const [emprestando, setEmprestando] = useState(false);

	/** `false` quando uma das três listas não carregou. */
	const recarregar = useCallback(async (): Promise<boolean> => {
		const [emprestimos, exemplares, membros] = await Promise.all([
			chamar("/api/emprestimos"),
			chamar("/api/emprestimos/exemplares"),
			chamar("/api/emprestimos/membros"),
		]);
		if (
			emprestimos?.status !== 200 ||
			exemplares?.status !== 200 ||
			membros?.status !== 200
		) {
			// Só a primeira carga troca a tela pela falha; depois, as escolhas
			// e as listas ficam como estavam.
			setListas((atual) =>
				atual.tipo === "Carregadas" ? atual : { tipo: "Falhou" },
			);
			return false;
		}
		const novas = {
			emprestimos: emprestimos.corpo as EmprestimoAberto[],
			exemplares: exemplares.corpo as ExemplarDisponivel[],
			membros: membros.corpo as MembroDoEmprestimo[],
		};
		setListas({ tipo: "Carregadas", ...novas });
		// Uma escolha que saiu da lista volta ao vazio.
		setMembroId((id) => (novas.membros.some((m) => m.id === id) ? id : ""));
		setExemplarId((id) =>
			novas.exemplares.some((e) => e.id === id) ? id : "",
		);
		return true;
	}, []);

	useEffect(() => {
		recarregar();
	}, [recarregar]);

	function escolherMembro(id: string) {
		setMembroId(id);
		setAviso(null);
	}

	function escolherExemplar(id: string) {
		setExemplarId(id);
		setAviso(null);
	}

	async function emprestar() {
		setEmprestando(true);
		setAviso(null);
		const resposta = await chamar("/api/emprestimos", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ exemplarId, membroId }),
		});
		if (resposta?.status === 201) {
			setMembroId("");
			setExemplarId("");
			if (!(await recarregar())) setAviso("Falhou");
		} else if (resposta?.status === 409 || resposta?.status === 404) {
			setAviso(recusaDe(resposta));
			if (!(await recarregar())) setAviso("Falhou");
		} else {
			setAviso("Falhou");
		}
		setEmprestando(false);
	}

	return {
		membroId,
		exemplarId,
		listas,
		aviso,
		emprestando,
		escolherMembro,
		escolherExemplar,
		emprestar,
	};
}
