# catalogo

**Objetivo.** A bibliotecária cadastra os livros da biblioteca, acrescenta a cada um os exemplares que existem na estante, um de cada vez, e vê a lista dos livros com quantos exemplares cada um tem.

**Comportamento.**
* Em `http://localhost:5173`, abaixo do cabeçalho, está a tela do catálogo: o formulário "Título", "Autor", "Ano (opcional)" e o botão "Cadastrar livro"; abaixo dele, a lista "Livros".
* A bibliotecária preenche título e autor, deixa o ano em branco e cadastra: o formulário se esvazia e o livro aparece no topo da lista com título, autor e "nenhum exemplar".
* Com o ano preenchido, a lista mostra o ano ao lado do autor; sem ano, não mostra nada no lugar dele.
* Espaços antes e depois do título, do autor e do ano são descartados.
* Título em branco (ou só espaços), ou com mais de 200 caracteres: o livro não é cadastrado, aparece "Informe o título, com até 200 caracteres." e o formulário guarda o que foi digitado. O mesmo para o autor, com "Informe o autor, com até 200 caracteres.". Os dois errados: só a mensagem do título.
* Ano com letras, zero ou mais de quatro algarismos: não cadastra, e aparece "O ano é um número de até quatro algarismos, ou fica em branco.".
* Cada livro da lista tem o botão "Adicionar exemplar"; cada clique cadastra um exemplar daquele livro, e o texto passa de "nenhum exemplar" a "1 exemplar" e a "2 exemplares".
* Dois livros podem ter o mesmo título e o mesmo autor (duas edições): os dois aparecem.
* A lista vem do livro cadastrado mais recentemente para o mais antigo, e continua igual depois de recarregar a página ou reiniciar o `npm run dev`.
* O banco não responde: aparece "Não foi possível acessar o banco da biblioteca. Tente de novo." e nada é registrado; o servidor escreve a mensagem do SQLite no terminal.
* `npm run e2e` grava num banco próprio, em memória, num servidor e num cliente próprios: rodado com o `npm run dev` aberto, o catálogo do `npm run dev` continua igual. No Windows sem WSL, também.

**Contrato.**
* Migração `migracoes/0001-catalogo.sql`, a primeira do projeto:

  ```sql
  CREATE TABLE livro (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL,
      ano INTEGER
  );
  CREATE TABLE exemplar (
      id INTEGER PRIMARY KEY,
      livro_id INTEGER NOT NULL REFERENCES livro (id)
  );
  CREATE INDEX exemplar_livro_id ON exemplar (livro_id);
  ```

  Os limites de título, autor e ano ficam na regra (`validarLivro`), não no banco. A chave estrangeira vale porque o `DatabaseSync` as liga por padrão.
* Ids: `INTEGER PRIMARY KEY` no banco, gerados pelo SQLite; `string` no TypeScript e no JSON (`"7"`), como no docs/03 (`{ id, livroId }`). O repositório converte nas duas direções.
* Tipos (docs/03):
  * `Livro = { id: string; titulo: string; autor: string; ano: number | null }`
  * `Exemplar = { id: string; livroId: string }`
  * `LivroDoCatalogo = Livro & { totalDeExemplares: number }`
  * `CadastroDeLivroPedido = { titulo: string; autor: string; ano: string }` (como digitado; `ano` vazio é sem ano)
  * `DadosDoLivro = { titulo: string; autor: string; ano: number | null }`
  * `RecusaDeLivro = "TituloInvalido" | "AutorInvalido" | "AnoInvalido"`
  * `CadastroDeExemplarPedido = { livroId: string }`
  * `EstadoDoCadastroDeLivro = { tipo: "Cadastrado"; livro: Livro } | { tipo: "Recusado"; recusa: RecusaDeLivro } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
  * `EstadoDoCadastroDeExemplar = { tipo: "Cadastrado"; exemplar: Exemplar } | { tipo: "Recusado"; recusa: "NaoEncontrado" } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
  * `BancoDeDadosFalhou = { codigo: "BancoDeDadosFalhou"; mensagem: string }`, como no capítulo 5 do livro.
