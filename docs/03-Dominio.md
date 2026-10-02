# Domínio

O vocabulário da biblioteca de empréstimos. Toda página em `work/`, todo identificador e todo teste usa os termos desta tabela. Um conceito novo entra aqui antes de entrar em qualquer outro lugar.

Identificadores em português, sem acento (docs/04). Ficam em inglês: `Result`, `ok`, `err`, `value`, `error`, as pastas `features/` e `src/lib/`, o sufixo `.server.ts`, e os nomes das bibliotecas.

## Termos

| Termo | Identificador no código | Significado |
|---|---|---|
| biblioteca de empréstimos | (o produto) | A pequena biblioteca que empresta exemplares dos seus livros a membros. |
| livro | `Livro` | Uma obra do catálogo. Pode ter vários exemplares. |
| exemplar | `Exemplar`, `{ id, livroId }` | Uma cópia física de um livro, a coisa que é emprestada. |
| membro | `Membro`, `{ id, emAtraso, suspenso }` | Uma pessoa inscrita na biblioteca, que pode pegar exemplares emprestados. |
| empréstimo | `Emprestimo` | O registro de que um membro levou um exemplar, com a sua data de devolução no campo `devolverEm`. |
| empréstimo aberto | (empréstimo sem devolução registrada) | Um empréstimo cujo exemplar ainda não voltou. |
| bibliotecário | (a pessoa no balcão) | Quem usa o app: cadastra, empresta e registra devoluções. |
| prazo de empréstimo | `DIAS_DE_EMPRESTIMO = 21` | Quantos dias um membro fica com um exemplar. Este é o único lugar onde o número é escrito. |
| data de devolução | `dataDeDevolucao(hoje)`; campo `devolverEm` | A data até a qual o exemplar volta: o dia do empréstimo mais o prazo de empréstimo. |
| hoje | `hoje` | A data do dia, `YYYY-MM-DD`, lida do relógio uma vez onde a requisição chega e passada como valor. |
| livros em atraso | `emAtraso` | Quantos empréstimos abertos do membro têm `devolverEm` anterior a `hoje`. |
| suspenso | `suspenso` | O membro está com a inscrição suspensa e não pode pegar emprestado até ser reativado. |
| devolução | `devolver` | O registro de que o exemplar voltou; encerra o empréstimo e deixa o exemplar livre. |
| emprestar | `emprestar` | O caso de uso que decide um empréstimo: devolve um `Emprestimo` ou uma `RecusaDeEmprestimo`. |
| pode pegar emprestado | `podePegarEmprestado` | A regra que diz se um membro pode pegar emprestado; o cliente a usa para decidir o que mostrar. |
| recusa de empréstimo | `RecusaDeEmprestimo = "TemLivrosEmAtraso" \| "JaEmprestado" \| "MembroSuspenso"` | Uma regra dizendo não. Nada falhou. |
| não encontrado | `NaoEncontrado` | O membro ou o exemplar pedido não existe. |
| falha do banco | `BancoDeDadosFalhou`, `{ codigo, mensagem }` | Uma exceção vinda do banco, traduzida em valor. |
| consultar | `consultar(executar)` | O único `try`/`catch` perto do banco: roda uma chamada e devolve um `Result`. |
| pedido de empréstimo | `EmprestimoPedido`, `{ exemplarId, membroId }` | O evento que a tela de empréstimo dispara. |
| orquestrador do empréstimo | `emprestimoPedido(evento, hoje, repositorios)` | Transforma um `EmprestimoPedido` em um `EstadoDoEmprestimo`. |
| estado do empréstimo | `EstadoDoEmprestimo`, campo `tipo`: `Emprestado` \| `Recusado` \| `Falhou` | O que o orquestrador publica depois de um pedido. |
| repositórios do empréstimo | `RepositoriosDeEmprestimo`: `buscarMembro`, `buscarExemplar`, `inserirEmprestimo` | As funções de busca e gravação que o orquestrador recebe. |

## Mensagens ao usuário

Escritas uma vez, aqui, e usadas literalmente:

| Caso | Mensagem |
|---|---|
| `TemLivrosEmAtraso` | Devolva primeiro os seus livros atrasados. |
| `JaEmprestado` | Este exemplar acabou de ser emprestado a outra pessoa. |
| `MembroSuspenso` | A sua matrícula está suspensa. |
| `Falhou` | Não foi possível acessar o banco da biblioteca. Tente de novo. |

## Entidades

* **Livro:** `id`. Os demais campos (título, autor) entram aqui pela entrega `catalogo`, antes do código.
* **Exemplar:** `id`, `livroId`. Pertence a um livro.
* **Membro:** `id`, `emAtraso`, `suspenso`. `emAtraso` não é guardado: o repositório o calcula com `hoje`. Os demais campos (nome) entram aqui pela entrega `membros`.
* **Emprestimo:** um exemplar, um membro, o dia do empréstimo, `devolverEm`, e a devolução quando houver. Os nomes exatos dos campos entram aqui pela entrega `emprestar-livro`.

## Invariantes

* Um exemplar tem no máximo um empréstimo aberto. O banco garante isso com um índice único; o repositório transforma a violação na recusa `JaEmprestado`.
* `devolverEm` é sempre a data do empréstimo mais o prazo de empréstimo, fixada pelo servidor (docs/02); nenhum cliente a escolhe.
* Um membro com `emAtraso > 0` não pega emprestado: `TemLivrosEmAtraso`.
* Um membro com `suspenso` verdadeiro não pega emprestado: `MembroSuspenso`.
* Toda data é uma string `YYYY-MM-DD`. Nenhuma regra lê o relógio; `hoje` chega como valor.
* Uma devolução encerra o empréstimo aberto do exemplar; depois dela, o exemplar está livre.
