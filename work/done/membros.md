# membros

**Objetivo.** A bibliotecária cadastra os membros da biblioteca pelo nome, vê a lista deles com a matrícula e a situação de cada um, e suspende e reativa um membro; a tela de membros e a do catálogo ficam a um clique uma da outra.

**Comportamento.**
* O cabeçalho ganha dois links, "Catálogo" e "Membros"; o da tela aberta fica marcado. "Catálogo" leva a `http://localhost:5173/`, que continua mostrando o catálogo como antes; "Membros" leva a `http://localhost:5173/membros`.
* Em `/membros`, abaixo do cabeçalho: o formulário "Nome" e o botão "Cadastrar membro"; abaixo dele, a lista "Membros".
* A bibliotecária preenche o nome e cadastra: o formulário se esvazia e o membro aparece no topo da lista com o nome, "Matrícula 7" (o número dele) e "Ativo", e o botão "Suspender".
* Espaços antes e depois do nome são descartados.
* Nome em branco (ou só espaços), ou com mais de 120 caracteres: o membro não é cadastrado, aparece "Informe o nome, com até 120 caracteres." e o formulário guarda o que foi digitado.
* Dois membros podem ter o mesmo nome: os dois aparecem, cada um com a sua matrícula.
* "Suspender" muda a linha para "Suspenso" e o botão para "Reativar"; "Reativar" volta a linha para "Ativo" e o botão para "Suspender". Sem confirmação: um clique desfaz o outro.
* Suspender um membro que outra bibliotecária acabou de suspender (ou reativar um já ativo) não é erro: a linha mostra a situação gravada.
* A lista vem do membro cadastrado mais recentemente para o mais antigo, e a situação de cada um continua igual depois de recarregar a página ou reiniciar o `npm run dev`.
* O banco não responde: aparece "Não foi possível acessar o banco da biblioteca. Tente de novo." e nada é registrado; o servidor escreve a mensagem do SQLite no terminal.
* Nada do catálogo muda: os livros cadastrados antes desta entrega continuam lá, e o `npm run dev` num banco que já tem o catálogo aplica só a `0002`.

**Contrato.**
* Migração `migracoes/0002-membros.sql`:

  ```sql
  CREATE TABLE membro (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      suspenso INTEGER NOT NULL DEFAULT 0
  );
  ```

  O SQLite não tem booleano: o repositório grava `0` e `1` e lê `boolean`, no mesmo lugar em que converte o id. O limite do nome fica na regra (`cadastrar`), não no banco. `user_version` passa a 2. A `emprestimo.membro_id` da entrega `emprestar-livro` vai referenciar este `id`.
* Ids como no catálogo: `INTEGER PRIMARY KEY` gerado pelo SQLite, `string` no TypeScript e no JSON (`"7"`). A matrícula que a tela mostra é esse id.
* Tipos (docs/03), em `src/features/membros/regras.ts`:
  * `MembroDoCadastro = { id: string; nome: string; suspenso: boolean }`
  * `CadastroDeMembroPedido = { nome: string }` (como digitado)
  * `DadosDoMembro = { nome: string }`
  * `RecusaDeMembro = "NomeInvalido"`
  * `SuspensaoPedida = { membroId: string; suspenso: boolean }` (`true` suspende, `false` reativa)
* Estados, em `src/features/membros/eventosDeMembros.ts`:
  * `EstadoDoCadastroDeMembro = { tipo: "Cadastrado"; membro: MembroDoCadastro } | { tipo: "Recusado"; recusa: RecusaDeMembro } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
  * `EstadoDaSuspensao = { tipo: "Alterado"; membro: MembroDoCadastro } | { tipo: "Recusado"; recusa: "NaoEncontrado" } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
* Casos de uso, `src/features/membros/regras.ts`, puros:
  * `cadastrar(pedido: CadastroDeMembroPedido): Result<DadosDoMembro, RecusaDeMembro>`: apara o nome; de 1 a 120 de `length`. A conferência é escrita aqui, própria dos membros; não reaproveita a do título e do autor do catálogo.
  * `textoDaSituacao(suspenso: boolean): "Ativo" | "Suspenso"`: `false` → "Ativo", `true` → "Suspenso".
  * `mensagens: Record<RecusaDeMembro | "NaoEncontrado" | "Falhou", string>`, com os textos do docs/03, literais: "Informe o nome, com até 120 caracteres.", "Este membro não está cadastrado." e, em `Falhou`, a constante `MENSAGEM_DE_FALHA` de `src/lib/mensagemDeFalha.ts` (abaixo).
