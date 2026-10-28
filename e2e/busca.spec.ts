import { expect, type Page, test } from "@playwright/test";

// Os dois projetos gravam no mesmo servidor ao mesmo tempo: cada teste marca
// os seus livros com um código único e busca sempre com ele.
function codigoUnico(): string {
	return `x${test.info().project.name.replace(/\W/g, "")}${Date.now()}`;
}

async function cadastrar(page: Page, titulo: string, autor: string) {
	await page.getByLabel("Título", { exact: true }).fill(titulo);
	await page.getByLabel("Autor", { exact: true }).fill(autor);
	await page.getByRole("button", { name: "Cadastrar livro" }).click();
	await expect(page.getByLabel("Título", { exact: true })).toHaveValue("");
}

test("a busca filtra por título e autor, sem acento nem maiúscula, e apagar traz a lista", async ({
	page,
}) => {
	const codigo = codigoUnico();
	const comAcento = `Memórias Ímpares ${codigo}`;
	const doAutor = `Contos Breves ${codigo}`;
	const outro = `Poemas Soltos ${codigo}`;
	await page.goto("/");
	await cadastrar(page, comAcento, "Ana Souza");
	await cadastrar(page, doAutor, `Zélia Quintana ${codigo}`);
	await cadastrar(page, outro, "Bruno Lima");

	const busca = page.getByLabel("Buscar por título ou autor");
	const livros = page.getByRole("listitem");

	await busca.fill(`MEMORIAS IMPARES ${codigo.toUpperCase()}`);
	await expect(livros).toHaveCount(1);
	await expect(livros).toContainText(comAcento);

	await busca.fill(`zelia quintana ${codigo}`);
	await expect(livros).toHaveCount(1);
	await expect(livros).toContainText(doAutor);

	await busca.fill(`nada assim ${codigo}`);
	await expect(page.getByText("Nenhum livro encontrado.")).toBeVisible();
	await expect(livros).toHaveCount(0);

	await busca.fill("");
	for (const titulo of [comAcento, doAutor, outro]) {
		await expect(livros.filter({ hasText: titulo })).toHaveCount(1);
	}
});
