import { expect, type Page, test } from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: cada teste usa um
// título único, não supõe o catálogo vazio e acha o livro pelo título.
function tituloUnico(nome: string): string {
	return `${nome} ${test.info().project.name} ${Date.now()}`;
}

function linhaDoLivro(page: Page, titulo: string) {
	return page.getByRole("listitem").filter({ hasText: titulo });
}

test("cadastrar um livro e acrescentar dois exemplares mostra 2 exemplares", async ({
	page,
}) => {
	const titulo = tituloUnico("Dom Casmurro");
	await page.goto("/");
	await page.getByLabel("Título", { exact: true }).fill(titulo);
	await page.getByLabel("Autor", { exact: true }).fill("Machado de Assis");
	await page.getByRole("button", { name: "Cadastrar livro" }).click();

	const linha = linhaDoLivro(page, titulo);
	await expect(linha).toContainText("nenhum exemplar");
	await expect(page.getByLabel("Título", { exact: true })).toHaveValue("");

	const adicionar = linha.getByRole("button", { name: "Adicionar exemplar" });
	await adicionar.click();
	await expect(linha).toContainText("1 exemplar");
	await adicionar.click();
	await expect(linha).toContainText("2 exemplares");
});

test("um título em branco mostra a recusa e guarda o que foi digitado", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByLabel("Título", { exact: true }).fill("   ");
	await page.getByLabel("Autor", { exact: true }).fill("Autor sem título");
	await page.getByRole("button", { name: "Cadastrar livro" }).click();

	await expect(page.getByRole("alert")).toHaveText(
		"Informe o título, com até 200 caracteres.",
	);
	await expect(page.getByLabel("Autor", { exact: true })).toHaveValue(
		"Autor sem título",
	);
});

test("uma falha do servidor ao listar mostra a mensagem de Falhou", async ({
	page,
}) => {
	await page.route("**/api/livros", (rota) =>
		rota.request().method() === "GET"
			? rota.fulfill({ status: 500, json: { falha: "BancoDeDadosFalhou" } })
			: rota.fallback(),
	);
	await page.goto("/");
	await expect(
		page.getByText(
			"Não foi possível acessar o banco da biblioteca. Tente de novo.",
		),
	).toBeVisible();
});
