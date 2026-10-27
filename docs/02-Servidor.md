# Servidor

O servidor Node (Hono, `node:sqlite`) guarda as regras que o cliente não pode duplicar nem contornar. O cliente pode usar `podePegarEmprestado` para decidir o que mostrar; quem decide é o servidor.

## O que o servidor garante

* **A regra do empréstimo.** O servidor roda `emprestar` em todo empréstimo; um membro com livros em atraso ou suspenso é recusado ali, seja o que for que o cliente mostrou.
* **A data de devolução.** O servidor fixa `devolver_em` quando registra um empréstimo: o `hoje` lido na chegada da requisição mais o prazo de empréstimo (docs/03). Nenhum cliente envia nem muda essa data.
* **Os livros em atraso.** O repositório calcula `emAtraso` com `hoje`, a partir dos empréstimos abertos com `devolver_em < hoje`; o número não é guardado.
* **Um empréstimo aberto por exemplar.** Um índice único no banco recusa um segundo empréstimo aberto do mesmo exemplar, o único lugar onde dois bibliotecários no mesmo instante não competem; o repositório transforma a violação em `JaEmprestado`.
* **A devolução.** O servidor fixa `devolvido_em` quando registra uma devolução: o `hoje` lido na chegada da requisição, o mesmo `lerHoje` do empréstimo. Nenhum cliente envia nem muda essa data. Uma devolução depois da data de devolução é aceita e registrada como as outras, sem multa (OD-1).
* **Uma devolução por empréstimo.** O repositório só grava onde `devolvido_em IS NULL` e conta as linhas mudadas: dois pedidos para o mesmo empréstimo não o encerram duas vezes, e o segundo é `JaDevolvido`, sem mudar nada no banco. É o lugar onde dois bibliotecários não competem, como o índice no `JaEmprestado`.

## Esquema

Migrações em arquivos SQL numerados, aplicadas em ordem na partida do servidor; os testes de repositório rodam as mesmas migrações num SQLite em memória. Cada entrega que cria ou muda uma tabela escreve a sua migração e atualiza esta seção.

* **Os arquivos:** `migracoes/NNNN-descricao.sql`, quatro dígitos a partir de `0001`, sem buraco nem repetição. Dois arquivos com o mesmo número, um número faltando ou um `.sql` fora do formato impedem a partida, com uma mensagem que nomeia os arquivos; assim, duas entregas paralelas que criem a mesma `0002` falham na partida, e não em silêncio.
* **O controle:** a última migração aplicada é anotada em `PRAGMA user_version`, sem tabela de controle. Na partida, `aplicarMigracoes` (`src/banco.server.ts`) roda, em ordem, as de número acima dele, cada uma numa transação com a sua anotação, e escreve no terminal o nome de cada uma antes de rodá-la.
* **Uma migração com erro** derruba a partida: o executor não captura exceções, o terminal mostra o nome do arquivo e o erro do SQLite, e o SQLite desfaz a transação aberta, então nada dela fica gravado.
* **O banco:** aberto com `DatabaseSync` só por `abrirBanco(raiz, banco)` (`src/banco.server.ts`), que também aplica as migrações pendentes, com as chaves estrangeiras ligadas (o padrão do `DatabaseSync`). Duas raízes de composição o chamam: `src/iniciar.server.ts`, na partida do servidor, e `scripts/dadosDeExemplo.ts`, o comando dos dados de exemplo (docs/manuals/dados-de-exemplo.md), que abre sempre `data/biblioteca.sqlite` e ignora `BANCO`. O comando grava numa transação só, por isso, com o `npm run dev` gravando no mesmo instante, pode falhar com `database is locked` sem mudar nada; o servidor e o comando não esperam um pelo outro. A variável de ambiente opcional `BANCO` o escolhe: um caminho relativo à raiz do repositório, ou `:memory:`, um banco em memória que começa vazio e não cria a pasta `data/` (o do e2e, docs/01 §Ambientes). Sem ela, é `data/biblioteca.sqlite`.
* **Hoje:** `user_version` 3, com a `0001-catalogo.sql`, a `0002-membros.sql` e a `0003-emprestimos.sql`.

As tabelas, por migração:

| Migração | Tabela | Colunas | Entrega |
|---|---|---|---|
| `0001-catalogo.sql` | `livro` | `id` `INTEGER PRIMARY KEY`, `titulo` `TEXT NOT NULL`, `autor` `TEXT NOT NULL`, `ano` `INTEGER` anulável | `catalogo` |
| `0001-catalogo.sql` | `exemplar` | `id` `INTEGER PRIMARY KEY`, `livro_id` `INTEGER NOT NULL REFERENCES livro (id)`, com o índice `exemplar_livro_id` | `catalogo` |
| `0002-membros.sql` | `membro` | `id` `INTEGER PRIMARY KEY`, `nome` `TEXT NOT NULL`, `suspenso` `INTEGER NOT NULL DEFAULT 0` | `membros` |
| `0003-emprestimos.sql` | `emprestimo` | `id` `INTEGER PRIMARY KEY`, `exemplar_id` `INTEGER NOT NULL REFERENCES exemplar (id)`, `membro_id` `INTEGER NOT NULL REFERENCES membro (id)`, `emprestado_em` `TEXT NOT NULL`, `devolver_em` `TEXT NOT NULL`, `devolvido_em` `TEXT` anulável; o índice único `emprestimo_aberto_por_exemplar` em `exemplar_id` onde `devolvido_em IS NULL`, e o índice `emprestimo_membro_id` | `emprestar-livro` |

Os ids são gerados pelo SQLite e viram `string` no código e no JSON (`"7"`); o repositório converte nas duas direções. Os limites de título, autor e ano ficam na regra (`validarLivro`, docs/03), não no banco. Dois livros podem ter o mesmo título e o mesmo autor.

O SQLite não tem booleano: o repositório dos membros grava `suspenso` como `0` ou `1` e o lê como `boolean`, no mesmo lugar em que converte o id. O limite do nome fica na regra (`cadastrar`, docs/03), não no banco; dois membros podem ter o mesmo nome. A matrícula que a tela mostra é o `id` do membro, e a `emprestimo.membro_id` o referencia.

As datas do empréstimo são `TEXT` `YYYY-MM-DD` (docs/03), que o SQLite compara na ordem certa: `emAtraso` é a contagem dos empréstimos abertos do membro com `devolver_em < hoje`, feita pelo repositório a cada leitura e nunca guardada. O `id` do empréstimo fica no banco e não entra no `Emprestimo` (docs/03 §Entidades): o empréstimo aberto se acha pelo exemplar, que tem no máximo um, pelo índice único. A devolução o acha pelo exemplar e pelo membro: `buscarEmprestimo` traz o empréstimo mais recente (maior `id`) desse exemplar a esse membro, aberto ou devolvido, e a regra `devolver` decide `JaDevolvido`; assim, uma tela parada cujo exemplar foi devolvido e emprestado a outro membro não encerra o empréstimo do outro. A devolução preenche `devolvido_em` sem migração; depois dela o índice único não vale mais para a linha, e o exemplar pode ter um novo empréstimo aberto. O repositório transforma a violação desse índice, a mensagem do SQLite `UNIQUE constraint failed: emprestimo.exemplar_id`, em `JaEmprestado`; qualquer outra falha, inclusive a de uma chave estrangeira, continua `BancoDeDadosFalhou`.

## Regras de acesso

Nenhuma no Marco 1: o app roda só na máquina local, usado pelo bibliotecário, sem login.

## O que o cliente pode chamar

As rotas de cada fatia, em `rota.server.ts`. Cada rota e o formato do seu pedido e da sua resposta são fixados pelo Contrato da página da entrega que a cria, e listados aqui por ela.