* Repositório, `src/features/membros/repositorio.server.ts`, cada função com o `db` primeiro e toda chamada ao banco dentro de `consultar`:
  * `inserirMembro(db, dados: DadosDoMembro): Result<MembroDoCadastro, BancoDeDadosFalhou>`, com `suspenso` falso.
  * `listarMembros(db): Result<MembroDoCadastro[], BancoDeDadosFalhou>`, ordenada por `membro.id` decrescente.
  * `definirSuspenso(db, id: string, suspenso: boolean): Result<MembroDoCadastro, "NaoEncontrado" | BancoDeDadosFalhou>`: um `UPDATE membro SET suspenso = ? WHERE id = ? RETURNING id, nome, suspenso`; nenhuma linha devolvida é `NaoEncontrado`. Gravar o valor que já estava lá devolve o membro, sem recusa.
  * `RepositoriosDeMembros = { inserirMembro, definirSuspenso }`, as duas sem o `db`, que a rota fecha.
* Orquestradores, `src/features/membros/eventosDeMembros.ts`, síncronos, com os repositórios obrigatórios: `cadastroDeMembroPedido(evento, repositorios): EstadoDoCadastroDeMembro` (`cadastrar`; recusado, não chama `inserirMembro`) e `suspensaoPedida(evento, repositorios): EstadoDaSuspensao` (`definirSuspenso`). Nenhum lê `hoje`.
* Rotas, `src/features/membros/rota.server.ts`, `rotaDeMembros(db): Hono`, montada por `criarServidor(db)` em `/api/membros`:

  | Rota | Pedido | Resposta |
  |---|---|---|
  | `GET /api/membros` | nenhum | `200`, `MembroDoCadastro[]` |
  | `POST /api/membros` | JSON `CadastroDeMembroPedido` | `201`, `MembroDoCadastro`; `400`, `{ "recusa": "NomeInvalido" }` |
  | `POST /api/membros/:membroId/suspensao` | sem corpo | `200`, `MembroDoCadastro`; `404`, `{ "recusa": "NaoEncontrado" }` |
  | `POST /api/membros/:membroId/reativacao` | sem corpo | `200`, `MembroDoCadastro`; `404`, `{ "recusa": "NaoEncontrado" }` |

  As duas últimas montam `SuspensaoPedida` com `suspenso` `true` e `false`. Como no catálogo: uma falha do banco responde `500`, `{ "falha": "BancoDeDadosFalhou" }`, depois de `console.error` com a `mensagem`, que não vai na resposta; no `POST /api/membros`, um `nome` ausente ou que não é string é lido como string vazia, e um corpo que não é JSON é lido como pedido vazio (`400`, `NomeInvalido`); o `GET` chama `listarMembros` direto, sem orquestrador.
* **Segunda ocorrência: o que sai das fatias para `src/lib/`.** Cada arquivo movido diz, num comentário, que a primeira ocorrência foi o catálogo e a segunda, os membros (com a função), como no capítulo 4 do livro. O catálogo passa a importar de lá; o comportamento dele não muda.
  * `Result`, `ok` e `err`: `src/features/catalogo/result.ts` vira `src/lib/result.ts` (`git mv`). Primeiro uso: `features/catalogo` (`validarLivro` e o repositório); segundo: `features/membros/regras.ts` (`cadastrar`).
  * `consultar` e `BancoDeDadosFalhou`: saem de `catalogo/repositorio.server.ts` para `src/lib/consultar.server.ts`. Primeiro uso: o repositório do catálogo; segundo: o dos membros.
  * `estadoDe`, o genérico de `eventosDeCatalogo.ts` que separa uma recusa (string) de uma falha (objeto com `codigo`): vai para `src/lib/estadoDe.ts`. Primeiro uso: `cadastroDeExemplarPedido`; segundo: `suspensaoPedida`.
  * `chamar`, a borda do cliente com a rede (um servidor que não responde ou uma resposta que não é JSON vira `null`), sai de `useCatalogo.ts` para `src/lib/chamar.ts`, com o tipo `Resposta`. Primeiro uso: `useCatalogo`; segundo: `useMembros`.
  * A frase de `Falhou` do docs/03: sai do `mensagens` do catálogo para `src/lib/mensagemDeFalha.ts`, a constante `MENSAGEM_DE_FALHA`, que os dois `mensagens` usam em vez de repetir a frase. Um arquivo próprio, sem I/O, porque `regras.ts` é puro e o servidor o importa: ele não pode depender de `chamar.ts`, que usa `fetch`. Primeiro uso: `catalogo/regras.ts`; segundo: `membros/regras.ts`.
  * Ficam onde estão: `naoEsperado` e `falsos`, um par por arquivo de teste, como no capítulo 8 do livro (`falsos` é tipado pelos repositórios de cada fatia); e a conferência de 1 a 200 caracteres do catálogo, que não é a de 1 a 120 do nome (capítulo 4: "o nome de um membro não pode ser vazio" e "o título de um livro não pode ser vazio" são dois conhecimentos).
