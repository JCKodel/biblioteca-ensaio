# emprestar-livro

A página do capítulo 14 do livro, literal no começo de cada seção; o que este repositório precisa a mais vem depois, sob "No repositório".

**Objetivo.** Um bibliotecário registra que um membro pegou um exemplar
emprestado, e o sistema recusa quando as regras dizem não.

**Comportamento.**
* Um membro sem livros atrasados pega um exemplar disponível, e o exemplar
  aparece como emprestado a ele, com devolução prevista para 21 dias depois.
* Um membro com um livro atrasado é recusado com "Devolva primeiro os seus
  livros atrasados."; nada é registrado.
* Dois bibliotecários emprestam o último exemplar no mesmo momento: um
  consegue e o outro vê "Este exemplar acabou de ser emprestado a outra pessoa."

No repositório:
* Um membro suspenso é recusado com "A sua matrícula está suspensa."; nada é registrado. Um membro suspenso e com livro atrasado vê só esta mensagem.
* O cabeçalho ganha um terceiro link, "Empréstimos", que leva a `http://localhost:5173/emprestimos`; "Catálogo" e "Membros" continuam como estão.
* Em `/emprestimos`: o formulário com a escolha "Membro" (cada opção "Capitu, Matrícula 7", todos os membros, ativos ou não), a escolha "Exemplar" (cada opção "Dom Casmurro, exemplar 3", só os exemplares sem empréstimo aberto) e o botão "Emprestar"; abaixo, a lista "Empréstimos abertos".
* "Emprestar" fica apagado até haver um membro e um exemplar escolhidos. Escolher um membro suspenso ou com livro atrasado mostra logo a mensagem da recusa abaixo do formulário e deixa "Emprestar" apagado (a tela decide com `podePegarEmprestado`); o servidor recusa do mesmo jeito se o pedido chegar assim mesmo.
* Depois de emprestar: as duas escolhas voltam ao vazio, o empréstimo aparece no topo de "Empréstimos abertos" com "Dom Casmurro, exemplar 3", "Capitu, Matrícula 7" e "Devolver até 22/10/2026" (o dia do empréstimo mais 21), e o exemplar sai da escolha "Exemplar". Tudo continua igual depois de recarregar a página ou reiniciar o `npm run dev`.
* No dia da devolução o membro ainda não está atrasado; no dia seguinte, está.
* Sem `RELOGIO_DE_TESTE`, o cabeçalho `x-hoje` é ignorado: o empréstimo é registrado com a data local do servidor, qualquer que seja o cabeçalho, válido ou não.
* Com `RELOGIO_DE_TESTE=cabecalho`, um `x-hoje` que não é uma data `AAAA-MM-DD` válida é respondido com `400` e nada é registrado.
* Um exemplar emprestado a outra pessoa enquanto a tela estava aberta: a recusa `JaEmprestado`, e o exemplar sai da escolha.
* Um membro ou um exemplar que não existe (um pedido feito fora da tela): "Este membro ou este exemplar não está cadastrado."; nada é registrado.
* O banco não responde: "Não foi possível acessar o banco da biblioteca. Tente de novo." e nada é registrado; o servidor escreve a mensagem do SQLite no terminal.
* Nada do catálogo nem dos membros muda, e o `npm run dev` num banco que já tem os dois aplica só a `0003`.

**Contrato.**
Tabela `emprestimo` (exemplar_id, membro_id, emprestado_em, devolver_em, devolvido_em anulável);
índice único em exemplar_id onde devolvido_em é nulo.
`emprestar(exemplar, membro, hoje): Result<Emprestimo, RecusaDeEmprestimo>` com
`RecusaDeEmprestimo = "TemLivrosEmAtraso" | "JaEmprestado" | "MembroSuspenso"`.

No repositório:
* Migração `migracoes/0003-emprestimos.sql`:

  ```sql
  CREATE TABLE emprestimo (
      id INTEGER PRIMARY KEY,
      exemplar_id INTEGER NOT NULL REFERENCES exemplar (id),
      membro_id INTEGER NOT NULL REFERENCES membro (id),
      emprestado_em TEXT NOT NULL,
      devolver_em TEXT NOT NULL,
      devolvido_em TEXT
  );
  CREATE UNIQUE INDEX emprestimo_aberto_por_exemplar ON emprestimo (exemplar_id) WHERE devolvido_em IS NULL;
  CREATE INDEX emprestimo_membro_id ON emprestimo (membro_id);
  ```

  As datas são `TEXT` `YYYY-MM-DD` (docs/03), que o SQLite compara na ordem certa. `user_version` passa a 3.
