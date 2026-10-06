import { MENSAGEM_DE_FALHA } from "../../../lib/mensagemDeFalha.ts";
import { textoDaDevolucao, textoDoAtraso } from "../regras.ts";
import { useAtrasos } from "./useAtrasos.ts";

/** A lista de atrasos, só leitura: a devolução continua na tela de empréstimo. */
export function TelaDeAtrasos() {
	const lista = useAtrasos();

	return (
		<section className="emprestimos">
			<h2 className="emprestimos__titulo">Empréstimos atrasados</h2>
			{lista.tipo === "Carregando" && <p>Carregando os atrasos.</p>}
			{lista.tipo === "Falhou" && <p className="aviso">{MENSAGEM_DE_FALHA}</p>}
			{lista.tipo === "Listado" && lista.atrasados.length === 0 && (
				<p>Nenhum empréstimo atrasado.</p>
			)}
			{lista.tipo === "Listado" && lista.atrasados.length > 0 && (
				<ul className="emprestimos__lista">
					{lista.atrasados.map((atrasado) => (
						<li className="emprestimo" key={atrasado.exemplarId}>
							<div className="emprestimo__texto">
								<span className="emprestimo__exemplar">
									{atrasado.titulo}, exemplar {atrasado.exemplarId}
								</span>
								<span>
									{atrasado.nome}, Matrícula {atrasado.membroId}
								</span>
								<span>{textoDaDevolucao(atrasado.devolverEm)}</span>
								<span>{textoDoAtraso(atrasado.diasDeAtraso)}</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
