import type { FormEvent } from "react";
import { mensagens, podePegarEmprestado, textoDaDevolucao } from "./regras.ts";
import { useEmprestimo } from "./useEmprestimo.ts";

export function TelaDeEmprestimo() {
	const {
		membroId,
		exemplarId,
		listas,
		aviso,
		emprestando,
		escolherMembro,
		escolherExemplar,
		emprestar,
	} = useEmprestimo();

	if (listas.tipo === "Carregando") {
		return (
			<section className="emprestimos">
				<p>Carregando os empréstimos.</p>
			</section>
		);
	}
	if (listas.tipo === "Falhou") {
		return (
			<section className="emprestimos">
				<p className="aviso">{mensagens.Falhou}</p>
			</section>
		);
	}

	const { emprestimos, exemplares, membros } = listas;
	const membro = membros.find((m) => m.id === membroId);
	// A tela decide o que mostrar com a regra; quem decide o empréstimo é o servidor.
	const podePegar = membro ? podePegarEmprestado(membro) : null;
	const recusaDoMembro = podePegar && !podePegar.ok ? podePegar.error : null;
	const mensagem = aviso ?? recusaDoMembro;
	const apagado =
		emprestando || !membroId || !exemplarId || recusaDoMembro !== null;

	function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		emprestar();
	}

	return (
		<section className="emprestimos">
			<form className="formulario" onSubmit={enviar}>
				<label className="campo">
					<span className="campo__rotulo">Membro</span>
					<select
						className="campo__entrada"
						value={membroId}
						onChange={(e) => escolherMembro(e.target.value)}
					>
						<option value="" />
						{membros.map((m) => (
							<option key={m.id} value={m.id}>
								{m.nome}, Matrícula {m.id}
							</option>
						))}
					</select>
				</label>
				{membros.length === 0 && (
					<p className="formulario__nota">Nenhum membro cadastrado ainda.</p>
				)}
				<label className="campo">
					<span className="campo__rotulo">Exemplar</span>
					<select
						className="campo__entrada"
						value={exemplarId}
						onChange={(e) => escolherExemplar(e.target.value)}
					>
						<option value="" />
						{exemplares.map((e) => (
							<option key={e.id} value={e.id}>
								{e.titulo}, exemplar {e.id}
							</option>
						))}
					</select>
				</label>
				{exemplares.length === 0 && (
					<p className="formulario__nota">Nenhum exemplar disponível.</p>
				)}
				<button className="botao" type="submit" disabled={apagado}>
					Emprestar
				</button>
			</form>
			{mensagem && (
				<p className="aviso" role="alert">
					{mensagens[mensagem]}
				</p>
			)}

			<h2 className="emprestimos__titulo">Empréstimos abertos</h2>
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
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