* Ids como no catálogo e nos membros: `INTEGER PRIMARY KEY` gerado pelo SQLite, `string` no TypeScript e no JSON. O `id` do empréstimo fica no banco e não entra no `Emprestimo` (docs/03 §Entidades).
* Tipos (docs/03):
  * em `src/features/membros/regras.ts`: `Membro = { id: string; emAtraso: number; suspenso: boolean }`, o recorte que a regra lê, ao lado do `MembroDoCadastro`.
  * `Exemplar = { id: string; livroId: string }`, o que já existe em `src/features/catalogo/regras.ts`, importado de lá.
  * em `src/features/emprestimos/regras.ts`: `Emprestimo = { exemplarId: string; membroId: string; emprestadoEm: string; devolverEm: string; devolvidoEm: string | null }`; `RecusaDeEmprestimo`; `EmprestimoAberto = { exemplarId: string; titulo: string; membroId: string; nome: string; devolverEm: string }`; `ExemplarDisponivel = { id: string; livroId: string; titulo: string }`; `MembroDoEmprestimo = { id: string; nome: string; emAtraso: number; suspenso: boolean }`.
* Casos de uso, `src/features/emprestimos/regras.ts`, puros:
  * `DIAS_DE_EMPRESTIMO = 21` e `dataDeDevolucao(hoje: string): string`, como no capítulo 4 (`setUTCDate` sobre `new Date(hoje)`, `toISOString().slice(0, 10)`).
  * `podePegarEmprestado(membro: Membro): Result<Membro, "TemLivrosEmAtraso" | "MembroSuspenso">`: `suspenso` → `MembroSuspenso`; senão `emAtraso > 0` → `TemLivrosEmAtraso`; senão o membro.
  * `emprestar(exemplar: Exemplar, membro: Membro, hoje: string): Result<Emprestimo, RecusaDeEmprestimo>`: a recusa de `podePegarEmprestado`, ou `{ exemplarId: exemplar.id, membroId: membro.id, emprestadoEm: hoje, devolverEm: dataDeDevolucao(hoje), devolvidoEm: null }`. `JaEmprestado` nunca sai daqui: só o banco o sabe.
  * `textoDaDevolucao(devolverEm: string): string`: `"2026-10-22"` → "Devolver até 22/10/2026".
  * `mensagens: Record<RecusaDeEmprestimo | "NaoEncontrado" | "Falhou", string>`, com os textos do docs/03, literais: "Devolva primeiro os seus livros atrasados.", "Este exemplar acabou de ser emprestado a outra pessoa.", "A sua matrícula está suspensa.", "Este membro ou este exemplar não está cadastrado." e, em `Falhou`, `MENSAGEM_DE_FALHA` de `src/lib/mensagemDeFalha.ts`.