* Telas: `Aplicacao.tsx` escolhe a tela por `location.pathname` na carga da página: `/membros` mostra `TelaDeMembros`, qualquer outro caminho mostra `TelaDeCatalogo`. Os links são `<a href>` comuns (a página recarrega), dentro de um `<nav>` no cabeçalho, com `aria-current="page"` no da tela aberta; sem biblioteca de rotas nem `history`. O Vite já devolve o `index.html` para `/membros`, no `npm run dev` e no e2e.
* Cliente: `TelaDeMembros.tsx`; o orquestrador do cliente é o hook `useMembros()`, em `useMembros.ts`, que chama as rotas com `chamar`, recarrega a lista depois de cada cadastro, suspensão ou reativação, e publica o estado. A tela importa de `regras.ts` só `textoDaSituacao` e `mensagens`; nunca um `.server.ts`.
* Os scripts do `package.json`, o `playwright.config.ts` e o `vite.config.ts` não mudam.

**Estados.**
* Vazio: "Nenhum membro cadastrado ainda." no lugar da lista.
* Carregando: "Carregando os membros." no lugar da lista, só na primeira carga; durante um cadastro, uma suspensão ou uma reativação, o botão que a disparou fica desabilitado.
* Erro: a lista não carrega, ou um cadastro, uma suspensão ou uma reativação falha, ou o servidor não responde (offline é o mesmo caso): a mensagem de `Falhou`; num cadastro, o formulário guarda o que foi digitado.
* Recusa: a mensagem dela (`NomeInvalido` ou `NaoEncontrado`), logo abaixo do formulário, com `role="alert"`.

**Referência visual.** O estilo do docs/04 §Estilo visual e as capturas `work/done/catalogo-390.png` e `-1280.png`: a tela de membros é o mesmo formulário e a mesma lista, com o nome em destaque como o título do livro, a matrícula e a situação abaixo, e o botão na linha em 1280 e abaixo do texto em 390. Os dois links do cabeçalho ficam na faixa de destaque, à direita do título em 1280 e abaixo dele em 390, com o texto `--cor-do-texto-no-destaque`; o da tela aberta, sublinhado. Sem rolagem horizontal nas duas larguras. As capturas são tiradas em `http://localhost:5173/membros`. Novos valores de estilo entram como variáveis no `src/estilo.css` e no docs/04.

**Fora do escopo.**
* Email, telefone, CPF, endereço: o id basta como matrícula, e email é a OD-2.
* Editar o nome ou remover um membro: a bibliotecária não pediu; uma entrega própria se for preciso.
* Motivo e data da suspensão, e histórico de suspensões: a regra só lê `suspenso`.
* Confirmação antes de suspender: reativar desfaz a suspensão com um clique.
* O `Membro` da regra do empréstimo (`{ id, emAtraso, suspenso }`), `buscarMembro`, `emAtraso` e `podePegarEmprestado`: chegam com `emprestar-livro`, que declara o `Membro` em `membros/regras.ts` (capítulo 6) e calcula `emAtraso` com `hoje`. Esta entrega não sabe que empréstimos existem.
* A página de um membro com os empréstimos dele: `emprestimos-do-membro`, Marco 2.
* Busca, filtro e paginação na lista de membros: a lista de uma biblioteca pequena cabe numa tela.
* Recusar nome repetido: homônimos existem, e a matrícula os distingue.
* Validação no cliente antes de enviar: o servidor decide e a tela mostra a recusa.
* Uma biblioteca de rotas, ou navegação sem recarregar a página: dois links bastam para duas telas.
* Mover `naoEsperado` e `falsos` para `src/lib/`: o livro os escreve em cada arquivo de teste.
* Portas e banco separados por worktree para o `npm run dev`: uma entrega própria (ADR-0003).
* O servidor do `npm run dev` que caiu ao reiniciar: durante o `catalogo`, o `node --watch` falhou uma vez depois de uma mudança num arquivo ("Failed running src/iniciar.server.ts"), provavelmente com a porta 3000 ainda presa pelo processo anterior. Fica para uma entrega própria, que primeiro o reproduza; esta não o corrige, e o /apply que o vir registra a ocorrência aqui.

