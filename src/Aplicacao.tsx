import { TelaDeCatalogo } from "./features/catalogo/TelaDeCatalogo.tsx";
import { TelaDeMembros } from "./features/membros/TelaDeMembros.tsx";

// A tela é escolhida pelo caminho na carga da página: /membros mostra os
// membros, qualquer outro caminho o catálogo. Os links são <a href> comuns,
// que recarregam a página; sem biblioteca de rotas nem `history`.
const TELAS = [
	{ caminho: "/", nome: "Catálogo" },
	{ caminho: "/membros", nome: "Membros" },
] as const;

export function Aplicacao() {
	const aberta = location.pathname === "/membros" ? "/membros" : "/";
	return (
		<>
			<header className="cabecalho">
				<div className="cabecalho__faixa">
					<h1 className="cabecalho__titulo">Biblioteca de empréstimos</h1>
					<nav className="navegacao">
						{TELAS.map((tela) => (
							<a
								key={tela.caminho}
								className="navegacao__link"
								href={tela.caminho}
								aria-current={tela.caminho === aberta ? "page" : undefined}
							>
								{tela.nome}
							</a>
						))}
					</nav>
				</div>
			</header>
			<main className="conteudo">
				{aberta === "/membros" ? <TelaDeMembros /> : <TelaDeCatalogo />}
			</main>
		</>
	);
}