* Orquestrador do servidor, `src/features/emprestimos/eventosDeEmprestimo.ts`, como no capítulo 7, síncrono, com os repositórios obrigatórios e o `estadoDe` de `src/lib/estadoDe.ts`:
  * `EmprestimoPedido = { exemplarId: string; membroId: string }`
  * `EstadoDoEmprestimo = { tipo: "Emprestado"; emprestimo: Emprestimo } | { tipo: "Recusado"; recusa: RecusaDeEmprestimo | "NaoEncontrado" } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
  * `RepositoriosDeEmprestimo = { buscarMembro(id: string): Result<Membro, "NaoEncontrado" | BancoDeDadosFalhou>; buscarExemplar(id: string): Result<Exemplar, "NaoEncontrado" | BancoDeDadosFalhou>; inserirEmprestimo(emprestimo: Emprestimo): Result<Emprestimo, "JaEmprestado" | BancoDeDadosFalhou> }`
  * `emprestimoPedido(evento, hoje, repositorios): EstadoDoEmprestimo`: `buscarMembro`, `buscarExemplar`, `emprestar`, `inserirEmprestimo`, nessa ordem, parando no primeiro erro; o corpo é o do capítulo 7.
* Repositório, `src/features/emprestimos/repositorio.server.ts`, cada função com o `db` primeiro e toda chamada ao banco dentro de `consultar`:
  * `buscarMembro(db, id: string, hoje: string): Result<Membro, "NaoEncontrado" | BancoDeDadosFalhou>`: o membro com `suspenso` booleano e `emAtraso` = quantos empréstimos dele têm `devolvido_em IS NULL AND devolver_em < hoje`. Nenhuma linha é `NaoEncontrado`.
  * `buscarExemplar(db, id: string): Result<Exemplar, "NaoEncontrado" | BancoDeDadosFalhou>`. Não olha empréstimos: quem sabe se o exemplar está livre é o índice.
  * `inserirEmprestimo(db, emprestimo: Emprestimo): Result<Emprestimo, "JaEmprestado" | BancoDeDadosFalhou>`: grava as cinco colunas e devolve o mesmo `Emprestimo`. Um `BancoDeDadosFalhou` cuja `mensagem` contém `UNIQUE constraint failed: emprestimo.exemplar_id` vira `JaEmprestado`; qualquer outro continua `BancoDeDadosFalhou`.
  * `listarEmprestimosAbertos(db): Result<EmprestimoAberto[], BancoDeDadosFalhou>`: os de `devolvido_em IS NULL`, com `livro.titulo` e `membro.nome`, do `emprestimo.id` maior para o menor.
  * `listarExemplaresDisponiveis(db): Result<ExemplarDisponivel[], BancoDeDadosFalhou>`: os exemplares sem empréstimo aberto, com `livro.titulo`, por `titulo COLLATE NOCASE` e depois `exemplar.id`.
  * `listarMembrosDoEmprestimo(db, hoje: string): Result<MembroDoEmprestimo[], BancoDeDadosFalhou>`: todos os membros, `emAtraso` contado como em `buscarMembro`, por `nome COLLATE NOCASE` e depois `membro.id`.
* **O relógio de teste**, decidido na raiz de composição:
  * Variável de ambiente `RELOGIO_DE_TESTE`, lida só por `src/iniciar.server.ts`. Com o valor `cabecalho`, o relógio de teste está ligado; ausente ou com qualquer outro valor, desligado. Ela é definida só no `env` do `webServer` do servidor no `playwright.config.ts`, ao lado de `BANCO` e `PORTA_DO_SERVIDOR`; nunca num script do `package.json` (ADR-0005), então o `npm run dev` nunca a tem.
  * `criarServidor(db, opcoes?: { relogioDeTeste: boolean })`, padrão `false`; repassa a `rotaDeEmprestimos(db, relogioDeTeste)`. O `iniciar.server.ts` passa `{ relogioDeTeste: process.env.RELOGIO_DE_TESTE === "cabecalho" }`.
  * Cabeçalho `x-hoje: AAAA-MM-DD`, por requisição. `lerHoje(xHoje: string | undefined, relogioDeTeste: boolean): Result<string, "HojeInvalido">`, em `rota.server.ts` (primeiro uso):
    * desligado: ignora `xHoje` e devolve a data local da máquina (`getFullYear`, `getMonth() + 1`, `getDate()`, com zeros à esquerda; não `toISOString`, que dá o dia de Greenwich e erra depois das 21h no Brasil);
    * ligado e sem cabeçalho: a data local, igual;
    * ligado e com cabeçalho: o valor, se casa `^\d{4}-\d{2}-\d{2}$` e é um dia que existe (`new Date(valor + "T00:00:00Z").toISOString().slice(0, 10) === valor`, então `2026-02-30` não passa); senão `HojeInvalido`, que a rota responde `400`, `{ "falha": "HojeInvalido" }`, sem tocar o banco.
  * O proxy do Vite (`/api`, http-proxy) repassa os cabeçalhos do pedido sem filtrar, `x-hoje` incluído; o e2e abaixo é a prova, e falha se não repassar.
* Rotas, `src/features/emprestimos/rota.server.ts`, `rotaDeEmprestimos(db, relogioDeTeste): Hono`, montada por `criarServidor` em `/api/emprestimos`. Cada requisição que precisa de `hoje` (o `POST` e o `GET /membros`) o lê uma vez com `lerHoje(c.req.header("x-hoje"), relogioDeTeste)`. Por isso o `POST` monta os `RepositoriosDeEmprestimo` dentro do handler, fechando sobre o `db` e esse `hoje` (`buscarMembro: (id) => buscarMembro(db, id, hoje)`), e não uma vez em `rotaDeEmprestimos(db)` como os membros fazem.

  | Rota | Pedido | Resposta |
  |---|---|---|
  | `GET /api/emprestimos` | nenhum | `200`, `EmprestimoAberto[]` |
  | `GET /api/emprestimos/exemplares` | nenhum | `200`, `ExemplarDisponivel[]` |
  | `GET /api/emprestimos/membros` | nenhum (`x-hoje` com o relógio de teste) | `200`, `MembroDoEmprestimo[]`, com `emAtraso` do `hoje` lido; `400`, `{ "falha": "HojeInvalido" }` |
  | `POST /api/emprestimos` | JSON `EmprestimoPedido` (`x-hoje` com o relógio de teste) | `201`, `Emprestimo`; `409`, `{ "recusa": RecusaDeEmprestimo }`; `404`, `{ "recusa": "NaoEncontrado" }`; `400`, `{ "falha": "HojeInvalido" }` |

  Como nos membros: uma falha do banco responde `500`, `{ "falha": "BancoDeDadosFalhou" }`, depois de `console.error` com a `mensagem`; um `exemplarId` ou `membroId` ausente ou que não é string é lido como string vazia, e um corpo que não é JSON como pedido vazio (`404`, `NaoEncontrado`); os `GET` chamam o repositório direto, sem orquestrador.
* **Terceira ocorrência: `falhou`.** A função que escreve a `mensagem` no terminal e responde `500` já está repetida em `catalogo/rota.server.ts` e `membros/rota.server.ts`; esta rota seria a terceira. Ela vai para `src/lib/falhou.server.ts`, com o comentário de primeiro uso (catálogo), segundo (membros, onde devia ter saído) e terceiro (empréstimos); as duas rotas passam a importá-la, sem mudar comportamento.
* Telas: `Aplicacao.tsx` ganha `{ caminho: "/emprestimos", nome: "Empréstimos" }` em `TELAS`, e `/emprestimos` mostra `TelaDeEmprestimo`. A tela escreve "Matrícula {id}" e "exemplar {id}" como a tela de membros escreve a matrícula; a data só por `textoDaDevolucao`.
* Cliente: `TelaDeEmprestimo.tsx`; o orquestrador do cliente é o hook `useEmprestimo()`, em `useEmprestimo.ts`, que chama as rotas com `chamar` e `await`, carrega as três listas, recarrega as três depois de cada `POST` (emprestado ou recusado), e publica o estado. A tela importa de `regras.ts` só `podePegarEmprestado`, `textoDaDevolucao` e `mensagens`; nunca um `.server.ts`.
* Os scripts do `package.json` e o `vite.config.ts` não mudam; o `playwright.config.ts` muda só no `env` do `webServer` do servidor, que ganha `RELOGIO_DE_TESTE: "cabecalho"`.

**Estados.** Os padrões.

No repositório, os padrões são os da tela de membros:
* Vazio: "Nenhum membro cadastrado ainda." e "Nenhum exemplar disponível." abaixo da escolha vazia, com "Emprestar" apagado; "Nenhum empréstimo aberto." no lugar da lista.
* Carregando: "Carregando os empréstimos." no lugar do formulário e da lista, só na primeira carga; durante um empréstimo, "Emprestar" fica apagado.
* Erro: uma lista não carrega, ou o empréstimo falha, ou o servidor não responde (offline é o mesmo caso): a mensagem de `Falhou`; as escolhas ficam como estavam.
* Recusa: a mensagem dela logo abaixo do formulário, com `role="alert"`; uma escolha que saiu da lista ao recarregar volta ao vazio.

**Referência visual.** A tela de empréstimo no arquivo de design, com 390 e
1280 pixels de largura.

No repositório não há arquivo de design (docs/05 §5): a referência é o estilo do docs/04 §Estilo visual e as capturas `work/done/membros-390.png` e `-1280.png`. O formulário é o dos membros, com as duas escolhas uma abaixo da outra e o botão; a lista é a dos membros, com o exemplar em destaque como o nome, o membro e a data de devolução abaixo. "Empréstimos" sublinhado no cabeçalho. Sem rolagem horizontal nas duas larguras, também com um título de 200 caracteres. As capturas são tiradas em `http://localhost:5173/emprestimos`. Novos valores de estilo entram como variáveis no `src/estilo.css` e no docs/04.

