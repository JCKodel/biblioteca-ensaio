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
| empréstimo | `Emprestimo`, `{ exemplarId, membroId, emprestadoEm, devolverEm, devolvidoEm }` | O registro de que um membro levou um exemplar, com a sua data de devolução no campo `devolverEm`; `devolvidoEm` é `null` enquanto o exemplar não voltou. |
| empréstimo aberto | (empréstimo sem devolução registrada) | Um empréstimo cujo exemplar ainda não voltou. |
| empréstimo aberto, na tela | `EmprestimoAberto`, `{ exemplarId, titulo, membroId, nome, devolverEm }` | Um empréstimo aberto como a tela de empréstimo o lista: o exemplar com o título do livro, o membro com o nome, e a data de devolução. |
| exemplar disponível | `ExemplarDisponivel`, `{ id, livroId, titulo }` | Um exemplar sem empréstimo aberto, com o título do livro, como a tela de empréstimo o oferece. |
| membro no balcão | `MembroDoEmprestimo`, `{ id, nome, emAtraso, suspenso }` | Um membro como a tela de empréstimo o oferece: o `Membro` da regra mais o nome, para a tela decidir com `podePegarEmprestado` o que mostrar. |
| bibliotecário | (a pessoa no balcão) | Quem usa o app: cadastra, empresta e registra devoluções. |
| prazo de empréstimo | `DIAS_DE_EMPRESTIMO = 21` | Quantos dias um membro fica com um exemplar. Este é o único lugar onde o número é escrito. |
| data de devolução | `dataDeDevolucao(hoje)`; campo `devolverEm` | A data até a qual o exemplar volta: o dia do empréstimo mais o prazo de empréstimo. |
| hoje | `hoje`; lido por `lerHoje(xHoje, relogioDeTeste)` | A data do dia, `YYYY-MM-DD`, lida do relógio uma vez onde a requisição chega e passada como valor. É a data local da máquina do servidor, a do balcão, e não a de Greenwich. |
| relógio de teste | variável de ambiente `RELOGIO_DE_TESTE=cabecalho`; cabeçalho `x-hoje`; cabeçalho inválido, `HojeInvalido` | Só no e2e: com a variável ligada na partida do servidor, o cabeçalho `x-hoje: AAAA-MM-DD` dá o `hoje` daquela requisição, e uma data inválida nele é `HojeInvalido` (`400`). Sem a variável, o cabeçalho é ignorado. Nenhuma regra sabe dele. |
| livros em atraso | `emAtraso` | Quantos empréstimos abertos do membro têm `devolverEm` anterior a `hoje`. |
| suspenso | `suspenso` | O membro está com a inscrição suspensa e não pode pegar emprestado até ser reativado. |
| devolução | `devolver(emprestimo, hoje)`; a subfatia `emprestimos/devolucao/` | O registro de que o exemplar voltou; encerra o empréstimo e deixa o exemplar livre. O caso de uso devolve o `Emprestimo` com `devolvidoEm` igual a `hoje`, ou uma `RecusaDeDevolucao`. Uma devolução depois da data de devolução é aceita e fica registrada (`devolvidoEm` depois de `devolverEm`); multa não há (OD-1). |
| recusa de devolução | `RecusaDeDevolucao = "JaDevolvido"` | O empréstimo pedido já foi devolvido. Nada falhou. |
| pedido de devolução | `DevolucaoPedida`, `{ exemplarId, membroId }` | O evento que a lista "Empréstimos abertos" dispara: o empréstimo desse exemplar a esse membro. |
| orquestrador da devolução | `devolucaoPedida(evento, hoje, repositorios)` | Transforma uma `DevolucaoPedida` em um `EstadoDaDevolucao`. |
| estado da devolução | `EstadoDaDevolucao`, campo `tipo`: `Devolvido` \| `Recusado` \| `Falhou` | O que o orquestrador da devolução publica depois de um pedido. |
| repositórios da devolução | `RepositoriosDeDevolucao`: `buscarEmprestimo`, `registrarDevolucao` | As funções de busca e gravação que o orquestrador da devolução recebe; moram no repositório do empréstimo. |
| emprestar | `emprestar` | O caso de uso que decide um empréstimo: devolve um `Emprestimo` ou uma `RecusaDeEmprestimo`. |
| pode pegar emprestado | `podePegarEmprestado` | A regra que diz se um membro pode pegar emprestado; o cliente a usa para decidir o que mostrar. |
| recusa de empréstimo | `RecusaDeEmprestimo = "TemLivrosEmAtraso" \| "JaEmprestado" \| "MembroSuspenso"` | Uma regra dizendo não. Nada falhou. |
| não encontrado | `NaoEncontrado` | O membro ou o exemplar pedido não existe; numa devolução, esse exemplar nunca foi emprestado a esse membro. |
| falha do banco | `BancoDeDadosFalhou`, `{ codigo, mensagem }` | Uma exceção vinda do banco, traduzida em valor. |
| consultar | `consultar(executar)` | O único `try`/`catch` perto do banco: roda uma chamada e devolve um `Result`. |
| pedido de empréstimo | `EmprestimoPedido`, `{ exemplarId, membroId }` | O evento que a tela de empréstimo dispara. |
| orquestrador do empréstimo | `emprestimoPedido(evento, hoje, repositorios)` | Transforma um `EmprestimoPedido` em um `EstadoDoEmprestimo`. |
| estado do empréstimo | `EstadoDoEmprestimo`, campo `tipo`: `Emprestado` \| `Recusado` \| `Falhou` | O que o orquestrador publica depois de um pedido. |
| repositórios do empréstimo | `RepositoriosDeEmprestimo`: `buscarMembro`, `buscarExemplar`, `inserirEmprestimo`; e `listarEmprestimosAbertos`, `listarExemplaresDisponiveis`, `listarMembrosDoEmprestimo` | As funções de busca e gravação que o orquestrador recebe, e as de leitura da tela de empréstimo. |
| texto da devolução | `textoDaDevolucao(devolverEm)` | O caso de uso que escreve a data de devolução para a bibliotecária: `"2026-10-22"` vira "Devolver até 22/10/2026". |
| catálogo | (os livros e os seus exemplares); a fatia `catalogo/` | O que a biblioteca tem na estante, cadastrado pelo bibliotecário. |
| título, autor, ano | `titulo`, `autor`, `ano` | Os dados de um livro. Título e autor são obrigatórios; o ano é opcional (`null` quando não informado). |
| dados do livro | `DadosDoLivro`, `{ titulo, autor, ano }` | O que o bibliotecário informou sobre um livro, já aparado e validado; `ano` é `number \| null`. |
| validar livro | `validarLivro(pedido)` | O caso de uso que confere um `CadastroDeLivroPedido`: devolve `DadosDoLivro` ou uma `RecusaDeLivro`. |
| recusa de livro | `RecusaDeLivro = "TituloInvalido" \| "AutorInvalido" \| "AnoInvalido"` | Os dados do livro não servem. Nada falhou. |
| livro do catálogo | `LivroDoCatalogo`, `{ id, titulo, autor, ano, totalDeExemplares }` | Um livro como a lista do catálogo o mostra, com quantos exemplares ele tem. |
| texto de exemplares | `textoDeExemplares(total)` | O caso de uso que escreve a quantidade de exemplares de um livro: "nenhum exemplar", "1 exemplar", "2 exemplares". |
| pedido de cadastro de livro | `CadastroDeLivroPedido`, `{ titulo, autor, ano }`, as três strings como foram digitadas | O evento que a tela do catálogo dispara para cadastrar um livro. |
| pedido de cadastro de exemplar | `CadastroDeExemplarPedido`, `{ livroId }` | O evento que a tela do catálogo dispara para acrescentar um exemplar a um livro. |
| orquestradores do catálogo | `cadastroDeLivroPedido(evento, repositorios)`, `cadastroDeExemplarPedido(evento, repositorios)` | Transformam cada pedido em um `EstadoDoCadastroDeLivro` ou um `EstadoDoCadastroDeExemplar`. |
| estados do cadastro | `EstadoDoCadastroDeLivro` e `EstadoDoCadastroDeExemplar`, campo `tipo`: `Cadastrado` \| `Recusado` \| `Falhou` | O que cada orquestrador do catálogo publica depois de um pedido. |
| repositórios do catálogo | `RepositoriosDoCatalogo`: `inserirLivro`, `buscarLivro`, `inserirExemplar`; e `listarLivros` | As funções de busca e gravação do catálogo. |
| membros | a fatia `membros/` | As pessoas inscritas na biblioteca, cadastradas, suspensas e reativadas pelo bibliotecário. |
| nome | `nome` | O nome de um membro. Obrigatório, aparado, de 1 a 120 caracteres. Dois membros podem ter o mesmo nome. |
| matrícula | o `id` do membro | O número que identifica um membro, mostrado ao bibliotecário ("Matrícula 7"). É o id que o banco gera; não há outro documento. |
| membro do cadastro | `MembroDoCadastro`, `{ id, nome, suspenso }` | Um membro como o cadastro o guarda e a lista o mostra. O `Membro` da regra do empréstimo é outro recorte do mesmo membro, `{ id, emAtraso, suspenso }`, montado por `buscarMembro(db, id, hoje)` no repositório do empréstimo. |
| situação do membro | `textoDaSituacao(suspenso)`: "Ativo" \| "Suspenso" | O caso de uso que escreve a situação de um membro na lista. |
| pedido de cadastro de membro | `CadastroDeMembroPedido`, `{ nome }`, como foi digitado | O evento que a tela de membros dispara para cadastrar um membro. |
| dados do membro | `DadosDoMembro`, `{ nome }` | O que o bibliotecário informou sobre um membro, já aparado e validado. |
| cadastrar | `cadastrar(pedido)` | O caso de uso que confere um `CadastroDeMembroPedido`: devolve `DadosDoMembro` ou uma `RecusaDeMembro`. Um membro novo nunca começa suspenso. |
| recusa de membro | `RecusaDeMembro = "NomeInvalido"` | Os dados do membro não servem. Nada falhou. |
| pedido de suspensão | `SuspensaoPedida`, `{ membroId, suspenso }` | O evento que a tela de membros dispara para suspender (`suspenso: true`) ou reativar (`suspenso: false`) um membro. |
| orquestradores dos membros | `cadastroDeMembroPedido(evento, repositorios)`, `suspensaoPedida(evento, repositorios)` | Transformam cada pedido em um `EstadoDoCadastroDeMembro` ou um `EstadoDaSuspensao`. |
| estados dos membros | `EstadoDoCadastroDeMembro`, campo `tipo`: `Cadastrado` \| `Recusado` \| `Falhou`; `EstadoDaSuspensao`, campo `tipo`: `Alterado` \| `Recusado` \| `Falhou` | O que cada orquestrador dos membros publica depois de um pedido. |
| repositórios dos membros | `RepositoriosDeMembros`: `inserirMembro`, `definirSuspenso`; e `listarMembros` | As funções de gravação e de leitura do cadastro de membros. |

