# esqueleto

**Objetivo.** Quem clona o repositório sobe o app vazio com um comando, `npm run dev`, e prova qualquer mudança com outro, `npm run verify`, no Windows, no macOS ou no Linux.

**Comportamento.**
* `npm run dev` sobe o cliente e o servidor juntos, num terminal só; em `http://localhost:5173` aparece o cabeçalho "Biblioteca de empréstimos" e, abaixo dele, a tela inicial vazia. Fechar o comando encerra os dois.
* Na primeira partida, o servidor cria a pasta `data/` e o banco `data/biblioteca.sqlite`; `git status` não mostra nenhum dos dois.
* Na partida, o servidor aplica as migrações pendentes de `migracoes/`, em ordem, e escreve no terminal o nome de cada uma que aplicou; numa segunda partida ele não aplica nenhuma.
* Uma migração com erro impede a partida, depois de o terminal mostrar o nome do arquivo e o erro do SQLite; nada dela fica gravado no banco.
* Dois arquivos com o mesmo número, ou um número faltando na sequência, impedem a partida com uma mensagem que nomeia os arquivos.
* `GET /api/saude` responde 200 com `{"ok":true}`, tanto em `http://localhost:3000` quanto em `http://localhost:5173` (o cliente repassa `/api` ao servidor).
* `npm run verify` roda, nesta ordem, a checagem de tipos, o lint, os testes unitários, os testes ponta a ponta e o build; para no primeiro passo que falha, diz qual foi e sai com código diferente de zero. Numa árvore limpa ele fica verde.
* Em 390 e em 1280 pixels de largura, o cabeçalho cabe sem rolagem horizontal e o texto é legível sem zoom.
* Nenhum script do `package.json` usa `rm`, `&`, `&&`, `printf` nem variável de ambiente inline (conferido lendo); a pessoa roda `npm run dev` e `npm run verify` num Windows sem WSL.

**Contrato.**
* `package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=24" }`, `"license": "AGPL-3.0-only"`.
* Scripts:

  | Script | Roda |
  |---|---|
  | `dev` | `concurrently`: o Vite e `node --watch src/iniciar.server.ts` |
  | `typecheck` | `tsc --noEmit` |
  | `lint` | `biome check .` |
  | `format` | `biome check --write .` |
  | `test` | `vitest run` (arquivos `src/**/*.test.ts`) |
  | `e2e` | `playwright test` (arquivos `e2e/*.spec.ts`) |
  | `build` | `vite build`, para `dist/` |
  | `verify` | `node scripts/verificar.ts`: `typecheck`, `lint`, `test`, `e2e`, `build`, parando na primeira falha |

