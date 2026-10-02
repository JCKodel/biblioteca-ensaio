import type { FormEvent } from "react";
import { mensagens, textoDaSituacao } from "./regras.ts";
import { useMembros } from "./useMembros.ts";

export function TelaDeMembros() {
	const {
		nome,
		lista,
		aviso,
		cadastrando,
		membroEmAlteracao,
		setNome,
		cadastrarMembro,
		definirSuspenso,
	} = useMembros();

	function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		cadastrarMembro();
	}

	return (
		<section className="membros">
			<form className="formulario" onSubmit={enviar}>
				<label className="campo">
					<span className="campo__rotulo">Nome</span>
					<input
						className="campo__entrada"
						value={nome}
						onChange={(e) => setNome(e.target.value)}
					/>
				</label>
				<button className="botao" type="submit" disabled={cadastrando}>
					Cadastrar membro
				</button>
			</form>
			{aviso && (
				<p className="aviso" role="alert">
					{mensagens[aviso]}
				</p>
			)}

			<h2 className="membros__titulo">Membros</h2>
			{lista.tipo === "Carregando" && <p>Carregando os membros.</p>}
			{lista.tipo === "Falhou" && <p className="aviso">{mensagens.Falhou}</p>}
			{lista.tipo === "Carregada" && lista.membros.length === 0 && (
				<p>Nenhum membro cadastrado ainda.</p>
			)}
			{lista.tipo === "Carregada" && lista.membros.length > 0 && (
				<ul className="membros__lista">
					{lista.membros.map((membro) => (
						<li className="membro" key={membro.id}>
							<div className="membro__texto">
								<span className="membro__nome">{membro.nome}</span>
								<span>Matrícula {membro.id}</span>
								<span>{textoDaSituacao(membro.suspenso)}</span>
							</div>
							<button
								className="botao"
								type="button"
								disabled={membroEmAlteracao === membro.id}
								onClick={() => definirSuspenso(membro.id, !membro.suspenso)}
							>
								{membro.suspenso ? "Reativar" : "Suspender"}
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
