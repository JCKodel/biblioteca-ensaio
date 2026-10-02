import { expect, test } from "@playwright/test";

test("a tela inicial mostra o cabeçalho, sem rolagem horizontal", async ({
	page,
}) => {
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Biblioteca de empréstimos" }),
	).toBeVisible();
	const rolaNaHorizontal = await page.evaluate(
		() =>
			document.documentElement.scrollWidth >
			document.documentElement.clientWidth,
	);
	expect(rolaNaHorizontal).toBe(false);
});

test("o cliente alcança /api/saude pelo repasse do Vite", async ({
	request,
}) => {
	const resposta = await request.get("/api/saude");
	expect(resposta.status()).toBe(200);
	expect(await resposta.json()).toEqual({ ok: true });
});