## Mensagens ao usuário

Escritas uma vez, aqui, e usadas literalmente:

| Caso | Mensagem |
|---|---|
| `TemLivrosEmAtraso` | Devolva primeiro os seus livros atrasados. |
| `JaEmprestado` | Este exemplar acabou de ser emprestado a outra pessoa. |
| `MembroSuspenso` | A sua matrícula está suspensa. |
| `Falhou` | Não foi possível acessar o banco da biblioteca. Tente de novo. |
| `TituloInvalido` | Informe o título, com até 200 caracteres. |
| `AutorInvalido` | Informe o autor, com até 200 caracteres. |
| `AnoInvalido` | O ano é um número de até quatro algarismos, ou fica em branco. |
| `NaoEncontrado`, de um livro | Este livro não está no catálogo. |
| `NomeInvalido` | Informe o nome, com até 120 caracteres. |
| `NaoEncontrado`, de um membro | Este membro não está cadastrado. |
| `NaoEncontrado`, de um empréstimo | Este membro ou este exemplar não está cadastrado. |
| `JaDevolvido` | Este empréstimo já foi devolvido. |
| `NaoEncontrado`, de uma devolução | Este exemplar não está emprestado a este membro. |

## Entidades

* **Livro:** `id`, `titulo`, `autor`, `ano`. Título e autor são aparados e têm de 1 a 200 caracteres; `ano`, quando informado, é um inteiro de 1 a 9999, e senão é `null`. Dois livros podem ter o mesmo título e o mesmo autor.
* **Exemplar:** `id`, `livroId`. Pertence a um livro.
* **Membro:** `id`, `nome`, `suspenso` guardados; `emAtraso` não é guardado: o repositório do empréstimo o calcula com `hoje`. O nome é aparado e tem de 1 a 120 caracteres; dois membros podem ter o mesmo nome, e a matrícula (o `id`) os distingue. Um membro novo começa ativo (`suspenso` falso). Suspender um membro já suspenso, ou reativar um já ativo, não muda nada e não é recusado. A regra do empréstimo lê o recorte `{ id, emAtraso, suspenso }`; a tela de membros, o `MembroDoCadastro`.
* **Emprestimo:** `exemplarId`, `membroId`, `emprestadoEm` (o `hoje` do empréstimo), `devolverEm` (`dataDeDevolucao(emprestadoEm)`) e `devolvidoEm` (`null` enquanto o exemplar não voltou; a devolução o preenche com o `hoje` dela). No banco, a tabela `emprestimo` também tem um `id`, que o `Emprestimo` não carrega: `emprestar` cria o empréstimo antes de o banco existir para ele, e um empréstimo aberto se acha pelo exemplar, que tem no máximo um.

## Invariantes

* Um exemplar tem no máximo um empréstimo aberto. O banco garante isso com um índice único; o repositório transforma a violação na recusa `JaEmprestado`.
* `devolverEm` é sempre a data do empréstimo mais o prazo de empréstimo, fixada pelo servidor (docs/02); nenhum cliente a escolhe.
* Um membro com `emAtraso > 0` não pega emprestado: `TemLivrosEmAtraso`.
* Um membro com `suspenso` verdadeiro não pega emprestado: `MembroSuspenso`.
* Toda data é uma string `YYYY-MM-DD`. Nenhuma regra lê o relógio; `hoje` chega como valor.
* Uma devolução encerra o empréstimo aberto do exemplar; depois dela, o exemplar está livre.
* Um empréstimo é devolvido uma vez: o segundo pedido é `JaDevolvido` e não muda nada.