**Fora do escopo.**
* Devolver um exemplar: uma entrega própria, `devolver-livro`, a seguinte na fila.
* Reservas: não estão no docs/00.
* Multas: o docs/00 as lista como uma decisão em aberto, então ninguém decide isso aqui.

No repositório:
* Renovação e categorias de membro: o docs/00 diz que não existem.
* Escolher ou corrigir a data de devolução: o servidor a fixa (docs/02); nenhum cliente a envia.
* A lista dos atrasados, os empréstimos de um membro e a busca no catálogo: `lista-de-atrasos`, `emprestimos-do-membro` e `busca-no-catalogo`, Marco 2. As escolhas desta tela não têm busca: a lista de uma biblioteca pequena cabe nela.
* Atrasar um empréstimo no `npm run dev` sem o tempo passar: só o relógio de teste, que o `npm run dev` nunca liga; `dados-de-exemplo` (Marco 2) é a entrega que carrega empréstimos antigos.
* Email ao membro atrasado: OD-2.
* Ordem alfabética com acentos (um "Á" inicial vem depois do "Z" no SQLite): fica para a busca do Marco 2.
* Mover `naoEsperado` e `falsos` para `src/lib/`: o livro os escreve em cada arquivo de teste.

**Pronto quando.**
* [x] Os testes unitários de `emprestar` passam para as três linhas de Comportamento.
* [x] O teste do repositório prova que o índice único recusa o segundo empréstimo.
* [x] `npm run verify` está verde.
* [x] A tela de empréstimo confere com o design nas duas larguras.

