import {
	type APIRequestContext,
	expect,
	type Page,
	test,
} from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: o teste cria o seu
// livro, exemplar, membro e empréstimo pela API com nomes únicos e acha a linha
// pelo texto. O `hoje` vai no cabeçalho x-hoje. "Nenhum empréstimo atrasado."
// só é conferido com 2026-10-22, porque nenhum spec empresta antes de
// 2026-10-01; com 2026-10-23, os empréstimos de 2026-10-01 dos outros testes
// também estão atrasados, então só a linha deste teste é conferida.

function nomeUnico(nome: string): string {
	return `${nome} ${test.info().project.name} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;
}

async function emprestimoNovo(
	request: APIRequestContext,
	titulo: string,
	nome: string,
	hoje: string,
): Promise<string> {
	const livro = await (
		await request.post("/api/livros", {
			data: { titulo, autor: "Machado de Assis", ano: "" },
		})
	).json();
	const exemplar = await (
		await request.post(`/api/livros/${livro.id}/exemplares`)
	).json();
	const membro = await (
		await request.post("/api/membros", { data: { nome } })
	).json();
	const resposta = await request.post("/api/emprestimos", {
		data: { exemplarId: exemplar.id, membroId: membro.id },
		headers: { "x-hoje": hoje },
	});
	expect(resposta.status()).toBe(201);
	return `${titulo}, exemplar ${exemplar.id}`;
}

function linhaDo(page: Page, exemplar: string) {
	return page.getByRole("listitem").filter({ hasText: exemplar });
}

test("um empréstimo aparece na lista de atrasos no dia seguinte à data de devolução e some depois de devolvido", async ({
	page,
	request,
}) => {
	const titulo = nomeUnico("Dom Casmurro");
	const nome = nomeUnico("Capitu");
	const exemplar = await emprestimoNovo(request, titulo, nome, "2026-10-01");

	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-22" });
	await page.goto("/atrasos");
	await expect(
		page.getByRole("heading", { name: "Empréstimos atrasados" }),
	).toBeVisible();
	await expect(page.getByText("Nenhum empréstimo atrasado.")).toBeVisible();

	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-23" });
	await page.reload();
	const linha = linhaDo(page, exemplar);
	await expect(linha).toContainText(nome);
	await expect(linha).toContainText("Devolver até 22/10/2026");
	await expect(linha).toContainText("Atrasado há 1 dia");
	await expect(linha.getByRole("button")).toHaveCount(0);

	await page
		.getByRole("navigation")
		.getByRole("link", { name: "Empréstimos" })
		.click();
	await linhaDo(page, exemplar)
		.getByRole("button", { name: "Registrar devolução" })
		.click();
	await expect(linhaDo(page, exemplar)).toHaveCount(0);

	await page
		.getByRole("navigation")
		.getByRole("link", { name: "Atrasos" })
		.click();
	await expect(
		page.getByRole("navigation").getByRole("link", { name: "Atrasos" }),
	).toHaveAttribute("aria-current", "page");
	await expect(
		page.getByRole("heading", { name: "Empréstimos atrasados" }),
	).toBeVisible();
	await expect(page.getByText("Carregando os atrasos.")).toHaveCount(0);
	await expect(linhaDo(page, exemplar)).toHaveCount(0);
});

test("uma falha do servidor mostra a mensagem de Falhou, sem lista", async ({
	page,
}) => {
	await page.route("**/api/emprestimos/atrasados", (rota) =>
		rota.fulfill({ status: 500, json: { falha: "BancoDeDadosFalhou" } }),
	);
	await page.goto("/atrasos");
	await expect(
		page.getByText(
			"Não foi possível acessar o banco da biblioteca. Tente de novo.",
		),
	).toBeVisible();
	await expect(page.getByRole("list")).toHaveCount(0);
});
