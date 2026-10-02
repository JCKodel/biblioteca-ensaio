import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Aplicacao } from "./Aplicacao.tsx";
import "./estilo.css";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("index.html sem o elemento #raiz");

createRoot(raiz).render(
	<StrictMode>
		<Aplicacao />
	</StrictMode>,
);
