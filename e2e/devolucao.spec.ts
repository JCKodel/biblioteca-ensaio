import {
	type APIRequestContext,
	expect,
	type Page,
	test,
} from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: cada teste cria o
// seu livro, exemplar, membro e empréstimo pela API com nomes únicos e os acha
// pelo texto. O `hoje` vai no cabeçalho x-hoje: o do pedido pela API e o da
// página por page.setExtraHTTPHeaders; o servidor do e2e sobe com
// RELOGIO_DE_TESTE=cabecalho (playwright.config.ts).

const JA_DEVOLVIDO = "Este empréstimo já foi devolvido.";
const MENSAGEM_DE_ATRASO = "Devolva primeiro os seus livros atrasados.";
const MENSAGEM_DE_FALHA =
	"Não foi possível acessar o banco da biblioteca. Tente de novo.";

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

async function emprestimoNovo(
	request: APIRequestContext,
	exemplar: Exemplar,
	membro: Membro,
	hoje: string,
) {
	const resposta = await request.post("/api/emprestimos", {
		data: { exemplarId: exemplar.id, membroId: membro.id },
		headers: { "x-hoje": hoje },
	});
	expect(resposta.status()).toBe(201);
}

function rotuloDoMembro(membro: Membro): string {
	return `${membro.nome}, Matrícula ${membro.id}`;
}

function rotuloDoExemplar(exemplar: Exemplar): string {
	return `${exemplar.titulo}, exemplar ${exemplar.id}`;
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

function botaoDeDevolucao(page: Page, exemplar: Exemplar) {
	return linhaDoEmprestimo(page, exemplar).getByRole("button", {
		name: "Registrar devolução",
	});
}

test("registrar a devolução tira o empréstimo da lista e devolve o exemplar à escolha", async ({
	page,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	await emprestimoNovo(request, exemplar, membro, "2026-10-01");
	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-05" });
	await page.goto("/emprestimos");

	await expect(linhaDoEmprestimo(page, exemplar)).toContainText(
		rotuloDoMembro(membro),
	);
	await expect(opcaoDoExemplar(page, exemplar)).toHaveCount(0);
	await botaoDeDevolucao(page, exemplar).click();

	await expect(linhaDoEmprestimo(page, exemplar)).toHaveCount(0);
	await expect(opcaoDoExemplar(page, exemplar)).toHaveCount(1);
	await expect(page.getByRole("alert")).toHaveCount(0);

	await page.reload();
	await expect(
		page.getByRole("heading", { name: "Empréstimos abertos" }),
	).toBeVisible();
	await expect(opcaoDoExemplar(page, exemplar)).toHaveCount(1);
	await expect(linhaDoEmprestimo(page, exemplar)).toHaveCount(0);
});

test("devolver o livro atrasado deixa o membro pegar emprestado de novo", async ({
	page,
	request,
}) => {
	const atrasado = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const proximo = await exemplarNovo(request, nomeUnico("Quincas Borba"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	await emprestimoNovo(request, atrasado, membro, "2026-10-01");
	await page.setExtraHTTPHeaders({ "x-hoje": "2026-10-30" });
	await page.goto("/emprestimos");

	const emprestar = page.getByRole("button", { name: "Emprestar" });
	await page
		.getByLabel("Membro")
		.selectOption({ label: rotuloDoMembro(membro) });
	await expect(page.getByRole("alert")).toHaveText(MENSAGEM_DE_ATRASO);
	await expect(emprestar).toBeDisabled();

	await botaoDeDevolucao(page, atrasado).click();
	await expect(linhaDoEmprestimo(page, atrasado)).toHaveCount(0);
	await expect(page.getByRole("alert")).toHaveCount(0);
	await page
		.getByLabel("Exemplar")
		.selectOption({ label: rotuloDoExemplar(proximo) });
	await expect(emprestar).toBeEnabled();
	await emprestar.click();

	await expect(linhaDoEmprestimo(page, proximo)).toContainText(
		"Devolver até 20/11/2026",
	);
});

test("dois bibliotecários devolvem o mesmo empréstimo: o primeiro consegue e o segundo vê que ele já foi devolvido", async ({
	browser,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	await emprestimoNovo(request, exemplar, membro, "2026-10-01");
	const balcao1 = await browser.newPage();
	const balcao2 = await browser.newPage();
	await balcao1.goto("/emprestimos");
	await balcao2.goto("/emprestimos");
	await expect(linhaDoEmprestimo(balcao2, exemplar)).toHaveCount(1);

	await botaoDeDevolucao(balcao1, exemplar).click();
	await expect(linhaDoEmprestimo(balcao1, exemplar)).toHaveCount(0);
	await expect(balcao1.getByRole("alert")).toHaveCount(0);

	await botaoDeDevolucao(balcao2, exemplar).click();
	await expect(balcao2.getByRole("alert")).toHaveText(JA_DEVOLVIDO);
	await expect(linhaDoEmprestimo(balcao2, exemplar)).toHaveCount(0);
	await expect(opcaoDoExemplar(balcao2, exemplar)).toHaveCount(1);
	await balcao1.close();
	await balcao2.close();
});

test("uma falha do servidor ao registrar a devolução mostra a mensagem de Falhou e a linha continua", async ({
	page,
	request,
}) => {
	const exemplar = await exemplarNovo(request, nomeUnico("Dom Casmurro"));
	const membro = await membroNovo(request, nomeUnico("Capitu"));
	await emprestimoNovo(request, exemplar, membro, "2026-10-01");
	await page.route("**/api/emprestimos/devolucao", (rota) =>
		rota.fulfill({ status: 500, json: { falha: "BancoDeDadosFalhou" } }),
	);
	await page.goto("/emprestimos");

	await botaoDeDevolucao(page, exemplar).click();
	await expect(page.getByRole("alert")).toHaveText(MENSAGEM_DE_FALHA);
	await expect(linhaDoEmprestimo(page, exemplar)).toContainText(
		rotuloDoMembro(membro),
	);
	await expect(botaoDeDevolucao(page, exemplar)).toBeEnabled();
});
