import {
	type APIRequestContext,
	expect,
	type Page,
	test,
} from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: cada teste cria o
// seu livro, exemplar e membro com nomes únicos e os acha pelo texto. O `hoje`
// de cada teste vai no cabeçalho x-hoje da própria página; o servidor do e2e
// sobe com RELOGIO_DE_TESTE=cabecalho (playwright.config.ts).

const MENSAGEM_DE_ATRASO = "Devolva primeiro os seus livros atrasados.";

function nomeUnico(nome: string): string {
	return `${nome} ${test.info().project.name} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;
}

type Exemplar = { id: string; titulo: string };
type Membro = { id: string; nome: string };

async function exemplarNovo(
	request: APIRequestContext,
	titulo: string,
): Promise<Exemplar> {
	const livro = await (
		await request.post("/api/livros", {
			data: { titulo, autor: "Machado de Assis", ano: "" },
		})
	).json();
	const exemplar = await (
		await request.post(`/api/livros/${livro.id}/exemplares`)
	).json();
	return { id: exemplar.id, titulo };
}

async function membroNovo(
	request: APIRequestContext,
	nome: string,
): Promise<Membro> {
	const membro = await (
		await request.post("/api/membros", { data: { nome } })
	).json();
	return { id: membro.id, nome };
}

function rotuloDoMembro(membro: Membro): string {
	return `${membro.nome}, Matrícula ${membro.id}`;
}

function rotuloDoExemplar(exemplar: Exemplar): string {
	return `${exemplar.titulo}, exemplar ${exemplar.id}`;
}

async function escolher(page: Page, membro: Membro, exemplar: Exemplar) {
	await page
		.getByLabel("Membro")
		.selectOption({ label: rotuloDoMembro(membro) });
	await page
		.getByLabel("Exemplar")
		.selectOption({ label: rotuloDoExemplar(exemplar) });
}

function opcaoDoExemplar(page: Page, exemplar: Exemplar) {
	return page
		.getByLabel("Exemplar")
		.locator("option", { hasText: rotuloDoExemplar(exemplar) });
}

function linhaDoEmprestimo(page: Page, exemplar: Exemplar) {
	return page
		.getByRole("listitem")
		.filter({ hasText: rotuloDoExemplar(exemplar) });
}

test("emprestar mostra o empréstimo em Empréstimos abertos com a devolução, e o exemplar sai da escolha", async ({
	page,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-01" });
	await page.goto("/emprestimos");

	const emprestar = page.getByRole("button", { name: "Emprestar" });
	await expect(emprestar).toBeDisabled();
	await escolher(page, membro, exemplar);
	await expect(emprestar).toBeEnabled();
	await emprestar.click();

	const linha = linhaDoEmprestimo(page, exemplar);
	await expect(linha).toContainText(rotuloDoMembro(membro));
	await expect(linha).toContainText("Devolver até 22/10/2026");
	await expect(page.getByLabel("Membro")).toHaveValue("");
	await expect(page.getByLabel("Exemplar")).toHaveValue("");
	await expect(opcaoDoExemplar(page, exemplar)).toHaveCount(0);

	await page.reload();
	await expect(linha).toContainText(rotuloDoMembro(membro));
	await expect(linha).toContainText("Devolver até 22/10/2026");
	await expect(opcaoDoExemplar(page, exemplar)).toHaveCount(0);
});

test("a tela de empréstimo diz a um membro com um livro atrasado que o devolva primeiro", async ({
	page,
	request,
}) => {
	const exemplarA = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const exemplarB = await exemplarNovo(request, nomeUnico("Quincas Borba"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	const emprestar = page.getByRole("button", { name: "Emprestar" });

	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-01" });
	await page.goto("/emprestimos");
	await escolher(page, membro, exemplarA);
	await emprestar.click();
	await expect(linhaDoEmprestimo(page, exemplarA)).toContainText(
		"Devolver até 22/10/2026",
	);

	await escolher(page, membro, exemplarB);
	await expect(emprestar).toBeEnabled();
	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-30" });
	await emprestar.click();
	await expect(page.getByRole("alert")).toHaveText(MENSAGEM_DE_ATRASO);
	await expect(opcaoDoExemplar(page, exemplarB)).toHaveCount(1);
	await expect(linhaDoEmprestimo(page, exemplarB)).toHaveCount(0);

	await page.reload();
	await page
		.getByLabel("Membro")
		.selectOption({ label: rotuloDoMembro(membro) });
	await expect(page.getByRole("alert")).toHaveText(MENSAGEM_DE_ATRASO);
	await expect(emprestar).toBeDisabled();
});

test("um membro suspenso vê que a matrícula está suspensa, com Emprestar apagado", async ({
	page,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const membro = await membroNovo(request, nomeUnico("Escobar"));
	await request.post(`/api/membros/${membro.id}/suspensao`);
	await page.goto("/emprestimos");

	await escolher(page, membro, exemplar);
	await expect(page.getByRole("alert")).toHaveText(
		"A sua matrícula está suspensa.",
	);
	await expect(page.getByRole("button", { name: "Emprestar" })).toBeDisabled();
});

test("dois bibliotecários emprestam o mesmo exemplar: um consegue e o outro vê que ele acabou de ser emprestado", async ({
	browser,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const capitu = await membroNovo(request, nomeUnico("Capitu"));
	const bentinho = await membroNovo(request, nomeUnico("Bentinho"));
	const balcao1 = await browser.newPage();
	const balcao2 = await browser.newPage();
	await balcao1.goto("/emprestimos");
	await balcao2.goto("/emprestimos");
	await escolher(balcao1, capitu, exemplar);
	await escolher(balcao2, bentinho, exemplar);

	await balcao1.getByRole("button", { name: "Emprestar" }).click();
	await expect(linhaDoEmprestimo(balcao1, exemplar)).toContainText(
		rotuloDoMembro(capitu),
	);

	await balcao2.getByRole("button", { name: "Emprestar" }).click();
	await expect(balcao2.getByRole("alert")).toHaveText(
		"Este exemplar acabou de ser emprestado a outra pessoa.",
	);
	await expect(opcaoDoExemplar(balcao2, exemplar)).toHaveCount(0);
	await expect(balcao2.getByLabel("Exemplar")).toHaveValue("");
	await expect(linhaDoEmprestimo(balcao2, exemplar)).toContainText(
		rotuloDoMembro(capitu),
	);
	await balcao1.close();
	await balcao2.close();
});

test("uma falha do servidor ao listar os empréstimos mostra a mensagem de Falhou", async ({
	page,
}) => {
	await page.route("**/api/emprestimos", (rota) =>
		rota.request().method() === "GET"
			? rota.fulfill({ status: 500, json: { falha: "BancoDeDadosFalhou" } })
			: rota.fallback(),
	);
	await page.goto("/emprestimos");
	await expect(
		page.getByText(
			"Não foi possível acessar o banco da biblioteca. Tente de novo.",
		),
	).toBeVisible();
});

test("o link Empréstimos leva à tela de empréstimo", async ({ page }) => {
	await page.goto("/");
	const navegacao = page.getByRole("navigation");
	await navegacao.getByRole("link", { name: "Empréstimos" }).click();
	await expect(page).toHaveURL(/\/emprestimos$/);
	await expect(
		page.getByRole("heading", { name: "Empréstimos abertos" }),
	).toBeVisible();
	await expect(
		navegacao.getByRole("link", { name: "Empréstimos" }),
	).toHaveAttribute("aria-current", "page");
	await expect(
		navegacao.getByRole("link", { name: "Membros" }),
	).not.toHaveAttribute("aria-current");
});