* Casos de uso, `src/features/catalogo/regras.ts`, puros:
  * `validarLivro(pedido: CadastroDeLivroPedido): Result<DadosDoLivro, RecusaDeLivro>`: apara os três campos; título e autor com 1 a 200 de `length`; ano vazio vira `null`, senão só algarismos, 1 a 4 deles, valor de 1 a 9999. Confere título, autor e ano, nessa ordem, e devolve a primeira recusa.
  * `textoDeExemplares(total: number): string`: 0 → "nenhum exemplar", 1 → "1 exemplar", n → "n exemplares".
  * `mensagens: Record<RecusaDeLivro | "NaoEncontrado" | "Falhou", string>`, com os textos do docs/03, literais.
* Repositório, `src/features/catalogo/repositorio.server.ts`, cada função com o `db` primeiro e toda chamada ao banco dentro de `consultar`:
  * `inserirLivro(db, dados: DadosDoLivro): Result<Livro, BancoDeDadosFalhou>`
  * `buscarLivro(db, id: string): Result<Livro, "NaoEncontrado" | BancoDeDadosFalhou>`
  * `inserirExemplar(db, livroId: string): Result<Exemplar, BancoDeDadosFalhou>`
  * `listarLivros(db): Result<LivroDoCatalogo[], BancoDeDadosFalhou>`, ordenada por `livro.id` decrescente, com `totalDeExemplares` contado no SQL (0 para um livro sem exemplar).
  * `RepositoriosDoCatalogo = { inserirLivro, buscarLivro, inserirExemplar }`, as três sem o `db`, que a rota fecha.
* Orquestradores, `src/features/catalogo/eventosDeCatalogo.ts`, síncronos, com os repositórios obrigatórios: `cadastroDeLivroPedido(evento, repositorios): EstadoDoCadastroDeLivro` (valida; recusado, não chama `inserirLivro`) e `cadastroDeExemplarPedido(evento, repositorios): EstadoDoCadastroDeExemplar` (`buscarLivro`, depois `inserirExemplar`). Nenhum lê `hoje`: nenhuma regra do catálogo depende da data.
* Rotas, `src/features/catalogo/rota.server.ts`, `rotaDoCatalogo(db): Hono`, montada por `criarServidor(db)` em `/api/livros` (sai o `biome-ignore` do parâmetro `db`):

  | Rota | Pedido | Resposta |
  |---|---|---|
  | `GET /api/livros` | nenhum | `200`, `LivroDoCatalogo[]` |
  | `POST /api/livros` | JSON `CadastroDeLivroPedido` | `201`, `Livro`; `400`, `{ "recusa": RecusaDeLivro }` |
  | `POST /api/livros/:livroId/exemplares` | sem corpo | `201`, `Exemplar`; `404`, `{ "recusa": "NaoEncontrado" }` |

  Em qualquer uma, uma falha do banco responde `500`, `{ "falha": "BancoDeDadosFalhou" }`, depois de `console.error` com a `mensagem`, que não vai na resposta. No `POST /api/livros`, um campo ausente ou que não é string é lido como string vazia; um corpo que não é JSON faz o `c.req.json()` lançar, e a rota traduz essa exceção, ali mesmo, num pedido vazio (a fronteira HTTP é a outra borda com o mundo de fora, capítulo 5 do livro), então a resposta é `400` com `TituloInvalido`. O `GET` chama `listarLivros` direto, sem orquestrador.