* Dependências, na última versão estável no /apply, fixadas pelo `package-lock.json`. De execução: `react`, `react-dom`, `hono`, `@hono/node-server`. De desenvolvimento: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `vitest`, `@playwright/test`, `@biomejs/biome`, e `concurrently` (nova: roda os dois processos do `dev` igual no Windows).
* TypeScript sem passo de compilação no servidor: o Node 24 roda os `.ts` removendo os tipos. Só sintaxe apagável (nada de `enum`, `namespace`, propriedades no construtor) e imports relativos com a extensão `.ts`.
* Portas: cliente (Vite) 5173, servidor (Hono) 3000; o Vite repassa `/api` para `http://localhost:3000`.
* Rota: `GET /api/saude` → `200`, `{"ok":true}`. Não toca o banco.
* Banco: `data/biblioteca.sqlite`, relativo à raiz do repositório, aberto com `DatabaseSync` só em `src/iniciar.server.ts` (a raiz de composição), com as chaves estrangeiras ligadas (o padrão do `DatabaseSync`, sem `PRAGMA` extra).
* Migrações: `migracoes/NNNN-descricao.sql` (quatro dígitos, a partir de `0001`), aplicadas em ordem numérica. A última aplicada é anotada em `PRAGMA user_version`, sem tabela de controle; cada migração e a sua anotação rodam numa transação. Esta entrega não cria nenhuma migração: `migracoes/` existe com um `.gitkeep`, e o `user_version` fica 0.
* `.gitignore`: `node_modules/`, `data/`, `dist/`, `test-results/`, `playwright-report/`.
* Arquivos: `index.html` (`lang="pt-BR"`, título "Biblioteca de empréstimos"), `src/cliente.tsx` (entrada do cliente), `src/Aplicacao.tsx` (cabeçalho e tela inicial vazia), `src/estilo.css`; `src/iniciar.server.ts` (abre o banco, migra, escuta), `src/servidor.server.ts` (`criarServidor(db)`, o app Hono onde as rotas das fatias se montam), `src/banco.server.ts` (`lerMigracoes(pasta)`, `aplicarMigracoes(db, migracoes)`); testes unitários ao lado; `e2e/esqueleto.spec.ts`; `scripts/verificar.ts`.
* Playwright: só Chromium, dois projetos, `390` (390 × 844) e `1280` (1280 × 800); o próprio Playwright sobe o servidor e o cliente (reaproveita os que já estiverem rodando).
* Raiz: `README.md`, `LICENSE` (AGPL-3.0-only) e `LICENSE-TEXT` (CC BY-SA 4.0), os dois copiados de `/Volumes/Data/Projects/focus-kit-book`. O README tem um parágrafo: o repositório é o laboratório do curso e o exemplo do livro *Uma Página de Cada Vez* (https://jckodel.github.io/focus-kit-book/pt/); e a tabela de licenças: `docs/`, `work/` e o `README.md` em CC BY-SA 4.0; o código e todo o resto, inclusive os arquivos de comando do focus-kit, em AGPL-3.0-only. Sem seção "Como rodar".

**Estados.** Vazio: o cabeçalho e nada abaixo dele. Carregando, erro e offline não existem ainda: a tela não chama o servidor.

**Referência visual.** Não há arquivo de design: esta entrega cria a referência, as capturas `work/done/esqueleto-390.png` e `work/done/esqueleto-1280.png`. Estilo simples e legível: fonte do sistema, 16 px, texto escuro sobre fundo claro com contraste AA, uma cor de destaque na faixa do cabeçalho, margem de 16 px em 390 e conteúdo centrado com largura máxima em 1280; um arquivo CSS com variáveis, sem biblioteca de CSS nem de componentes. O /apply registra os valores exatos no docs/04 §Estilo visual.

**Fora do escopo.**
* A seção "Como rodar" do README e o passo `npx playwright install`: um exercício do curso os escreve.
* Qualquer tabela, rota ou tela do domínio: chegam com `catalogo`, `membros`, `emprestar-livro`, `devolver-livro`.
* `Result`, `ok`, `err` e `consultar`: nascem na primeira fatia que os usa (docs/01).
* Um banco separado para os testes ponta a ponta: entra com a primeira entrega cujo teste grava (`catalogo`).
* Portas e banco separados por worktree: uma entrega própria (ADR-0003).
* Integração contínua: não há publicação nem ambiente além do local (docs/05).
* Modo escuro, ícone, fontes da web: o estilo é o mínimo legível.
* Build do servidor para produção: não há produção no Marco 1.

**Pronto quando.**
* [x] Os testes unitários passam: `lerMigracoes` recusa números repetidos ou com buraco; `aplicarMigracoes` aplica as pendentes em ordem e anota a última; não reaplica uma já aplicada; uma migração com erro não fica gravada; `GET /api/saude` responde 200 com `{"ok":true}`.
* [x] `e2e/esqueleto.spec.ts` passa nos dois projetos: a tela inicial mostra o cabeçalho "Biblioteca de empréstimos"; o cliente alcança `/api/saude`.
* [x] `npm run verify` está verde, e fica vermelho, nomeando o passo, quando um erro de tipo é introduzido de propósito e depois desfeito.
* [x] `npm run dev` sobe os dois, e `data/biblioteca.sqlite` aparece e é ignorado pelo git.
* [x] As capturas `work/done/esqueleto-390.png` e `-1280.png` foram tiradas uma vez pelo Playwright (`npx playwright screenshot --viewport-size`), fora do `verify`, que não as regrava.
* [x] `README.md`, `LICENSE` e `LICENSE-TEXT` na raiz, como no Contrato.
* [x] Documentos atualizados: docs/01 §Ambientes (`npm run dev`); docs/02 §Esquema (as migrações e o `user_version`) e §O que o cliente pode chamar (`GET /api/saude`); docs/04 §Estilo visual e a regra do TypeScript apagável; docs/05 §5 (`npm run verify` existe); docs/06 `[x] esqueleto`.
* [ ] A pessoa rodou `npm run dev` e `npm run verify` num Windows sem WSL.

**Escolhas feitas sem a pessoa.**
* Nenhuma migração nesta entrega (só o executor e `.gitkeep`), e o controle por `PRAGMA user_version` em vez de uma tabela: nenhum schema antes de haver dados.
* A numeração sem buraco nem repetição é exigida, para que duas entregas paralelas que criem a mesma `0002` falhem na partida, e não em silêncio.
* O executor não captura exceções: uma migração com erro é um bug, o processo cai e o SQLite desfaz a transação aberta.
* `verify` é um script Node (ADR-0005: mais de um comando de ferramenta); `dev` usa o pacote `concurrently`.
* O servidor roda TypeScript pelo próprio Node 24, sem `tsx` nem build; `build` é só o do cliente.
* Um único `tsconfig.json` para cliente, servidor, testes e scripts.
* `/api/saude` não toca o banco; o e2e passa por `5173` para provar o repasse do `/api`.
* As capturas são tiradas uma vez, não a cada `verify`, para não sujar o git a cada rodada.
* Chaves estrangeiras ligadas desde já (o padrão do `DatabaseSync`), porque `exemplar` e `emprestimo` vão referenciar outras tabelas.
* O `README.md` vai com a licença da documentação, como no repositório do livro.
* O docs/03 não muda: nada aqui é vocabulário do domínio.

**O que aconteceu.**
* **Versões instaladas** (a última estável em 2026-10-02): `react` e `react-dom` 19.3, `hono` 4.13, `@hono/node-server` 2.1, `typescript` 7.0 (o compilador nativo), `vite` 8.3, `@vitejs/plugin-react` 6.1, `vitest` 5.0, `@playwright/test` 1.63, `@biomejs/biome` 2.5, `concurrently` 10.0, `@types/node` 24.19. O `engines` continua `>=24`.
* **Divergiu, na revisão da pessoa: `@types/node` fixado na linha 24** (`^24`), e não na última (26.6), porque os alunos usam o Node 24 LTS e os tipos não devem oferecer APIs que ele não tem. A máquina do /apply tem Node 26.10, então a entrega foi provada também sob um Node 24 de verdade (24.21.0, baixado com `npx -y -p node@24`): `npm run verify` verde, com o TypeScript 7, o Vitest, o Playwright e o servidor do `webServer` rodando nele, e `node src/iniciar.server.ts` subindo e respondendo `{"ok":true}` em `/api/saude`, sem aviso no terminal. Nada no código nem na configuração precisou mudar. Depois, o `verify` voltou a ficar verde no Node 26 da máquina.
* **Divergiu: o nome da migração vai para o terminal antes de ela rodar**, como `migração 0001-x.sql`, e não depois. Sem capturar exceções, é o único jeito de o terminal mostrar o nome do arquivo quando o SQLite falha; numa partida limpa a linha também nomeia cada migração aplicada, e numa segunda partida nenhuma linha aparece. `aplicarMigracoes` também devolve os nomes das aplicadas, para o teste.
* **Divergiu: `lerMigracoes` lança**, com uma mensagem que nomeia os arquivos, para número repetido, buraco, sequência que não começa em `0001` e um `.sql` fora do formato `NNNN-descricao.sql` (este último não estava na página: um `1-a.sql` seria ignorado em silêncio). É um erro de quem escreveu a migração, então é um bug que derruba a partida, não uma recusa (docs/01 §Como os erros trafegam).
* **`criarServidor(db)`** recebe o `db` sem usá-lo ainda; o Biome avisa parâmetro sem uso, e um `biome-ignore` com o motivo (a primeira rota que fecha sobre ele chega com `catalogo`) mantém o nome do Contrato.
* **Os testes unitários foram vistos vermelhos** (o import falhava) antes do código; o `e2e/esqueleto.spec.ts` não: a primeira rodada dele já foi dentro do `verify` verde.
* **O e2e também confere a rolagem horizontal** (`scrollWidth` não passa de `clientWidth`) em 390 e 1280, a linha do Comportamento que não estava no Pronto quando.
* **A prova encontrou:**
  * `npm run verify` verde: 11 testes unitários, 4 ponta a ponta (2 por projeto), build. Com `export const erroDeProposito: number = "texto"` em `src/Aplicacao.tsx`, ele parou no primeiro passo com `verify falhou no passo typecheck` e código 1; desfeito, a checagem de tipos volta a passar.
  * `npm run dev`: `/api/saude` responde `{"ok":true}` em 3000 e em 5173; `data/biblioteca.sqlite` é criado na primeira partida e aparece só como ignorado no `git status --ignored`; um SIGINT no `concurrently` encerra os dois e libera as duas portas.
  * À mão, com migrações temporárias, depois removidas: uma boa aplicada na primeira partida e nenhuma na segunda; uma com erro mostra `migração 0001-teste.sql` e `Error: no such table: nada`, e o banco fica com `user_version` 0 e sem tabelas; `0001` repetido dá `Duas migrações com o número 0001: 0001-outra.sql e 0001-teste.sql`; um buraco dá `Falta a migração 0002 entre 0001-teste.sql e 0003-outra.sql`.
  * As capturas `esqueleto-390.png` e `esqueleto-1280.png`, tiradas uma vez com `npx playwright screenshot --viewport-size` contra o `npm run dev`: o cabeçalho cabe nas duas larguras, com 16 px de margem em 390 e centrado em 960 px em 1280. Os valores do estilo estão no docs/04 §Estilo visual; o contraste é 17,4:1 no texto e 6,8:1 no cabeçalho.
  * Scripts conferidos lendo o `package.json`: nenhum usa `rm`, `&`, `&&`, `printf` nem variável de ambiente inline; os comandos do `webServer` do Playwright também não. O `verify` chama cada passo como uma string só com `shell: true`, para o `npm.cmd` do Windows. Falta a pessoa rodar num Windows sem WSL.
* **Documentos:** além dos listados, a frase "o projeto não tem código" saiu de `AGENTS.md` §Não reconstrua e do docs/01 §Tentado e removido. Nenhum ADR: toda decisão desta entrega já estava na página.