| Rota | Resposta | Entrega |
|---|---|---|
| `GET /api/saude` | `200`, `{"ok":true}`; não toca o banco | `esqueleto` |
| `GET /api/livros` | `200`, `LivroDoCatalogo[]`, do livro mais recente para o mais antigo, com `totalDeExemplares` | `catalogo` |
| `POST /api/livros`, JSON `CadastroDeLivroPedido` | `201`, `Livro`; `400`, `{"recusa": RecusaDeLivro}` | `catalogo` |
| `POST /api/livros/:livroId/exemplares`, sem corpo | `201`, `Exemplar`; `404`, `{"recusa":"NaoEncontrado"}` | `catalogo` |
| `GET /api/membros` | `200`, `MembroDoCadastro[]`, do membro mais recente para o mais antigo, com `suspenso` booleano | `membros` |
| `POST /api/membros`, JSON `CadastroDeMembroPedido` | `201`, `MembroDoCadastro`; `400`, `{"recusa":"NomeInvalido"}` | `membros` |
| `POST /api/membros/:membroId/suspensao`, sem corpo | `200`, `MembroDoCadastro` suspenso; `404`, `{"recusa":"NaoEncontrado"}` | `membros` |
| `POST /api/membros/:membroId/reativacao`, sem corpo | `200`, `MembroDoCadastro` ativo; `404`, `{"recusa":"NaoEncontrado"}` | `membros` |
| `GET /api/emprestimos` | `200`, `EmprestimoAberto[]`, do empréstimo mais recente para o mais antigo | `emprestar-livro` |
| `GET /api/emprestimos/exemplares` | `200`, `ExemplarDisponivel[]`, os exemplares sem empréstimo aberto, por título e depois id | `emprestar-livro` |
| `GET /api/emprestimos/membros` | `200`, `MembroDoEmprestimo[]`, todos os membros por nome e depois id, com `emAtraso` do `hoje` lido; `400`, `{"falha":"HojeInvalido"}` | `emprestar-livro` |
| `POST /api/emprestimos`, JSON `EmprestimoPedido` | `201`, `Emprestimo`; `409`, `{"recusa": RecusaDeEmprestimo}`; `404`, `{"recusa":"NaoEncontrado"}`; `400`, `{"falha":"HojeInvalido"}` | `emprestar-livro` |
| `POST /api/emprestimos/devolucao`, JSON `DevolucaoPedida` | `200`, `Emprestimo` com `devolvidoEm`; `409`, `{"recusa":"JaDevolvido"}`; `404`, `{"recusa":"NaoEncontrado"}`; `400`, `{"falha":"HojeInvalido"}` | `devolver-livro` |
| `GET /api/emprestimos/atrasados` | `200`, `EmprestimoAtrasado[]`, os abertos com `devolver_em < hoje`, da devolução mais antiga para a mais nova e, na mesma data, pelo registrado antes (vazio é `[]`); `400`, `{"falha":"HojeInvalido"}` | `lista-de-atrasos` |

Numa rota que toca o banco, uma falha dele responde `500`, `{"falha":"BancoDeDadosFalhou"}`, depois de o servidor escrever a mensagem do SQLite no terminal; a mensagem não vai na resposta. No `POST /api/livros`, um campo ausente ou que não é string é lido como string vazia, e um corpo que não é JSON é lido como um pedido vazio (`400`, `TituloInvalido`). No `POST /api/membros`, do mesmo jeito, um `nome` ausente ou que não é string é lido como string vazia e um corpo que não é JSON como pedido vazio (`400`, `NomeInvalido`). Suspender um membro já suspenso, ou reativar um já ativo, responde `200` com a situação gravada, sem recusa. No `POST /api/emprestimos`, um `exemplarId` ou `membroId` ausente ou que não é string é lido como string vazia, e um corpo que não é JSON como pedido vazio (`404`, `NaoEncontrado`). As três recusas do empréstimo respondem `409`: o estado do membro ou do exemplar impede, e não os dados do pedido. No `POST /api/emprestimos/devolucao`, o corpo é lido como o do `POST /api/emprestimos` (um campo ausente ou que não é string, string vazia; um corpo que não é JSON, pedido vazio, `404` `NaoEncontrado`); `NaoEncontrado` quer dizer que esse exemplar nunca foi emprestado a esse membro, ou que um dos dois não existe; `JaDevolvido` responde `409`, porque o estado do empréstimo impede; a devolução responde `200` e não `201`, porque nada é criado, como a suspensão de um membro. Um membro suspenso ou com livros atrasados devolve como qualquer outro. O `GET /api/emprestimos/atrasados` só lê: um empréstimo que vence hoje não está nele, e os dias de atraso são contados por `diasDeAtraso(devolverEm, hoje)` (docs/03), não guardados. O `POST /api/emprestimos`, o `POST /api/emprestimos/devolucao`, o `GET /api/emprestimos/membros` e o `GET /api/emprestimos/atrasados` leem `hoje` uma vez, na chegada, por `lerHoje` (docs/01); `x-hoje` só conta com o relógio de teste ligado (docs/03), e `HojeInvalido` é uma `falha` de um pedido de teste mal formado, não uma regra da biblioteca.

O cliente chama por `http://localhost:5173/api/...`, que o Vite repassa ao servidor em `http://localhost:3000` (ou na porta de `PORTA_DO_SERVIDOR`, docs/01 §Ambientes).