* `Result`, `ok` e `err` nascem aqui, em `src/features/catalogo/result.ts`, com o tipo do capítulo 5 do livro. `consultar` e `BancoDeDadosFalhou` nascem em `repositorio.server.ts`, o único arquivo que os usa. É a primeira ocorrência concreta neste repositório; a segunda deve ser `membros`, que os move para `src/lib/result.ts` e `src/lib/consultar.server.ts` e diz que a primeira foi esta. Um comentário em cada um diz isso.
* Cliente: `TelaDeCatalogo.tsx`, renderizada por `Aplicacao.tsx` dentro de `<main>`; o orquestrador do cliente é o hook `useCatalogo()`, em `useCatalogo.ts`, que chama as rotas com `fetch` e `await`, recarrega a lista depois de cada cadastro e publica o estado. A tela importa de `regras.ts` só `textoDeExemplares` e `mensagens`; nunca um `.server.ts`.
* Banco do e2e: `src/iniciar.server.ts` lê duas variáveis de ambiente opcionais, `BANCO` (caminho do arquivo, relativo à raiz do repositório, ou `:memory:`, que não cria a pasta `data/`; padrão `data/biblioteca.sqlite`) e `PORTA_DO_SERVIDOR` (padrão `3000`); o `vite.config.ts` repassa `/api` para `http://localhost:${PORTA_DO_SERVIDOR ?? 3000}`. No `playwright.config.ts`, que é TypeScript e não um script do `package.json`, o `webServer` passa `env: { BANCO: ":memory:", PORTA_DO_SERVIDOR: "3100" }` ao servidor e `{ PORTA_DO_SERVIDOR: "3100" }` ao cliente, espera o servidor em `http://localhost:3100/api/saude`, sobe o Vite com `npx vite --port 5174 --strictPort`, usa `baseURL` `http://localhost:5174` e `reuseExistingServer: false` nos dois. Os scripts do `package.json` não mudam.

**Estados.**
* Vazio: "Nenhum livro no catálogo ainda." no lugar da lista.
* Carregando: "Carregando o catálogo." no lugar da lista; durante um cadastro, o botão que o disparou fica desabilitado.
* Erro: a lista não carrega, ou um cadastro falha, ou o servidor não responde (offline é o mesmo caso): a mensagem de `Falhou`; num cadastro, o formulário guarda o que foi digitado.
* Recusa: a mensagem dela, logo abaixo do formulário, com `role="alert"`.

**Referência visual.** O estilo do esqueleto (docs/04 §Estilo visual) e as capturas `work/done/esqueleto-390.png` e `-1280.png`: os campos um abaixo do outro, com o rótulo acima, ocupando a largura em 390; a lista como linhas simples, o botão "Adicionar exemplar" na mesma linha em 1280 e abaixo do texto em 390. Sem rolagem horizontal nas duas larguras. Novos valores de estilo entram como variáveis no `src/estilo.css` e no docs/04.

**Fora do escopo.**
* Editar ou remover um livro ou um exemplar: a bibliotecária não pediu; entra numa entrega própria se for preciso.
* Ver os exemplares um a um, com o número de cada um: quem precisa disso é `emprestar-livro`, que decide como o exemplar é escolhido.
* ISBN, editora, edição: a pessoa disse que não há ISBN; título, autor e ano bastam.
* Busca e filtro na lista: `busca-no-catalogo`, Marco 2.
* Paginação: o catálogo de uma biblioteca pequena cabe numa lista.
* Recusar livro repetido: duas edições têm o mesmo título e autor.
* Acrescentar vários exemplares de uma vez: um de cada vez basta (a pessoa).
* Navegação entre telas: há uma tela só até `membros`.
* Validação no cliente antes de enviar: o servidor decide e a tela mostra a recusa.
* Portas e banco separados por worktree para o `npm run dev`: uma entrega própria (ADR-0003).

