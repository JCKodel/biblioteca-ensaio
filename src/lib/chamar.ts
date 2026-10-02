// Primeira ocorrência concreta: features/catalogo/useCatalogo.ts (useCatalogo).
// Segunda: features/membros/useMembros.ts (useMembros), que a trouxe para cá.

export type Resposta = { status: number; corpo: unknown };

// A rede é uma borda com o mundo de fora: um servidor que não responde, ou
// uma resposta que não é JSON, vira `null`, e a tela mostra a mensagem de Falhou.
export async function chamar(
	caminho: string,
	init?: RequestInit,
): Promise<Resposta | null> {
	try {
		const resposta = await fetch(caminho, init);
		return { status: resposta.status, corpo: await resposta.json() };
	} catch {
		return null;
	}
}
