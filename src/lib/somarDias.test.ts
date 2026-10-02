import { describe, expect, test } from "vitest";
import { somarDias } from "./somarDias.ts";

describe("somarDias", () => {
	test("somarDias atravessa o fim do mês", () => {
		expect(somarDias("2026-10-20", 21)).toBe("2026-11-10");
	});

	test("somarDias com -1 no primeiro dia do ano volta ao último dia do ano anterior", () => {
		expect(somarDias("2027-01-01", -1)).toBe("2026-12-31");
	});

	test("somarDias com -1 em 1º de março de um ano bissexto dá 29 de fevereiro", () => {
		expect(somarDias("2028-03-01", -1)).toBe("2028-02-29");
	});

	test("somarDias com 0 devolve a mesma data", () => {
		expect(somarDias("2026-10-02", 0)).toBe("2026-10-02");
	});
});
