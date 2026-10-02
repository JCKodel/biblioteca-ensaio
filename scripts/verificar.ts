import { spawnSync } from "node:child_process";

// Roda os passos em ordem e para no primeiro que falha. Um comando inteiro
// numa string com shell: true, para o npm.cmd do Windows.
const PASSOS = ["typecheck", "lint", "test", "e2e", "build"];

for (const passo of PASSOS) {
	console.log(`\nverify: ${passo}`);
	const resultado = spawnSync(`npm run ${passo}`, {
		shell: true,
		stdio: "inherit",
	});
	if (resultado.status !== 0) {
		console.error(`\nverify falhou no passo ${passo}`);
		process.exit(resultado.status ?? 1);
	}
}

console.log(`\nverify verde: ${PASSOS.join(", ")}`);