No repositório, com os nomes do capítulo 8 onde o livro os dá:
* [x] `src/features/emprestimos/regras.test.ts`, só com dados: "emprestar recusa um membro com um livro atrasado"; "emprestar empresta por 21 dias a um membro sem nada atrasado" (`"2026-10-01"` → `devolverEm` `"2026-10-22"`); "emprestar recusa um membro suspenso"; "emprestar recusa pela suspensão um membro suspenso e atrasado"; `podePegarEmprestado` nos três casos; `dataDeDevolucao` atravessando o fim do mês e do ano (`"2026-12-20"` → `"2027-01-10"`); `textoDaDevolucao`.
* [x] `src/features/emprestimos/repositorio.server.test.ts`, num SQLite em memória com as migrações reais (`0001` a `0003`): "inserirEmprestimo recusa um segundo empréstimo aberto do mesmo exemplar" (`JaEmprestado`); um exemplar com empréstimo já devolvido (`devolvidoEm` preenchido no `Emprestimo` inserido) aceita um novo. O atraso sem relógio: o teste insere com `inserirEmprestimo` um `Emprestimo` antigo (`emprestadoEm: "2026-01-01"`, `devolverEm: "2026-01-22"`) e chama `buscarMembro(db, id, "2026-10-01")`: `emAtraso` 1; com `hoje` `"2026-01-22"`: 0; um devolvido não conta. `buscarMembro` e `buscarExemplar` de um id inexistente: `NaoEncontrado`. As três listas (o exemplar emprestado sai de `listarExemplaresDisponiveis`). Com o banco fechado, `BancoDeDadosFalhou` em vez de lançar.
* [x] `src/features/emprestimos/eventosDeEmprestimo.test.ts`, com `falsos` e `naoEsperado`, nunca mocks: "emprestimoPedido recusa um membro com um livro atrasado e não salva nada"; recusa um membro suspenso e não salva nada; um membro inexistente publica `Recusado` com `NaoEncontrado` sem buscar o exemplar; um pedido válido salva e publica `Emprestado` com `devolverEm` 21 dias depois do `hoje` passado; `JaEmprestado` de `inserirEmprestimo` publica `Recusado`; uma falha do banco publica `Falhou`.
* [x] `src/features/emprestimos/rota.server.test.ts`, contra `criarServidor` com um banco em memória, criando livro, exemplar e membro pelas rotas do catálogo e dos membros. Com `{ relogioDeTeste: true }`: `201` com `x-hoje: 2026-10-01` e `devolverEm` `"2026-10-22"`; `409` `TemLivrosEmAtraso` num segundo `POST` do mesmo membro, outro exemplar, com `x-hoje: 2026-10-30`, sem gravar nada (o `GET /api/emprestimos` continua com um só); com `x-hoje: 2026-10-22`, o mesmo membro ainda empresta; `400` `HojeInvalido` com `x-hoje: 2026-02-30` e com `x-hoje: ontem`, sem gravar nada. Sem o relógio de teste (`criarServidor(db)`): "sem RELOGIO_DE_TESTE, x-hoje é ignorado", um `POST` com `x-hoje: 2000-01-01` responde `201` com `emprestadoEm` igual à data local do teste, e um com `x-hoje: ontem` também responde `201`; `409` `MembroSuspenso` depois da suspensão; `409` `JaEmprestado` no segundo `POST` do mesmo exemplar; `404` para ids inexistentes e corpo que não é JSON; `500` com o banco fechado; os três `GET`.
* [x] `e2e/emprestimos.spec.ts`, nos dois projetos, cada teste criando o seu livro, exemplar e membro pela API com nomes únicos e achando-os pelo texto, nunca pela posição. O `hoje` de cada teste vem de `page.setExtraHTTPHeaders({ "x-hoje": ... })` na própria página, sem estado compartilhado entre os dois projetos, que rodam em paralelo no mesmo servidor. Os testes: com `x-hoje` `2026-10-01`, emprestar mostra o empréstimo em "Empréstimos abertos", achado pelo título e pelo nome únicos, com "Devolver até 22/10/2026", o exemplar some da escolha, e tudo continua depois de recarregar; "a tela de empréstimo diz a um membro com um livro atrasado que o devolva primeiro", sem `page.route`, pelo caminho inteiro: com `x-hoje` `2026-10-01` o membro pega o exemplar A; ainda em `2026-10-01` a bibliotecária escolhe o mesmo membro e o exemplar B ("Emprestar" aceso); o teste troca o cabeçalho para `2026-10-30` e clica "Emprestar": o servidor recusa e a tela mostra "Devolva primeiro os seus livros atrasados.", e B continua na escolha; recarregada a página em `2026-10-30`, escolher o membro mostra a mesma mensagem com "Emprestar" apagado (`emAtraso` da rota, `podePegarEmprestado` na tela); um membro suspenso pela rota dos membros mostra "A sua matrícula está suspensa." e "Emprestar" apagado, sem `page.route`; dois bibliotecários, duas páginas com o mesmo exemplar escolhido, a primeira empresta e a segunda lê "Este exemplar acabou de ser emprestado a outra pessoa.", sem `page.route`; um `500` no `GET /api/emprestimos` (por `page.route`) mostra a mensagem de `Falhou`; o link "Empréstimos" leva à tela. Os e2e do esqueleto, do catálogo e dos membros continuam passando.
* [x] Os testes do catálogo e dos membros passam sem mudar nenhuma asserção; nenhuma rota define mais `falhou`.
* [x] À mão: com o `data/biblioteca.sqlite` dos membros, `npm run dev` aplica só a `0003` (o terminal mostra `migração 0003-emprestimos.sql`); emprestar e reiniciar mantém o empréstimo. O atraso à mão, com o `npm run dev` parado, por um `node -e` com `DatabaseSync` no `data/biblioteca.sqlite`: `UPDATE emprestimo SET emprestado_em = '2026-01-01', devolver_em = '2026-01-22' WHERE exemplar_id = <id> AND devolvido_em IS NULL`; de volta ao `npm run dev`, escolher esse membro mostra "Devolva primeiro os seus livros atrasados." e um `POST /api/emprestimos` direto (curl) para ele responde `409` `TemLivrosEmAtraso`.
* [x] Capturas `work/done/emprestar-livro-390.png` e `-1280.png`, tiradas uma vez em `http://localhost:5173/emprestimos` contra o `npm run dev` com pelo menos dois empréstimos abertos e um exemplar disponível.
* [x] Documentos: docs/02 §Esquema (a tabela `emprestimo`, a `0003`, `user_version` 3; o parágrafo "A tabela de empréstimos, como o livro a desenha, chega com..." sai) e §O que o cliente pode chamar (as quatro rotas); docs/01 §Como o código é organizado (`falhou.server.ts` em `src/lib/` com as três ocorrências; o repositório do empréstimo recebe também `hoje`, `buscarMembro(db, id, hoje)`; a rota do empréstimo monta os repositórios por requisição, fechando sobre o `db` e o `hoje` lido) e §Como os dados são acessados (o mesmo, e `lerHoje`), e §Ambientes (a terceira variável, `RELOGIO_DE_TESTE`, e o cabeçalho `x-hoje`, só no e2e); docs/03 §Entidades conferido contra o construído; docs/04 se a tela trouxer estilo novo; docs/06 `[x] emprestar-livro`.

