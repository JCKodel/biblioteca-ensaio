import {
	type EmprestimoAberto,
	mensagensDaDevolucao,
	textoDaDevolucao,
} from "../regras.ts";
import { useDevolucao } from "./useDevolucao.ts";

/** A seção "Empréstimos abertos" da tela de empréstimo, com o botão de cada linha. */
export function TelaDeDevolucao({
	emprestimos,
	depoisDeDevolver,
}: {
	emprestimos: EmprestimoAberto[];
	depoisDeDevolver: () => Promise<boolean>;
}) {
	const { devolvendo, aviso, registrarDevolucao } =
		useDevolucao(depoisDeDevolver);

	return (
		<>
			<h2 className="emprestimos__titulo">Empréstimos abertos</h2>
			{aviso && (
				<p className="aviso" role="alert">
					{mensagensDaDevolucao[aviso]}
				</p>
			)}
			{emprestimos.length === 0 && <p>Nenhum empréstimo aberto.</p>}
			{emprestimos.length > 0 && (
				<ul className="emprestimos__lista">
					{emprestimos.map((emprestimo) => (
						<li className="emprestimo" key={emprestimo.exemplarId}>
							<div className="emprestimo__texto">
								<span className="emprestimo__exemplar">
									{emprestimo.titulo}, exemplar {emprestimo.exemplarId}
								</span>
								<span>
									{emprestimo.nome}, Matrícula {emprestimo.membroId}
								</span>
								<span>{textoDaDevolucao(emprestimo.devolverEm)}</span>
							</div>
							<button
								className="botao"
								type="button"
								disabled={devolvendo}
								onClick={() =>
									registrarDevolucao(emprestimo.exemplarId, emprestimo.membroId)
								}
							>
								Registrar devolução
							</button>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
