import { TelaDeCatalogo } from "./features/catalogo/TelaDeCatalogo.tsx";

export function Aplicacao() {
	return (
		<>
			<header className="cabecalho">
				<h1 className="cabecalho__titulo">Biblioteca de empréstimos</h1>
			</header>
			<main className="conteudo">
				<TelaDeCatalogo />
			</main>
		</>
	);
}
