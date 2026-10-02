import type { FormEvent } from "react";
import { mensagens, textoDeExemplares } from "./regras.ts";
import { useCatalogo } from "./useCatalogo.ts";

export function TelaDeCatalogo() {
	const {
		pedido,
		lista,
		aviso,
		cadastrandoLivro,
		livroRecebendoExemplar,
		alterarCampo,
		cadastrarLivro,
		adicionarExemplar,
	} = useCatalogo();

	function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		cadastrarLivro();
	}

	return (
		<section className="catalogo">
			<form className="formulario" onSubmit={enviar}>
				<label className="campo">
					<span className="campo__rotulo">Título</span>
					<input
						className="campo__entrada"
						value={pedido.titulo}
						onChange={(e) => alterarCampo("titulo", e.target.value)}
					/>
				</label>
				<label className="campo">
					<span className="campo__rotulo">Autor</span>
					<input
						className="campo__entrada"
						value={pedido.autor}
						onChange={(e) => alterarCampo("autor", e.target.value)}
					/>
				</label>
				<label className="campo">
					<span className="campo__rotulo">Ano (opcional)</span>
					<input
						className="campo__entrada"
						inputMode="numeric"
						value={pedido.ano}
						onChange={(e) => alterarCampo("ano", e.target.value)}
					/>
				</label>
				<button className="botao" type="submit" disabled={cadastrandoLivro}>
					Cadastrar livro
				</button>
			</form>
			{aviso && (
				<p className="aviso" role="alert">
					{mensagens[aviso]}
				</p>
			)}

			<h2 className="catalogo__titulo">Livros</h2>
			{lista.tipo === "Carregando" && <p>Carregando o catálogo.</p>}
			{lista.tipo === "Falhou" && <p className="aviso">{mensagens.Falhou}</p>}
			{lista.tipo === "Carregada" && lista.livros.length === 0 && (
				<p>Nenhum livro no catálogo ainda.</p>
			)}
			{lista.tipo === "Carregada" && lista.livros.length > 0 && (
				<ul className="livros">
					{lista.livros.map((livro) => (
						<li className="livro" key={livro.id}>
							<div className="livro__texto">
								<span className="livro__titulo">{livro.titulo}</span>
								<span>
									{livro.autor}
									{livro.ano !== null && `, ${livro.ano}`}
								</span>
								<span>{textoDeExemplares(livro.totalDeExemplares)}</span>
							</div>
							<button
								className="botao"
								type="button"
								disabled={livroRecebendoExemplar === livro.id}
								onClick={() => adicionarExemplar(livro.id)}
							>
								Adicionar exemplar
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