**Pronto quando.**
* [x] `regras.test.ts`, só com dados: `validarLivro` apara os campos; recusa título vazio, só de espaços e com 201 caracteres, e aceita 200; o mesmo para o autor; com título e autor errados, recusa pelo título; ano em branco é `null`; recusa "abc", "0" e "12345"; aceita "1899". `textoDeExemplares` com 0, 1 e 2.
* [x] `repositorio.server.test.ts`, num SQLite em memória com as migrações reais: `inserirLivro` devolve o livro com um id string; `listarLivros` devolve o mais recente primeiro, com 0 e com 2 exemplares; `buscarLivro` de um id inexistente devolve `NaoEncontrado`; `inserirExemplar` em livro inexistente devolve `BancoDeDadosFalhou` (a chave estrangeira); com o banco fechado, `consultar` devolve `BancoDeDadosFalhou` em vez de lançar.
* [x] `eventosDeCatalogo.test.ts`, com `falsos` e `naoEsperado`, nunca mocks: um pedido recusado não chama `inserirLivro`; um pedido válido salva os dados aparados e publica `Cadastrado`; uma falha do banco publica `Falhou`; um exemplar de livro inexistente publica `Recusado` com `NaoEncontrado` e não chama `inserirExemplar`.
* [x] `rota.server.test.ts`, contra `criarServidor` com um banco em memória: as respostas do Contrato (201, 400 com a recusa, 404, a lista com o total).
* [x] `e2e/catalogo.spec.ts`, nos dois projetos, com um título único por teste, sem supor o catálogo vazio e achando o livro pelo título, nunca pela posição (os dois projetos gravam no mesmo servidor ao mesmo tempo): cadastrar um livro e acrescentar dois exemplares mostra "2 exemplares"; título em branco mostra a recusa; um `500` no `GET /api/livros` (por `page.route`) mostra a mensagem de `Falhou`. O `e2e/esqueleto.spec.ts` continua passando na porta 5174.
* [x] `npm run verify` está verde.
* [x] À mão: com o `npm run dev` aberto e um livro cadastrado, `npm run e2e` passa e o catálogo do `npm run dev` continua com o mesmo livro; reiniciado o `npm run dev`, o livro continua lá e o terminal não aplica a `0001` de novo. O livro recém cadastrado aparece no topo. Num banco novo, a tela mostra o estado vazio.
* [x] Capturas `work/done/catalogo-390.png` e `-1280.png`, tiradas uma vez contra o `npm run dev` com três livros, um deles sem exemplar.
* [x] Documentos: docs/02 §Esquema (as tabelas, a `0001`, e o banco escolhido por `BANCO`) e §O que o cliente pode chamar (as três rotas); docs/01 §Ambientes (o servidor e o cliente do e2e, portas 3100 e 5174, banco em memória; `BANCO` e `PORTA_DO_SERVIDOR`); docs/01 §Como o código é organizado (o orquestrador do cliente em `use<X>.ts`, ao lado de `eventosDe<X>.ts`); docs/04 §Línguas (o prefixo `use` dos hooks React fica em inglês), §Nomes (`use<X>.ts`) e §Testes (o e2e não supõe o banco vazio nem a posição); docs/06 `[x] catalogo`.
* [ ] A pessoa rodou `npm run verify` num Windows sem WSL.

