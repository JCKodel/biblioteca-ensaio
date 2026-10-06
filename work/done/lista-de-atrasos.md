# lista-de-atrasos

**Objetivo.** A bibliotecária abre uma tela e vê todos os empréstimos atrasados, do mais atrasado para o menos, com quem está com cada exemplar e há quantos dias ele devia ter voltado.

**Comportamento.**
* A navegação ganha um quarto link, "Atrasos", depois de "Empréstimos", que abre `/atrasos`. Os outros três links e as suas telas não mudam.
* Em `/atrasos`, o título "Empréstimos atrasados" e uma linha por empréstimo aberto com `devolverEm` anterior a `hoje`. Cada linha mostra o título e o exemplar ("Dom Casmurro, exemplar 1"), o nome e a matrícula ("Carla Mendes Rocha, Matrícula 3"), a data de devolução ("Devolver até 13/09/2026") e os dias de atraso ("Atrasado há 19 dias").
* Um dia de atraso se escreve "Atrasado há 1 dia"; dois ou mais, "Atrasado há N dias".
* A ordem é da data de devolução mais antiga para a mais nova; na mesma data, o empréstimo registrado antes vem antes.
* Um empréstimo que vence hoje não aparece: com um empréstimo de 2026-10-01 (devolver até 2026-10-22), com `hoje` 2026-10-22 a lista está vazia; com `hoje` 2026-10-23 ele aparece com "Atrasado há 1 dia".
* Os dias são contados de calendário, também entre meses e anos: `devolverEm` 2026-12-31 com `hoje` 2027-01-02 é "Atrasado há 2 dias".
* Um empréstimo devolvido não aparece, mesmo que tenha voltado com atraso. Depois de registrar a devolução em `/emprestimos`, a linha some de `/atrasos` ao recarregar a página.
* Um membro suspenso com um empréstimo atrasado aparece como qualquer outro. Um membro com dois empréstimos atrasados aparece em duas linhas.
* Sem nenhum empréstimo atrasado: "Nenhum empréstimo atrasado."
* A tela só mostra: não tem botão, não registra devolução, não envia aviso. A lista é lida ao abrir a página; recarregar a página a lê de novo, com o `hoje` daquele momento.
* Com os dados de exemplo carregados (docs/05 §5), `/atrasos` mostra 4 linhas, nesta ordem: exemplar 26, Os Sertões, Sofia Campos Ramos, Matrícula 21, "Atrasado há 39 dias"; os exemplares 1, Dom Casmurro, e 20, O Cortiço, os dois de Carla Mendes Rocha, Matrícula 3, "Atrasado há 19 dias", o 1 antes do 20 (emprestados no mesmo dia, o 1 registrado antes); exemplar 34, Vidas Secas, Lucas Almeida Pereira, Matrícula 12, "Atrasado há 9 dias". O exemplar 46, que vence hoje, não aparece.
* O banco não responde: "Não foi possível acessar o banco da biblioteca. Tente de novo."; o servidor escreve a mensagem do SQLite no terminal.
* Nada do catálogo, dos membros, do empréstimo nem da devolução muda de comportamento; não há migração.

**Contrato.**
* **Banco:** nenhuma migração; `user_version` continua 3. A lista lê `emprestimo`, `exemplar`, `livro` e `membro`, que já existem.
* **Onde mora (capítulo 6, como a devolução):** as regras e a função do repositório ficam na fatia do empréstimo (`emprestimos/regras.ts`, `emprestimos/repositorio.server.ts`, `emprestimos/rota.server.ts`); a tela, o orquestrador do cliente e o do servidor ficam na subfatia `src/features/emprestimos/atrasos/`: `TelaDeAtrasos.tsx`, `useAtrasos.ts`, `eventosDeAtrasos.ts`, `eventosDeAtrasos.test.ts`.
* **Casos de uso**, em `src/features/emprestimos/regras.ts`, puros:
  * `EmprestimoAtrasado = EmprestimoAberto & { diasDeAtraso: number }`, ou seja `{ exemplarId: string; titulo: string; membroId: string; nome: string; devolverEm: string; diasDeAtraso: number }`.
  * `diasDeAtraso(devolverEm: string, hoje: string): number`: os dias de `devolverEm` até `hoje`, as duas `YYYY-MM-DD`, contados em UTC como em `somarDias`, sem ler o relógio. `somarDias(devolverEm, diasDeAtraso(devolverEm, hoje)) === hoje`. Não recusa nada: quem chama só passa empréstimos atrasados, e o resultado é então 1 ou mais.
  * `textoDoAtraso(dias: number): string`: 1 → "Atrasado há 1 dia"; N → "Atrasado há N dias".
