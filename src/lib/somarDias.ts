// Primeira ocorrência concreta: `dataDeDevolucao`, em
// features/emprestimos/regras.ts, que fazia esta conta por dentro. Segunda: o
// plano dos dados de exemplo (dadosDeExemplo/plano.ts), que a trouxe para cá.

/** A data `YYYY-MM-DD` deslocada de `dias` dias (negativo volta), em UTC, sem ler o relógio. */
export function somarDias(data: string, dias: number): string {
	const resultado = new Date(data);
	resultado.setUTCDate(resultado.getUTCDate() + dias);
	return resultado.toISOString().slice(0, 10);
}