**Escolhas feitas sem a pessoa.**
* A página parte da do capítulo 14, palavra por palavra; as duas mensagens do Comportamento ganharam o ponto final do docs/03, onde elas são escritas uma vez. "A tela de empréstimo confere com o design" fica, e o "No repositório" da Referência visual diz o que é o design aqui.
* **Decidido pela pessoa:** o `Emprestimo` não tem `id` (`emprestar` o cria antes do banco e o capítulo 7 faz `inserirEmprestimo` receber e devolver o mesmo tipo); a tabela tem `id INTEGER PRIMARY KEY`, como em toda tabela daqui; o empréstimo aberto se acha pelo exemplar.
* **Decidido pela pessoa:** o relógio de teste. O e2e "a tela de empréstimo diz a um membro com um livro atrasado que o devolva primeiro" prova o caminho inteiro, como no capítulo 8, e não uma resposta falsificada. O relógio continua um valor, lido uma vez onde a requisição chega (capítulos 6 a 8): o que muda é só de onde a raiz de composição o lê, a máquina ou o cabeçalho, e isso é decidido na partida do servidor, por uma variável que só o `playwright.config.ts` define. Nenhuma regra, orquestrador ou repositório sabe que o cabeçalho existe.
* `hoje` chega ao repositório como parâmetro, `buscarMembro(db, id, hoje)`, e a rota fecha sobre ele por requisição: o relógio continua um valor, lido uma vez na chegada, e o teste do repositório passa a data que quiser. É a data local da máquina do servidor, escrita no docs/03.
* Suspensão antes do atraso, quando o membro tem os dois: devolver os livros não basta a um suspenso, então a mensagem útil é a da matrícula.
* `JaEmprestado` é reconhecido pela mensagem do SQLite que nomeia `emprestimo.exemplar_id`, sem mudar o `BancoDeDadosFalhou`; o teste do repositório contra o motor real a guarda.
* As três recusas respondem `409` (o estado do membro ou do exemplar impede), separadas do `400` de dados inválidos do catálogo e dos membros; `NaoEncontrado`, `404`, como lá.
* A tela usa `podePegarEmprestado` para apagar "Emprestar" e mostrar a mensagem antes do clique (docs/01, 02 e 03 o prometem); por isso a escolha de membros vem de uma rota própria, com `emAtraso`, e a de exemplares só traz os livres. Escolhas (`<select>`) em vez de digitar matrícula e número do exemplar: o mais simples que funciona para uma biblioteca pequena.
* Depois de emprestar, a tela mostra a lista "Empréstimos abertos", e não só um aviso: é o que faz "aparece como emprestado a ele" continuar verdadeiro depois de recarregar, e é de onde o `devolver-livro` vai partir.
* Uma mensagem nova no docs/03 para o `NaoEncontrado` do empréstimo, "Este membro ou este exemplar não está cadastrado.": o estado do capítulo 7 não diz qual dos dois faltou, e pela tela isso só acontece com um pedido feito à mão.
* A checagem à mão do atraso continua com o `UPDATE` retroativo, e não com o cabeçalho: o cabeçalho exigiria subir o `npm run dev` com `RELOGIO_DE_TESTE`, o que nenhum script faz e uma variável inline não faz no Windows (ADR-0005).
* `HojeInvalido` responde `{ "falha": ... }`, e não `{ "recusa": ... }`: não é uma regra da biblioteca dizendo não, é um pedido de teste mal formado. O nome fica fora das `mensagens` da tela, que nunca o envia.
* O e2e do empréstimo com sucesso também fixa `x-hoje`, para ler "Devolver até 22/10/2026" literal em vez de calcular a data no teste.
* `falhou` vai para `src/lib/` nesta entrega: é a terceira ocorrência, e a segunda passou sem a mudança.
* A migração se chama `0003-emprestimos.sql`, pela fatia e pela tabela, como `0002-membros.sql`.
* Os membros e os exemplares das escolhas vêm por nome e por título (`COLLATE NOCASE`), e não do mais recente para o mais antigo como as listas do catálogo e dos membros: numa escolha, a bibliotecária procura pelo nome.