* **Orquestrador do servidor**, `src/features/emprestimos/atrasos/eventosDeAtrasos.ts`, síncrono:
  * `RepositoriosDeAtrasos = { listarEmprestimosAtrasados(hoje: string): Result<EmprestimoAberto[], BancoDeDadosFalhou> }`
  * `EstadoDosAtrasos = { tipo: "Listado"; atrasados: EmprestimoAtrasado[] } | { tipo: "Falhou"; excecao: BancoDeDadosFalhou }`
  * `listaDeAtrasosPedida(hoje: string, repositorios: RepositoriosDeAtrasos): EstadoDosAtrasos`: `listarEmprestimosAtrasados(hoje)`; numa falha, `Falhou`; senão `Listado`, com cada empréstimo mais `diasDeAtraso(devolverEm, hoje)`, na ordem do repositório.
* **Repositório**, `src/features/emprestimos/repositorio.server.ts`, o `db` primeiro e a chamada dentro de `consultar`:
  * `listarEmprestimosAtrasados(db, hoje: string): Result<EmprestimoAberto[], BancoDeDadosFalhou>`: o mesmo `SELECT` e os mesmos `JOIN` de `listarEmprestimosAbertos`, com `WHERE emprestimo.devolvido_em IS NULL AND emprestimo.devolver_em < ?` (`hoje`) e `ORDER BY emprestimo.devolver_em ASC, emprestimo.id ASC`; ids convertidos em string como nas outras listas.
  * `repositoriosDeAtrasos(db): RepositoriosDeAtrasos`, o montador, fechado sobre o `db`. Não fecha sobre `hoje`, que o orquestrador passa, então a rota o monta uma vez.
* **Rota**, em `src/features/emprestimos/rota.server.ts`, dentro de `rotaDeEmprestimos(db, relogioDeTeste)`:

  | Rota | Pedido | Resposta |
  |---|---|---|
  | `GET /api/emprestimos/atrasados` | sem corpo (`x-hoje` com o relógio de teste) | `200`, `EmprestimoAtrasado[]` (vazio é `[]`); `400`, `{ "falha": "HojeInvalido" }`; `500`, `{ "falha": "BancoDeDadosFalhou" }` por `falhou` |

  O `hoje` é lido uma vez, na chegada, por `lerHoje(c.req.header("x-hoje"), relogioDeTeste)`; `HojeInvalido` responde sem tocar o banco. Exemplo de corpo `200`, com os dados de exemplo e `hoje` 2026-10-02 (a data do docs/05 §5), a primeira linha: `[{"exemplarId":"26","titulo":"Os Sertões","membroId":"21","nome":"Sofia Campos Ramos","devolverEm":"2026-08-24","diasDeAtraso":39}, ...]`.
