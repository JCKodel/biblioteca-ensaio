# Servidor

O servidor Node (Hono, `node:sqlite`) guarda as regras que o cliente não pode duplicar nem contornar. O cliente pode usar `podePegarEmprestado` para decidir o que mostrar; quem decide é o servidor.

## O que o servidor garante

* **A regra do empréstimo.** O servidor roda `emprestar` em todo empréstimo; um membro com livros em atraso ou suspenso é recusado ali, seja o que for que o cliente mostrou.
* **A data de devolução.** O servidor fixa `devolver_em` quando registra um empréstimo: o `hoje` lido na chegada da requisição mais o prazo de empréstimo (docs/03). Nenhum cliente envia nem muda essa data.
* **Os livros em atraso.** O repositório calcula `emAtraso` com `hoje`, a partir dos empréstimos abertos com `devolver_em < hoje`; o número não é guardado.
* **Um empréstimo aberto por exemplar.** Um índice único no banco recusa um segundo empréstimo aberto do mesmo exemplar, o único lugar onde dois bibliotecários no mesmo instante não competem; o repositório transforma a violação em `JaEmprestado`.

## Esquema

Migrações em arquivos SQL numerados, aplicadas em ordem na partida do servidor; os testes de repositório rodam as mesmas migrações num SQLite em memória. Cada entrega que cria ou muda uma tabela escreve a sua migração e atualiza esta seção.

* **Os arquivos:** `migracoes/NNNN-descricao.sql`, quatro dígitos a partir de `0001`, sem buraco nem repetição. Dois arquivos com o mesmo número, um número faltando ou um `.sql` fora do formato impedem a partida, com uma mensagem que nomeia os arquivos; assim, duas entregas paralelas que criem a mesma `0002` falham na partida, e não em silêncio.
* **O controle:** a última migração aplicada é anotada em `PRAGMA user_version`, sem tabela de controle. Na partida, `aplicarMigracoes` (`src/banco.server.ts`) roda, em ordem, as de número acima dele, cada uma numa transação com a sua anotação, e escreve no terminal o nome de cada uma antes de rodá-la.
* **Uma migração com erro** derruba a partida: o executor não captura exceções, o terminal mostra o nome do arquivo e o erro do SQLite, e o SQLite desfaz a transação aberta, então nada dela fica gravado.
* **O banco:** aberto com `DatabaseSync` só em `src/iniciar.server.ts`, com as chaves estrangeiras ligadas (o padrão do `DatabaseSync`). A variável de ambiente opcional `BANCO` o escolhe: um caminho relativo à raiz do repositório, ou `:memory:`, um banco em memória que começa vazio e não cria a pasta `data/` (o do e2e, docs/01 §Ambientes). Sem ela, é `data/biblioteca.sqlite`.
* **Hoje:** `user_version` 2, com a `0001-catalogo.sql` e a `0002-membros.sql`.

As tabelas, por migração:

| Migração | Tabela | Colunas | Entrega |
|---|---|---|---|
| `0001-catalogo.sql` | `livro` | `id` `INTEGER PRIMARY KEY`, `titulo` `TEXT NOT NULL`, `autor` `TEXT NOT NULL`, `ano` `INTEGER` anulável | `catalogo` |
| `0001-catalogo.sql` | `exemplar` | `id` `INTEGER PRIMARY KEY`, `livro_id` `INTEGER NOT NULL REFERENCES livro (id)`, com o índice `exemplar_livro_id` | `catalogo` |
| `0002-membros.sql` | `membro` | `id` `INTEGER PRIMARY KEY`, `nome` `TEXT NOT NULL`, `suspenso` `INTEGER NOT NULL DEFAULT 0` | `membros` |

Os ids são gerados pelo SQLite e viram `string` no código e no JSON (`"7"`); o repositório converte nas duas direções. Os limites de título, autor e ano ficam na regra (`validarLivro`, docs/03), não no banco. Dois livros podem ter o mesmo título e o mesmo autor.

O SQLite não tem booleano: o repositório dos membros grava `suspenso` como `0` ou `1` e o lê como `boolean`, no mesmo lugar em que converte o id. O limite do nome fica na regra (`cadastrar`, docs/03), não no banco; dois membros podem ter o mesmo nome. A matrícula que a tela mostra é o `id` do membro, e a `emprestimo.membro_id` da entrega `emprestar-livro` vai referenciá-lo.

A tabela de empréstimos, como o livro a desenha (capítulo 14), chega com a entrega `emprestar-livro`:

* `emprestimo` (`exemplar_id`, `membro_id`, `emprestado_em`, `devolver_em`, `devolvido_em` anulável);
* índice único em `exemplar_id` onde `devolvido_em` é nulo.

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

Numa rota que toca o banco, uma falha dele responde `500`, `{"falha":"BancoDeDadosFalhou"}`, depois de o servidor escrever a mensagem do SQLite no terminal; a mensagem não vai na resposta. No `POST /api/livros`, um campo ausente ou que não é string é lido como string vazia, e um corpo que não é JSON é lido como um pedido vazio (`400`, `TituloInvalido`). No `POST /api/membros`, do mesmo jeito, um `nome` ausente ou que não é string é lido como string vazia e um corpo que não é JSON como pedido vazio (`400`, `NomeInvalido`). Suspender um membro já suspenso, ou reativar um já ativo, responde `200` com a situação gravada, sem recusa.

O cliente chama por `http://localhost:5173/api/...`, que o Vite repassa ao servidor em `http://localhost:3000` (ou na porta de `PORTA_DO_SERVIDOR`, docs/01 §Ambientes).