**O que aconteceu.**
* **Construído como no Contrato:** a `0003-emprestimos.sql` literal (com tabs, como a `0001` e a `0002`); `regras.ts`, `eventosDeEmprestimo.ts`, `repositorio.server.ts`, `rota.server.ts`, `useEmprestimo.ts` e `TelaDeEmprestimo.tsx` em `src/features/emprestimos/`; o `Membro` ao lado do `MembroDoCadastro` em `membros/regras.ts`; o `Exemplar` importado do catálogo. `criarServidor(db, opcoes?)` monta `rotaDeEmprestimos(db, relogioDeTeste)` em `/api/emprestimos`, e o `iniciar.server.ts` lê `RELOGIO_DE_TESTE`. O `playwright.config.ts` mudou só no `env` do servidor; o `package.json` e o `vite.config.ts` não mudaram.
* **Terceira ocorrência, `falhou`:** foi para `src/lib/falhou.server.ts`, com o comentário dos três usos; o catálogo e os membros passaram a importá-la, e os testes deles passaram sem mudar nenhuma asserção. Nenhuma rota define mais `falhou`.
* **O código do livro, e onde ele diverge.** `dataDeDevolucao` e `DIAS_DE_EMPRESTIMO` (capítulo 4), os tipos `EmprestimoPedido`, `EstadoDoEmprestimo` e `RepositoriosDeEmprestimo` e o corpo de `emprestimoPedido` (capítulo 7), e `naoEsperado`, `falsos` e os dados dos testes do capítulo 8 estão como o livro os escreve; o Biome só quebrou as linhas longas e acrescentou `export`. As diferenças, todas forçadas pelo repositório ou pela página:
  * **`mensagens`, e não `mensagem`:** o capítulo 5 escreve `const mensagem: Record<RecusaDeEmprestimo, string>` com as três recusas. Aqui é `mensagens: Record<RecusaDeEmprestimo | "NaoEncontrado" | "Falhou", string>`, como em `catalogo/regras.ts` e `membros/regras.ts`, com `Falhou` vindo de `MENSAGEM_DE_FALHA` (`src/lib/mensagemDeFalha.ts`) e a mensagem nova do `NaoEncontrado`. Os três textos do livro estão literais.
  * **`estadoDe` de `src/lib/estadoDe.ts`:** o capítulo 7 define um `estadoDe` local, tipado para `EstadoDoEmprestimo`; o de `src/lib/` é o genérico `estadoDe<R extends string>`, que já existia (catálogo e membros). As oito linhas de `emprestimoPedido` não mudaram.
  * **`podePegarEmprestado` com a suspensão:** o capítulo 5 tem `Membro = { id, emAtraso }` e só `TemLivrosEmAtraso`; aqui o `Membro` tem `suspenso` (o dado do capítulo 8 já o tem) e a regra recusa `MembroSuspenso` antes do atraso, como a página decide.
  * **Os testes do capítulo 8 usam `test` e o nome inteiro:** o livro escreve `it("recusa um membro com um livro atrasado", ...)` dentro de `describe("emprestar")`; aqui é `test("emprestar recusa um membro com um livro atrasado", ...)`, como o docs/04 escreve o nome e como todo teste do repositório faz. O teste dos 21 dias mantém a asserção do livro (`resultado.ok && resultado.value.devolverEm`) e acrescenta uma com o `Emprestimo` inteiro.