* **Cliente:**
  * `Aplicacao.tsx`: `TELAS` ganha `{ caminho: "/atrasos", nome: "Atrasos" }`, depois de "Empréstimos", e `TELA_DE` ganha `"/atrasos": TelaDeAtrasos`.
  * `useAtrasos()`, o orquestrador do cliente: `GET /api/emprestimos/atrasados` com `chamar` e `await`, uma vez ao montar; publica `{ tipo: "Carregando" } | { tipo: "Listado"; atrasados: EmprestimoAtrasado[] } | { tipo: "Falhou" }`. Qualquer resposta que não seja `200`, ou `null` do `chamar`, é `Falhou`.
  * `TelaDeAtrasos.tsx` importa de `regras.ts` só `textoDaDevolucao` e `textoDoAtraso`, e de `src/lib/mensagemDeFalha.ts` a `MENSAGEM_DE_FALHA`. Cada linha usa as classes da lista de "Empréstimos abertos" (`emprestimos__lista`, `emprestimo`, `emprestimo__texto`, `emprestimo__exemplar`), sem o botão.
* **Documentos que a entrega atualiza:** docs/02 (a rota na tabela e o parágrafo de `hoje`), docs/01 (a subfatia `emprestimos/atrasos/` na árvore e no parágrafo das subfatias; e, nos parágrafos de `repositorio.server.ts` e `rota.server.ts`, a terceira forma de montar: `repositoriosDeAtrasos(db)` montado uma vez, com `hoje` passado pelo orquestrador a cada chamada), docs/05 §5 (uma linha "Na tela de atrasos" na tabela dos dados de exemplo). O docs/03 já tem os termos.

**Estados.**
* Carregando: "Carregando os atrasos."
* Vazio: "Nenhum empréstimo atrasado."
* Erro e offline: a mensagem de `Falhou` do docs/03, sem lista.

**Referência visual.** Não há arquivo de design (docs/05 §5). A linha é a de "Empréstimos abertos" em `work/done/devolver-livro-390.png` e `-1280.png`, sem o botão, com uma quarta linha de texto, o atraso; o título segue o de "Empréstimos abertos". A navegação com quatro links cabe em 390 pixels sem rolagem horizontal, também a lista com um título de livro de 200 caracteres. Capturas em `http://localhost:5173/atrasos`, com os dados de exemplo carregados. Nenhuma variável de estilo nova é esperada; se vier, entra no `src/estilo.css` e no docs/04.

**Fora do escopo.**
* Registrar a devolução a partir da lista: a devolução continua em `/emprestimos`, para a entrega ficar só de leitura.
* Agrupar por membro: a lista é por empréstimo; a página de um membro é a `emprestimos-do-membro`.
* Avisar o membro, por email ou de outro jeito: é a OD-2 e a linha `aviso-de-atraso`.
* Multa ou qualquer valor por dia de atraso: é a OD-1.
* Telefone, email ou endereço do membro na linha: o membro só tem nome e matrícula.
* Filtro, busca, paginação ou contagem no título: com a biblioteca deste tamanho, a lista cabe numa tela.
* Destacar os atrasados na lista de "Empréstimos abertos" de `/emprestimos`: ela não muda.
* Mover `situacaoDoEmprestimo` do plano dos dados de exemplo: a lista usa a mesma condição (`devolver_em < hoje`) que `emAtraso` já usa no SQL.

**Pronto quando.**
* [x] Os testes unitários de `diasDeAtraso` (ontem é 1; 19 dias; virada de mês e de ano) e de `textoDoAtraso` (1 dia, N dias) passam.
* [x] O teste de `listaDeAtrasosPedida` com fakes passa: `Listado` com os dias contados e a ordem do repositório; `Falhou` com a falha do repositório.
* [x] Os testes do repositório num SQLite em memória passam: lista só os abertos com `devolver_em < hoje`; não lista o que vence hoje nem os devolvidos, com ou sem atraso; ordena por `devolver_em` e depois por `id`; traz título, nome e ids como string.
* [x] Os testes da rota passam: `200` com a lista; `200` com `[]`; `400` `HojeInvalido` com o relógio de teste e uma data inválida; `500` `BancoDeDadosFalhou` com o banco falhando.
* [x] Um e2e com o relógio de teste passa: um empréstimo de 2026-10-01; `/atrasos` com `hoje` 2026-10-22 mostra "Nenhum empréstimo atrasado."; com 2026-10-23, a linha com "Atrasado há 1 dia"; depois de "Registrar devolução" em `/emprestimos`, `/atrasos` volta a "Nenhum empréstimo atrasado." (conferido como a linha do teste que some de `/atrasos`; ver Divergências).
* [x] `npm run verify` está verde.
* [x] Com os dados de exemplo carregados, `/atrasos` mostra as 4 linhas descritas acima, conferidas à mão.
* [x] As capturas `work/done/lista-de-atrasos-390.png` e `-1280.png` conferem com a referência visual.