**Pronto quando.**
* [x] `regras.test.ts` dos membros, só com dados: `cadastrar` apara o nome; recusa nome vazio, só de espaços e com 121 caracteres, e aceita 120; `textoDaSituacao` com `false` e `true`.
* [x] `repositorio.server.test.ts` dos membros, num SQLite em memória com as migrações reais (`0001` e `0002`): `inserirMembro` devolve o membro com um id string e `suspenso` falso; `listarMembros` devolve o mais recente primeiro, com `suspenso` booleano; `definirSuspenso` suspende e reativa, e gravar o mesmo valor duas vezes devolve o membro; `definirSuspenso` de um id inexistente devolve `NaoEncontrado`; com o banco fechado, devolve `BancoDeDadosFalhou` em vez de lançar.
* [x] `eventosDeMembros.test.ts`, com `falsos` e `naoEsperado`, nunca mocks: um nome recusado não chama `inserirMembro`; um pedido válido salva o nome aparado e publica `Cadastrado`; uma falha do banco publica `Falhou`; suspender um membro inexistente publica `Recusado` com `NaoEncontrado`.
* [x] `rota.server.test.ts` dos membros, contra `criarServidor` com um banco em memória: as respostas do Contrato (201, 400 com a recusa, 200 da suspensão e da reativação, 404, a lista com a situação).
* [x] Os testes do catálogo passam sem mudar nenhuma asserção, só os imports; nenhum arquivo do catálogo define mais `Result`, `ok`, `err`, `consultar`, `BancoDeDadosFalhou`, `estadoDe` nem `chamar`, e a frase de `Falhou` aparece uma vez só no código.
* [x] `e2e/membros.spec.ts`, nos dois projetos, com um nome único por teste, sem supor a lista vazia e achando o membro pelo nome, nunca pela posição: cadastrar um membro mostra "Ativo"; suspender mostra "Suspenso" e "Reativar"; reativar volta a "Ativo"; nome em branco mostra a recusa; um `500` no `GET /api/membros` (por `page.route`) mostra a mensagem de `Falhou`; o link "Membros" leva da tela do catálogo à de membros, e "Catálogo" volta. `e2e/esqueleto.spec.ts` e `e2e/catalogo.spec.ts` continuam passando em `/`.
* [x] `npm run verify` está verde.
* [x] À mão: com o `data/biblioteca.sqlite` do catálogo, com livros, `npm run dev` aplica só a `0002` (o terminal mostra `migração 0002-membros.sql`) e os livros continuam lá; um membro suspenso continua suspenso depois de reiniciar o `npm run dev`; num banco novo, a tela de membros mostra o estado vazio.
* [x] Capturas `work/done/membros-390.png` e `-1280.png`, tiradas uma vez em `http://localhost:5173/membros` contra o `npm run dev` com três membros, um deles suspenso.
* [x] Documentos: docs/02 §Esquema (a tabela `membro`, a `0002`, `user_version` 2; e o parágrafo "A tabela de membros chega com `membros`" sai) e §O que o cliente pode chamar (as quatro rotas); docs/01 §Como o código é organizado (`src/lib/` com os cinco arquivos e a primeira e a segunda ocorrência de cada um) e §Como os erros trafegam (`Result`, `ok` e `err` estão em `src/lib/result.ts`); docs/04 §Estilo visual (os links do cabeçalho e as capturas de membros como referência); docs/05 §5 (a captura de uma tela que não é a inicial usa o caminho dela); docs/06 `[x] membros`.
* [ ] A pessoa rodou `npm run verify` num Windows sem WSL.

