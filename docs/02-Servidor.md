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
* **O banco:** `data/biblioteca.sqlite`, relativo à raiz do repositório, aberto com `DatabaseSync` só em `src/iniciar.server.ts`, com as chaves estrangeiras ligadas (o padrão do `DatabaseSync`).
* **Hoje:** nenhuma migração existe; `migracoes/` tem só um `.gitkeep` e o `user_version` é 0.

A tabela de empréstimos, como o livro a desenha (capítulo 14), chega com a entrega `emprestar-livro`:

* `emprestimo` (`exemplar_id`, `membro_id`, `emprestado_em`, `devolver_em`, `devolvido_em` anulável);
* índice único em `exemplar_id` onde `devolvido_em` é nulo.

As tabelas de livros, exemplares e membros chegam com `catalogo` e `membros`, pelo Contrato de cada página.

## Regras de acesso

Nenhuma no Marco 1: o app roda só na máquina local, usado pelo bibliotecário, sem login.

## O que o cliente pode chamar

As rotas de cada fatia, em `rota.server.ts`. Cada rota e o formato do seu pedido e da sua resposta são fixados pelo Contrato da página da entrega que a cria, e listados aqui por ela.

| Rota | Resposta | Entrega |
|---|---|---|
| `GET /api/saude` | `200`, `{"ok":true}`; não toca o banco | `esqueleto` |

O cliente chama por `http://localhost:5173/api/...`, que o Vite repassa ao servidor em `http://localhost:3000`.