## O que aconteceu

**Divergências do plano.**
* O e2e, no último passo, não confere "Nenhum empréstimo atrasado." depois da devolução: com `hoje` 2026-10-23, os empréstimos de 2026-10-01 que outros specs deixam abertos (e o mesmo teste no outro projeto, 390 ou 1280) também estão atrasados, e o docs/04 proíbe supor o banco vazio. A pessoa escolheu: o passo com 2026-10-22 confere "Nenhum empréstimo atrasado." (nenhum spec empresta antes de 2026-10-01), e depois da devolução o e2e confere que a linha do exemplar do próprio teste some de `/atrasos`, com 2026-10-23. O docs/04 não muda.
* Um segundo e2e, não pedido na página, cobre o estado de erro: com a rota respondendo `500`, a tela mostra a mensagem de `Falhou` e nenhuma lista. Um teste de rota a mais confere que, sem o relógio de teste, `x-hoje` é ignorado.
* O docs/04 §Estilo visual também mudou, além dos documentos que a página nomeia: os links do cabeçalho passaram a ser quatro, e as capturas desta entrega entram na referência.

**Abstração.** O `SELECT` com os três `JOIN` e a conversão da linha em `EmprestimoAberto` apareceram pela segunda vez em `listarEmprestimosAtrasados`; a primeira ocorrência é `listarEmprestimosAbertos`. Os dois saíram para `SELECT_DE_EMPRESTIMO_ABERTO` e `paraEmprestimoAberto`, no mesmo `repositorio.server.ts`.

**Decisões.**
* `diasDeAtraso` subtrai as duas datas como instantes UTC (`Date.parse` de `YYYY-MM-DD` é meia-noite UTC) e divide por um dia, arredondando: a mesma base de `somarDias`, sem horário de verão no caminho.
* A `TelaDeAtrasos` usa a seção e o título de "Empréstimos abertos" (`emprestimos`, `emprestimos__titulo`); como o título é o primeiro elemento da tela, a margem de cima dele fica maior que na tela de empréstimo, onde vem depois do formulário. Ficou assim para não criar estilo novo; nenhuma variável de estilo nova.
* Nenhum ADR: a terceira forma de montar repositórios segue a arquitetura existente e está no docs/01.

**O que a prova encontrou.**
* Os testes novos foram vistos vermelhos antes do código (16 falhas, mais o arquivo do orquestrador sem módulo).
* `npm run verify` verde: typecheck, lint, test, e2e (44), build.
* Com os dados de exemplo carregados em 2026-10-06, `GET /api/emprestimos/atrasados` e `/atrasos` mostram as 4 linhas, na ordem da página: 26 (39 dias, até 28/08/2026), 1 e 20 (19 dias, até 17/09/2026), 34 (9 dias, até 27/09/2026); o exemplar 46 não aparece. As datas são as de 2026-10-06, não as de 2026-10-02 do exemplo do contrato, porque a carga conta a partir do dia em que roda.
* As capturas `work/done/lista-de-atrasos-390.png` e `-1280.png` conferem com `devolver-livro-*.png`: a mesma linha sem o botão, com a quarta linha do atraso; os quatro links cabem em 390 pixels. Com um título de 200 caracteres sem espaço, em 390 pixels, a largura da página continua 390 (sem rolagem horizontal).

**Deixado de fora.** Nada do escopo.