* **Divergiu: `lerHoje` confere a data antes de `toISOString`.** A checagem da página, `new Date(valor + "T00:00:00Z").toISOString().slice(0, 10) === valor`, lança `RangeError` com um mês 13 (`2026-13-01`), que passa no `^\d{4}-\d{2}-\d{2}$`: o teste da rota viu `500` no lugar de `400`. Uma data inválida (`Number.isNaN(dia.getTime())`) agora é `HojeInvalido` antes da comparação, e o teste guarda o caso.
* **Divergiu na tela, sem mudar o que a página pede:** a opção vazia das escolhas não tem texto; "Nenhum membro cadastrado ainda." e "Nenhum exemplar disponível." são uma nota (`.formulario__nota`, sem margem) logo abaixo da escolha, fora do rótulo. A recusa de um pedido e a recusa que a tela calcula com `podePegarEmprestado` dividem o mesmo `role="alert"` (a do pedido primeiro), para nunca haver duas mensagens iguais depois de uma recusa do servidor. Uma lista que não carrega depois da primeira carga mantém as listas e as escolhas e mostra a mensagem de `Falhou` abaixo do formulário. O `Aplicacao.tsx` escolhe a tela por um mapa `TELA_DE`, no lugar do ternário de duas telas.
* **Testes vistos vermelhos:** os quatro arquivos unitários do empréstimo, cada um contra um esboço que lançava ou devolvia o estado errado (11, 6, 15 e 12 falhas), antes do código. O `e2e/emprestimos.spec.ts` foi visto vermelho contra o `Aplicacao.tsx` anterior (12 falhas), que depois voltou. Além do Pronto quando, os testes cobrem: a violação de chave estrangeira continua `BancoDeDadosFalhou` e não vira `JaEmprestado`; `suspenso` lido como booleano; o `POST` sem `x-hoje` com o relógio ligado usa a data local; o `GET /membros` conta o atraso pelo `x-hoje` (`2026-10-22`, 0; `2026-10-23`, 1) e responde `400` a `2026-13-01`; campos que não são string (`404`); os `500` dos quatro caminhos; os textos de `mensagens`.
* **O e2e:** `nomeUnico` ganhou um sufixo aleatório, porque um teste cria dois livros no mesmo milissegundo. Os dois bibliotecários são duas páginas de `browser.newPage()`, cada uma num contexto próprio; a segunda, depois da recusa, vê o exemplar sair da escolha e o empréstimo da primeira na lista. O teste do atraso também confere que o exemplar B não entrou em "Empréstimos abertos".
* **A prova encontrou:**
  * `npm run verify` verde no Node 26.10 da máquina e no Node 24.21 (`npx -y -p node@24 npm run verify`): 124 testes unitários em 14 arquivos, 32 ponta a ponta (16 por projeto), build.
  * À mão: o `data/biblioteca.sqlite` deste worktree foi criado com o código de antes desta entrega (`user_version` 2, três livros, cinco exemplares, quatro membros, o José Dias suspenso). O `npm run dev` com esta entrega escreveu só `migração 0003-emprestimos.sql`. Pelo `http://localhost:5173/api/emprestimos` (curl, pelo proxy do Vite): Capitu e Bentinho emprestaram (`201`, `emprestadoEm` 2026-10-02, a data local, e `devolverEm` 2026-10-23); José Dias, `409` `MembroSuspenso`; o exemplar 1 de novo, `409` `JaEmprestado`; o exemplar 99, `404` `NaoEncontrado`; um `POST` com `x-hoje: ontem`, `201` com a data local (o cabeçalho ignorado sem o relógio de teste). Reiniciado o `npm run dev`: nenhuma migração, os três empréstimos lá.
  * O atraso à mão: com o `npm run dev` parado, o `UPDATE` da página por `node -e` com `DatabaseSync` no exemplar 1 (1 linha); de volta ao `npm run dev`, escolher "Capitu, Matrícula 1" mostrou "Devolva primeiro os seus livros atrasados." com "Emprestar" apagado, a linha mostrou "Devolver até 22/01/2026", e um `POST` direto por curl respondeu `409` `TemLivrosEmAtraso`. Escolher o José Dias mostrou "A sua matrícula está suspensa." com "Emprestar" apagado.
  * Sem rolagem horizontal em `/emprestimos`, em 390 e 1280, com um título de 200 caracteres na escolha (escolhido) e na lista (as respostas acrescidas por `page.route`): `scrollWidth` igual à largura da janela.
  * As capturas `emprestar-livro-390.png` e `emprestar-livro-1280.png`, com o comando do docs/05 em `http://localhost:5173/emprestimos`, mais `--wait-for-selector=.emprestimos__lista` para não capturar "Carregando os empréstimos.", contra o `npm run dev` com três empréstimos abertos e dois exemplares disponíveis, antes do `UPDATE`: o formulário dos membros com as duas escolhas uma abaixo da outra e "Emprestar" apagado; a lista dos membros com o exemplar em negrito e o membro e a devolução abaixo; "Empréstimos" sublinhado, à direita em 1280 e abaixo do título em 390. A única diferença com as capturas dos membros é a altura da escolha nativa, um pouco menor que a do campo de texto.
  * Ao fim, o `npm run dev` parado e as portas 3000, 5173, 3100 e 5174 livres.
  * Scripts conferidos lendo o `package.json`: nenhum mudou, e nenhum usa `rm`, `&`, `printf` nem variável de ambiente inline; `RELOGIO_DE_TESTE` só aparece no `env` do `webServer` (ADR-0005).
* **Documentos:** os da lista. No docs/02, a tabela `emprestimo` com os índices, `user_version` 3, o parágrafo "A tabela de empréstimos, como o livro a desenha..." trocado pelo das datas e do `JaEmprestado`, as quatro rotas e as regras do pedido. No docs/01, `falhou.server.ts` na tabela de `src/lib/`, `buscarMembro(db, id, hoje)`, os repositórios do empréstimo montados por requisição, `lerHoje`, a terceira variável e `criarServidor(db, opcoes?)`. No docs/03, as Entidades conferidas contra o construído; só o termo "membro do cadastro" mudou de tempo. No docs/04, o terceiro link, a escolha como campo, a nota abaixo dela e as capturas desta entrega como referência; nenhuma variável nova. Nenhum ADR: toda decisão desta entrega já estava na página.