**Escolhas feitas sem a pessoa.**
* A regra se chama `cadastrar`, e não `validarMembro` como o `validarLivro` do catálogo: é o nome que o capítulo 4 do livro dá a ela ("Segundo uso: features/membros/regras.ts (cadastrar)"), e lê como o `emprestar` do capítulo 7: uma função pura que devolve o que será gravado, ou a recusa. O `validarLivro` fica como está.
* `Result`, `ok` e `err` vão para `src/lib/result.ts` nesta entrega, e não na de empréstimos como no livro: aqui a primeira ocorrência foi o catálogo (`src/features/catalogo/result.ts`), e os comentários dizem isso. `consultar` e `BancoDeDadosFalhou` vão juntos para `src/lib/consultar.server.ts`, o caminho que o comentário do catálogo prometeu.
* Também saem para `src/lib/` o `estadoDe`, o `chamar` e a frase de `Falhou`, que a pessoa não citou: cada um seria escrito pela segunda vez nesta fatia, e é o mesmo conhecimento nas duas (a recusa é string e a falha é objeto; a rede é uma borda; uma frase do docs/03 escrita uma vez). `naoEsperado` e `falsos` ficam em cada teste, como no livro.
* A conferência do nome não é compartilhada com a do título e do autor, embora hoje se leiam quase igual (o aviso do `naoVazio` no capítulo 4); os limites já diferem, 120 e 200.
* O cadastro guarda `MembroDoCadastro = { id, nome, suspenso }`, e não o `Membro` do docs/03: o `Membro` é o recorte que a regra do empréstimo lê, com `emAtraso`, que só existe quando existirem empréstimos. Os dois nomes estão no docs/03, que ganhou os termos dos membros antes desta página.
* A matrícula é o id, mostrado como "Matrícula 7": a pessoa disse que o id basta, e a mensagem `MembroSuspenso` ("A sua matrícula está suspensa.") já usa a palavra.
* Suspender e reativar são duas rotas sem corpo que dão no mesmo orquestrador e no mesmo repositório, com `suspenso` `true` ou `false`: a rota fala a língua da bibliotecária, e não há corpo para validar. Gravar a situação que já estava lá não é recusa: duas bibliotecárias que suspendem o mesmo membro querem a mesma coisa.
* Um `UPDATE ... RETURNING` faz a suspensão e descobre o `NaoEncontrado` numa instrução só, sem buscar o membro antes, ao contrário do exemplar do catálogo: aqui não há chave estrangeira a proteger nem regra a aplicar entre a busca e a gravação.
* A navegação são dois links que recarregam a página e um `location.pathname`: a tela fica num endereço próprio, que a captura do docs/05 alcança, sem biblioteca de rotas. O catálogo adiou a navegação para esta entrega.
* A lista vem do mais recente para o mais antigo, como a do catálogo: a mesma razão da ordenação por texto no SQLite, e o membro recém cadastrado fica à mão.
* O limite de 120 caracteres conta o `length` do JavaScript, como no catálogo.
* "Ativo" e "Suspenso" são escritos por um caso de uso, `textoDaSituacao`, como o `textoDeExemplares`: a tela não formata.