**Escolhas feitas sem a pessoa.**
* `Result`, `ok` e `err` nascem no catálogo, e não em `emprestimos/regras.ts` como no capítulo 4 do livro: aqui o catálogo é a primeira fatia com uma regra que recusa e com um repositório, e a regra do kit é a segunda ocorrência concreta, não o arquivo que o livro usou para contar a história. Ficam num arquivo próprio da fatia, `result.ts`, porque `regras.ts` e o repositório os usam, e o movimento para `src/lib/` vira um `git mv`. `consultar` fica dentro do repositório, o único que o usa.
* O banco do e2e é `:memory:`, e não um segundo arquivo: começa vazio a cada rodada sem nada para apagar, e no Windows um arquivo SQLite aberto por um servidor que ficou para trás não se apaga. As portas próprias (3100 e 5174) e `reuseExistingServer: false` impedem o e2e de reaproveitar o `npm run dev` e gravar no banco dele.
* As variáveis vão pelo `env` do `webServer` do Playwright, que o Node repassa igual em todo sistema; nenhum script do `package.json` ganha variável inline (ADR-0005).
* Ids `INTEGER` no banco e `string` no código: números curtos, que o SQLite gera e que servem para ordenar, e o tipo do docs/03 e dos testes do livro.
* A lista do mais recente para o mais antigo, e não por título: a ordenação do SQLite por texto põe "Água" depois de "Zorro", e o livro que a bibliotecária acabou de cadastrar fica à mão para receber exemplares.
* `ano` chega como a string digitada, e a regra o converte: a validação fica num lugar só, e o cliente não decide o que é um número.
* No `POST /api/livros`, um campo que não é string vira string vazia: um `ano` enviado como número (`1899`) vira sem ano. O cliente sempre manda strings.
* Uma recusa por vez (a primeira de título, autor e ano): o formulário mostra uma mensagem só.
* Os limites de 200 caracteres contam o `length` do JavaScript.
* Adicionar um exemplar busca o livro antes de inserir (`NaoEncontrado` como recusa), como o `emprestimoPedido` do capítulo 7; a chave estrangeira fica como garantia do banco.
* O `GET /api/livros` chama o repositório direto, sem orquestrador nem caso de uso: listar não é um evento que leva a um estado novo, e nada no FOCUS existe por cerimônia (capítulo 7).
* O hook do cliente se chama `useCatalogo`: o React e o Biome só reconhecem um hook pelo prefixo `use`.
* A mensagem de `NaoEncontrado` de um livro é nova no docs/03; o docs/03 ganhou os termos do catálogo antes desta página.

