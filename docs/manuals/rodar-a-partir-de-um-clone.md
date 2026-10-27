# Rodar a biblioteca a partir de um clone novo

Põe a biblioteca para rodar na máquina do desenvolvedor, o único ambiente (docs/01 §Ambientes), a partir de um clone novo, e roda a verificação. Os comandos são os mesmos no PowerShell, no cmd, no Terminal do macOS e no bash do Linux. Os passos vêm do bloco "Preparação" de `work/done/m1-review.md`.

## O que precisa estar no lugar

* `node --version` diz `v24` ou maior (`engines` do `package.json`). No Node 24, os comandos com `node:sqlite` podem escrever um `ExperimentalWarning`; ele não muda nada.
* O git, e o endereço do repositório.

## Os comandos, em ordem

1. Num terminal, na pasta em que o repositório vai ficar: `git clone <endereço do repositório> biblioteca` e `cd biblioteca`.
2. `npm ci`.
3. Só para a verificação e os ponta a ponta: `npx playwright install chromium`. O teste à mão não precisa dele.
4. `npm run dev`, e abra `http://localhost:5173` no navegador. Na partida, o servidor cria `data/biblioteca.sqlite` e aplica as migrações `0001-catalogo.sql`, `0002-membros.sql` e `0003-emprestimos.sql`, que o terminal nomeia.
5. Para ter dados de demonstração: `npm run dados-de-exemplo` (`docs/manuals/dados-de-exemplo.md`).
6. Para parar: Ctrl+C no terminal do `npm run dev`, que encerra o cliente e o servidor juntos (no Windows, se aparecer "Terminate batch job (Y/N)?", responda `Y`).

## Como saber que funcionou

A página abre com o cabeçalho e os links "Catálogo", "Membros", "Empréstimos" e "Atrasos", e `npm run verify` termina verde.

## Como desfazer, ou recomeçar do banco vazio

Com o servidor parado, na raiz do repositório: `node -e "require('node:fs').rmSync('data/biblioteca.sqlite', { force: true })"`. O próximo `npm run dev` cria o arquivo de novo, vazio. Apagar a pasta do clone desfaz o resto.

## O que quebra se um passo for pulado

Sem o `npm ci`, nada roda. Sem o `npx playwright install chromium`, o `npm run verify` e o `npm run e2e` falham ao abrir o navegador. Apagar o banco com o servidor rodando pode falhar no Windows, que não apaga um arquivo aberto.
