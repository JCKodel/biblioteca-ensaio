// Primeira ocorrência concreta: `lerHoje`, em
// features/emprestimos/rota.server.ts. Segunda: o comando dos dados de
// exemplo (scripts/dadosDeExemplo.ts), que a trouxe para cá, sem mudar.

/** A data local da máquina, a do balcão; `toISOString` daria a de Greenwich. */
export function dataLocal(): string {
	const agora = new Date();
	const mes = String(agora.getMonth() + 1).padStart(2, "0");
	const dia = String(agora.getDate()).padStart(2, "0");
	return `${agora.getFullYear()}-${mes}-${dia}`;
}