**O que aconteceu.**
* **Construído como no Contrato:** a `0002-membros.sql` literal; `regras.ts`, `repositorio.server.ts`, `eventosDeMembros.ts`, `rota.server.ts`, `useMembros.ts` e `TelaDeMembros.tsx` em `src/features/membros/`; `criarServidor` monta `rotaDeMembros` em `/api/membros`. Os cinco arquivos de `src/lib/` (`result.ts` por `git mv`, `consultar.server.ts`, `estadoDe.ts`, `chamar.ts`, `mensagemDeFalha.ts`) dizem num comentário que o primeiro uso foi o catálogo e o segundo, os membros. No catálogo mudaram só imports e o `Falhou` do `mensagens`, que passou a ser `MENSAGEM_DE_FALHA`. O `package.json`, o `playwright.config.ts` e o `vite.config.ts` não mudaram.
* **Divergiu: o `cadastroDeMembroPedido` publica `Recusado` direto**, sem `estadoDe`, como o `cadastroDeLivroPedido`: `cadastrar` só devolve a recusa, e o `inserirMembro` só a falha. O segundo uso do `estadoDe` é o `suspensaoPedida`, como a página diz.
* **Divergiu: a tela de membros tem classes próprias** (`.membros__lista`, `.membro`, `.membro__texto`, `.membro__nome`, `.membros__titulo`), que entram nos seletores das regras do catálogo (`.livro, .membro { ... }`). Nenhuma classe do catálogo foi renomeada; nenhuma variável nova foi precisa (os espaços dos links usam `--margem` e `--espaco`).
* **Divergiu: o cabeçalho ganhou a `.cabecalho__faixa`**, que leva a largura máxima no lugar do título, com o título à esquerda e o `<nav>` à direita; abaixo de `600px` os links descem para baixo do título (no mesmo ponto de quebra da lista). Isso muda o cabeçalho de `/` também: as capturas do esqueleto continuam referência do cabeçalho sem links, e as dos membros passam a ser a do cabeçalho com eles (docs/04). A faixa tem a mesma altura de antes em 1280.
* **Divergiu: um id que não é número** (`/api/membros/abc/suspensao`) vira `NaN` no `Number(id)`, como no catálogo, e o `UPDATE` não acha linha: `404`, `NaoEncontrado`.
* **A frase de `Falhou`** aparece uma vez só em `src/` (`src/lib/mensagemDeFalha.ts`). Os dois e2e (`catalogo.spec.ts`, já existente, e `membros.spec.ts`) a escrevem literal, porque conferem o texto que a bibliotecária lê; importar a constante tornaria a asserção circular.
* **Testes vistos vermelhos:** os quatro arquivos unitários dos membros, antes do código (o import, e na rota os `404` do Hono antes de a rota existir). O `e2e/membros.spec.ts` foi escrito depois da tela e visto vermelho rodando-o contra o `Aplicacao.tsx` anterior (10 falhas), que depois voltou. Os testes do catálogo passaram com só os imports mudados. Além do Pronto quando, os testes cobrem um `nome` que não é string e um corpo que não é JSON (`400`), suspender duas vezes pela rota (`200`), o `404` da reativação, o `500` no `GET`, no `POST` e na suspensão, e `inserirMembro` e `listarMembros` com o banco fechado.
* **A prova encontrou:**
  * `npm run verify` verde no Node 26.10 da máquina e no Node 24.21 (`npx -y -p node@24 npm run verify`): 80 testes unitários, 20 ponta a ponta (10 por projeto), build.
  * À mão: o `data/biblioteca.sqlite` deste worktree foi criado com o código de antes desta entrega (só a `0001`, `user_version` 1, dois livros e um exemplar). O `npm run dev` com esta entrega escreveu só `migração 0002-membros.sql`, e o `GET /api/livros` ficou idêntico, byte a byte. Cadastrados " Capitu ", " Bentinho " e " Escobar " (aparados) e suspenso o Bentinho, o `npm run dev` foi reiniciado: nenhuma migração aplicada, e o Bentinho continuava suspenso. Num banco novo, o terminal mostrou a `0001` e a `0002`, e `/membros` mostrou "Nenhum membro cadastrado ainda."; o banco com os três membros voltou depois.
  * Sem rolagem horizontal em `/membros` e em `/`, em 390 e 1280, também com um nome de 120 caracteres sem espaço e a matrícula 123456 (a lista falsificada por `page.route`).
  * As capturas `membros-390.png` e `membros-1280.png`, com o comando do docs/05 em `http://localhost:5173/membros`, contra o `npm run dev` com os três membros, o Bentinho suspenso: o mesmo formulário e a mesma lista das capturas do catálogo, o nome em negrito, a matrícula e a situação abaixo; o botão na linha em 1280 e abaixo do texto em 390; os links à direita do título em 1280 e abaixo dele em 390, "Membros" sublinhado. Tiradas uma vez. Em 390, `/` também foi conferido: "Catálogo" sublinhado e o catálogo como antes.
  * O `node --watch` que caiu durante o `catalogo` não caiu aqui: o `npm run dev` foi subido e parado três vezes, sem mudança de arquivo com ele aberto, então a ocorrência não foi reproduzida.
  * Scripts conferidos lendo o `package.json`: nenhum mudou, e nenhum usa `rm`, `&`, `printf` nem variável de ambiente inline (ADR-0005). Falta a pessoa rodar num Windows sem WSL.
* **Documentos:** os da lista; além deles, no docs/01, o `use<X>.ts` passou a citar o `chamar`, e no docs/04 as capturas do esqueleto passaram a ser "o cabeçalho, ainda sem os links". Os termos dos membros já estavam no docs/03, escritos antes desta página. Nenhum ADR: toda decisão desta entrega já estava na página ou é de estilo, registrada no docs/04.
