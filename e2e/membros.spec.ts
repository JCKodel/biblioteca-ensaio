import { expect, type Page, test } from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: cada teste usa um
// nome único, não supõe a lista vazia e acha o membro pelo nome.
function nomeUnico(nome: string): string {
	return `${nome} ${test.info().project.name} ${Date.now()}`;
}

function linhaDoMembro(page: Page, nome: string) {
	return page.getByRole("listitem").filter({ hasText: nome });
}

async function cadastrar(page: Page, nome: string) {
	await page.getByLabel("Nome").fill(nome);
	await page.getByRole("button", { name: "Cadastrar membro" }).click();
}

test("cadastrar um membro mostra Ativo e a matrícula, e esvazia o formulário", async ({
	page,
}) => {
	const nome = nomeUnico("Capitu");
	await page.goto("/membros");
	await cadastrar(page, nome);

	const linha = linhaDoMembro(page, nome);
	await expect(linha).toContainText("Ativo");
	await expect(linha).toContainText(/Matrícula \d+/);
	await expect(linha.getByRole("button", { name: "Suspender" })).toBeVisible();
	await expect(page.getByLabel("Nome")).toHaveValue("");
});

test("suspender mostra Suspenso e Reativar, e reativar volta a Ativo", async ({
	page,
}) => {
	const nome = nomeUnico("Bentinho");
	await page.goto("/membros");
	await cadastrar(page, nome);
	const linha = linhaDoMembro(page, nome);

	await linha.getByRole("button", { name: "Suspender" }).click();
	await expect(linha).toContainText("Suspenso");
	const reativar = linha.getByRole("button", { name: "Reativar" });
	await expect(reativar).toBeVisible();

	await reativar.click();
	await expect(linha).toContainText("Ativo");
	await expect(linha.getByRole("button", { name: "Suspender" })).toBeVisible();
});

test("um nome em branco mostra a recusa e guarda o que foi digitado", async ({
	page,
}) => {
	await page.goto("/membros");
	await cadastrar(page, "   ");

	await expect(page.getByRole("alert")).toHaveText(
		"Informe o nome, com até 120 caracteres.",
	);
	await expect(page.getByLabel("Nome")).toHaveValue("   ");
});

test("uma falha do servidor ao listar os membros mostra a mensagem de Falhou", async ({
	page,
}) => {
	await page.route("**/api/membros", (rota) =>
		rota.request().method() === "GET"
			? rota.fulfill({ status: 500, json: { falha: "BancoDeDadosFalhou" } })
			: rota.fallback(),
	);
	await page.goto("/membros");
	await expect(
		page.getByText(
			"Não foi possível acessar o banco da biblioteca. Tente de novo.",
		),
	).toBeVisible();
});

test("o link Membros leva do catálogo aos membros, e Catálogo volta", async ({
	page,
}) => {
	await page.goto("/");
	const navegacao = page.getByRole("navigation");
	await expect(
		navegacao.getByRole("link", { name: "Catálogo" }),
	).toHaveAttribute("aria-current", "page");

	await navegacao.getByRole("link", { name: "Membros" }).click();
	await expect(page).toHaveURL(/\/membros$/);
	await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
	await expect(
		navegacao.getByRole("link", { name: "Membros" }),
	).toHaveAttribute("aria-current", "page");

	await navegacao.getByRole("link", { name: "Catálogo" }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole("heading", { name: "Livros" })).toBeVisible();
});