**O que aconteceu.**
* **Construído como no Contrato:** a `0001-catalogo.sql` literal; `result.ts`, `regras.ts`, `repositorio.server.ts` (com `consultar` e `BancoDeDadosFalhou`), `eventosDeCatalogo.ts`, `rota.server.ts`, `useCatalogo.ts` e `TelaDeCatalogo.tsx` em `src/features/catalogo/`; `criarServidor` monta a rota em `/api/livros` e perdeu o `biome-ignore`. `result.ts` e o repositório dizem, num comentário, que esta é a primeira ocorrência e que `membros` os move para `src/lib/`. Os tipos de domínio ficam em `regras.ts`, os estados em `eventosDeCatalogo.ts`, `RepositoriosDoCatalogo` no repositório. Os scripts do `package.json` não mudaram.
* **Divergiu: `estadoDe` só separa recusa de falha onde há as duas.** Onde o repositório só pode devolver `BancoDeDadosFalhou` (`inserirLivro`, `inserirExemplar`), o orquestrador publica `Falhou` direto: o `estadoDe` genérico não infere o tipo da recusa quando não há nenhuma, e o TypeScript recusava o estado.
* **Divergiu: o cliente tem um `try`/`catch` em `chamar`, dentro de `useCatalogo.ts`.** A rede é a borda do cliente com o mundo de fora: um servidor que não responde, ou uma resposta que não é JSON, vira `null`, e a tela mostra a mensagem de `Falhou` (o estado offline da página). O hook publica a recusa ou a falha como chave (`AvisoDoCatalogo`), e a tela escreve `mensagens[aviso]`; a recusa ou falha de um exemplar aparece no mesmo lugar, abaixo do formulário. Enquanto a lista recarrega depois de um cadastro, a tela mantém a lista anterior; "Carregando o catálogo." só aparece na primeira carga.
* **Divergiu: o repositório converte o id com `Number(id)`.** Um id que não é número (`/api/livros/abc/exemplares`) vira `NaN`, que o SQLite lê como nulo: `buscarLivro` devolve `NaoEncontrado` e a rota responde `404`.
* **Divergiu: saiu o `migracoes/.gitkeep`**, que só existia para a pasta vazia; `lerMigracoes` já o ignorava.
* **Divergiu, achado pela captura: o conteúdo não alinhava com o título do cabeçalho em 1280** (16 px para dentro, porque o `.conteudo` punha a margem dentro dos 960 px e o cabeçalho, fora). Com a tela do esqueleto vazia, não aparecia. O `.conteudo` passou a ter `max-width: calc(var(--largura-maxima) + 2 * var(--margem))`; em 390 nada muda. As capturas foram tiradas de novo depois da correção, então duas vezes, e não uma.
* **Estilo novo:** `--cor-da-borda` `#767676` (4,5:1), `--cor-da-divisoria` `#dddddd`, `--cor-do-aviso` `#a4262c` (7,3:1), `--espaco` `8px`, `--raio` `4px`, `--largura-do-formulario` `480px`, o `h2` em `1.25rem` e o ponto de quebra de `600px` (fixo: media query não lê variável), todos no docs/04 §Estilo visual. O ano aparece depois do autor, com vírgula: "Machado de Assis, 1899". O campo do ano é texto com `inputMode="numeric"`, para o servidor decidir (e recusar "abc").
* **Testes vistos vermelhos:** os quatro arquivos unitários falharam antes do código (o import, e na rota os `404` do Hono antes de as rotas existirem). O `e2e/catalogo.spec.ts` não: foi escrito depois da tela e passou na primeira rodada. Além do Pronto quando, os testes cobrem `buscarLivro` e `inserirExemplar` felizes, um corpo que não é JSON (`400`, `TituloInvalido`), um `ano` numérico lido como sem ano, e o `500` sem a mensagem do SQLite, que vai para o `console.error`.
* **A prova encontrou:**
  * `npm run verify` verde no Node 26.10 da máquina e no Node 24.21 (`npx -y -p node@24 npm run verify`): 50 testes unitários, 10 ponta a ponta (5 por projeto), build. O `webServer` do Playwright junta o `env` dele ao `process.env` (conferido no código do Playwright), então o `PATH` e o Node 24 chegam ao servidor do e2e.
  * À mão, contra o `npm run dev` num banco novo: a tela mostra "Nenhum livro no catálogo ainda." e o terminal mostra `migração 0001-catalogo.sql`. Com "Dom Casmurro" e dois exemplares cadastrados, `npm run e2e` passou (10) e o `GET /api/livros` do `npm run dev` ficou idêntico, byte a byte. Reiniciado o `npm run dev`, o livro continuava lá e o terminal não aplicou a `0001` de novo. Cadastrados "Iracema" (sem ano, um exemplar) e "Memórias póstumas de Brás Cubas" (1881, nenhum), o mais recente veio no topo.
  * Offline, com um Vite sozinho repassando `/api` a uma porta sem servidor: a lista mostra a mensagem de `Falhou`, e um cadastro mostra a mesma mensagem com `role="alert"` e guarda o que foi digitado.
  * Sem rolagem horizontal em 390 e 1280, também com um título e um autor de 200 caracteres sem espaço (a lista falsificada por `page.route`).
  * As capturas `catalogo-390.png` e `catalogo-1280.png`, com o comando do docs/05 contra o `npm run dev` com os três livros, um sem exemplar: campos um abaixo do outro com o rótulo acima, ocupando a largura em 390; em 1280, o formulário com até 480 px e o botão "Adicionar exemplar" na mesma linha; em 390, abaixo do texto. Em 390, o último botão fica no limite dos 844 px da captura; a página rola, e isso não é defeito.
  * Scripts conferidos lendo o `package.json`: nenhum mudou, e nenhum usa `rm`, `&`, `printf` nem variável de ambiente inline; os comandos do `webServer` também não, e as variáveis do e2e vão pelo `env` dele. Falta a pessoa rodar num Windows sem WSL.
* **Documentos:** os da lista; além deles, o docs/04 §Estilo visual (as variáveis novas e as capturas do catálogo como referência de formulário e lista) e, no docs/02, as rotas com a resposta de falha. Nenhum ADR: toda decisão desta entrega já estava na página ou é de estilo, registrada no docs/04.
