# Arquitetura

## O design em uma frase

Um app web em React fala com um servidor Node que guarda as regras do empréstimo e um banco SQLite, e cada feature é uma fatia vertical com as quatro peças do FOCUS, pelas quais um evento flui num só sentido até um novo estado.

## Stack

| Peça | Escolha | Motivo, quando havia alternativa |
|---|---|---|
| Linguagem | TypeScript | O código é público e o agente aprendeu muito TypeScript; os tipos conferem o trabalho do agente antes de uma pessoa (capítulo 12 do livro). |
| Cliente | React com Vite | Escolha da pessoa, sem alternativa pesada. |
| Servidor | Node 24 com Hono | Escolha da pessoa, sem alternativa pesada. |
| Banco | SQLite pelo módulo nativo `node:sqlite` (`DatabaseSync`, síncrono) | Nenhuma dependência nativa para compilar, então roda igual no Windows, no macOS e no Linux (ADR-0005). |
| Migrações | Arquivos SQL numerados, aplicados em ordem na partida do servidor | Escolha da pessoa, sem alternativa pesada. |
| Acesso a dados | SQL direto pelo `node:sqlite`, sem ORM | Escolha da pessoa, sem alternativa pesada. |
| Testes unitários | Vitest, no Node | Escolha da pessoa, sem alternativa pesada. |
| Testes ponta a ponta | Playwright | Escolha da pessoa, sem alternativa pesada. |
| Lint e formato | Biome (docs/04) | Escolha da pessoa, sem alternativa pesada. |

Todos os scripts do `package.json` rodam no Windows sem WSL: nada de `rm`, `&`, `printf` nem variável de ambiente inline; quando um script precisa de mais que um comando de ferramenta, ele é um script Node (ADR-0005).

## Como o código é organizado

**FOCUS inteiro** (capítulo 7 do livro; ADR-0002): as quatro peças, exceções como valores, fatias verticais.

| Peça | Faz | Proíbe |
|---|---|---|
| Tela | dispara eventos, renderiza o estado que recebe | regras de negócio, acesso a dados, formatação |
| Orquestrador | transforma um evento em um novo estado: valida e formata pelos casos de uso, busca pelos repositórios, aplica as regras pelos casos de uso, pede aos repositórios que salvem, publica o estado | decidir uma regra, persistir |
| Caso de uso | o único lugar de uma regra de negócio, seja uma decisão, uma validação ou uma formatação; puro: dados entram, `Result` sai | I/O, o framework, exceções |
| Repositório | busca e salva; o único lugar em que uma exceção vinda dos dados vira um `Result` | regras de negócio |

As pastas são por feature, não por camada (capítulo 6 do livro):

```text
src/features/emprestimos/
    TelaDeEmprestimo.tsx, useEmprestimo.ts, eventosDeEmprestimo.ts,
    regras.ts, repositorio.server.ts, rota.server.ts,
    regras.test.ts, eventosDeEmprestimo.test.ts,
    repositorio.server.test.ts, rota.server.test.ts
src/features/emprestimos/devolucao/
    TelaDeDevolucao.tsx, useDevolucao.ts, eventosDeDevolucao.ts,
    eventosDeDevolucao.test.ts
src/features/emprestimos/atrasos/
    TelaDeAtrasos.tsx, useAtrasos.ts, eventosDeAtrasos.ts,
    eventosDeAtrasos.test.ts
src/features/membros/     o que a biblioteca guarda sobre um membro
src/features/catalogo/    livros e exemplares
src/lib/                  o que não pertence a nenhuma feature, no segundo uso
src/dadosDeExemplo/       plano.ts, carregar.server.ts, repositorio.server.ts e os
                          seus testes: os dados de exemplo (docs/05 §5), sem tela nem rota
scripts/                  dadosDeExemplo.ts, a entrada do comando; verificar.ts, o verify
```

`src/dadosDeExemplo/` não é uma fatia em `features/`: não tem tela nem rota. O `plano.ts` é puro (os livros, os membros e os 120 empréstimos em dias antes de `hoje`, sem relógio); o `carregar.server.ts` reproduz o plano pelos orquestradores das fatias, com os repositórios reais, como as rotas fazem; o `repositorio.server.ts` guarda só o SQL próprio da carga (a transação, a contagem das tabelas e o apagar), cada instrução dentro de `consultar`. O código fica em `src/` porque o Vitest só procura testes lá; em `scripts/` fica só a entrada.

A devolução é uma subfatia do empréstimo (capítulo 6 do livro): a tela, o orquestrador do cliente e o do servidor ficam em `emprestimos/devolucao/`; a regra `devolver`, as funções `buscarEmprestimo` e `registrarDevolucao` do repositório e a rota `POST /api/emprestimos/devolucao` ficam nos arquivos da fatia do empréstimo, que emprestar e devolver compartilham, com os seus testes. A `TelaDeDevolucao` é a seção "Empréstimos abertos" da tela de empréstimo, renderizada pela `TelaDeEmprestimo` abaixo do formulário, que lhe passa os empréstimos abertos e o `depoisDeDevolver` do `useEmprestimo` (apaga o aviso do formulário e relê as três listas); não tem caminho próprio.

A lista de atrasos é outra subfatia do empréstimo, do mesmo jeito: a tela, o orquestrador do cliente e o do servidor ficam em `emprestimos/atrasos/`; os casos de uso `diasDeAtraso` e `textoDoAtraso`, a função `listarEmprestimosAtrasados` do repositório e a rota `GET /api/emprestimos/atrasados` ficam nos arquivos da fatia do empréstimo, com os seus testes. Ao contrário da devolução, a `TelaDeAtrasos` tem caminho próprio, `/atrasos`, e só lê: não tem botão. O `SELECT` e os `JOIN` de um `EmprestimoAberto` saíram de `listarEmprestimosAbertos` (o primeiro uso) para uma constante do repositório no segundo, `listarEmprestimosAtrasados`.

Em `src/lib/`, cada arquivo diz num comentário onde estão o primeiro e o segundo uso:

| Arquivo | O que guarda | Primeiro uso | Segundo uso |
|---|---|---|---|
| `result.ts` | `Result`, `ok`, `err` | `features/catalogo` (`validarLivro` e o repositório) | `features/membros/regras.ts` (`cadastrar`) |
| `consultar.server.ts` | `consultar`, `BancoDeDadosFalhou` | o repositório do catálogo | o repositório dos membros |
| `estadoDe.ts` | `estadoDe`, que separa uma recusa (string) de uma falha (objeto com `codigo`) | `cadastroDeExemplarPedido` | `suspensaoPedida` |
| `chamar.ts` | `chamar` e `Resposta`, a borda do cliente com a rede: um servidor que não responde ou uma resposta que não é JSON vira `null` | `useCatalogo` | `useMembros` |
| `mensagemDeFalha.ts` | `MENSAGEM_DE_FALHA`, a frase de `Falhou` do docs/03; sem I/O, porque `regras.ts` é puro e o servidor o importa | `catalogo/regras.ts` | `membros/regras.ts` |
| `falhou.server.ts` | `falhou(c, excecao)`, que escreve a `mensagem` no terminal e responde `500`, `{"falha":"BancoDeDadosFalhou"}` | `catalogo/rota.server.ts` | `membros/rota.server.ts`, onde já devia ter saído; veio no terceiro, `emprestimos/rota.server.ts` |
| `somarDias.ts` | `somarDias(data, dias)`, a conta de dias em UTC, sem relógio | `dataDeDevolucao`, em `emprestimos/regras.ts` | o plano dos dados de exemplo (`dadosDeExemplo/plano.ts`) |
| `dataLocal.ts` | `dataLocal()`, a data local da máquina, `YYYY-MM-DD` | `lerHoje`, em `emprestimos/rota.server.ts` | o comando dos dados de exemplo (`scripts/dadosDeExemplo.ts`) |

Ficam em cada arquivo de teste `naoEsperado` e `falsos` (este, tipado pelos repositórios de cada fatia), como no capítulo 8 do livro.

Numa fatia, cada arquivo é uma peça:

* `TelaDe<X>.tsx`: a **tela**, no cliente.
* `eventosDe<X>.ts`: o **orquestrador** do servidor. O handler da rota chama um orquestrador **síncrono**, como no capítulo 7: `emprestimoPedido(evento, hoje, repositorios)`, com `RepositoriosDeEmprestimo` obrigatório, e `estadoDe` para separar um `Recusado` de um `Falhou`.
* `use<X>.ts`: o **orquestrador** do cliente, ao lado de `eventosDe<X>.ts`. É um hook React (`useCatalogo`, `useMembros`) que chama as rotas com `chamar` (`src/lib/chamar.ts`, sobre o `fetch`) e `await`, recarrega o que mostra depois de cada evento e publica o estado que a tela renderiza.
* `regras.ts`: os **casos de uso**, funções puras e síncronas. O servidor impõe `emprestar`; o cliente importa `podePegarEmprestado` só para decidir o que mostrar.
* `repositorio.server.ts`: o **repositório**, que recebe o `db` primeiro e, quando a leitura depende do dia, também `hoje`: `buscarMembro(db, id, hoje)`. Ele também exporta o montador do objeto de repositórios que o orquestrador recebe, fechado sobre o `db`: `repositoriosDoCatalogo(db)`, `repositoriosDeMembros(db)`, e, no do empréstimo, `repositoriosDeEmprestimo(db, hoje)`, `repositoriosDeDevolucao(db)` e `repositoriosDeAtrasos(db)`. Há três formas de montar: fechado sobre o `db` e o `hoje` de um pedido (`repositoriosDeEmprestimo`); fechado só sobre o `db`, porque nenhuma leitura depende do dia (`repositoriosDeDevolucao`); e fechado só sobre o `db` com uma leitura que recebe `hoje` do orquestrador a cada chamada (`repositoriosDeAtrasos`, cujo `listarEmprestimosAtrasados(hoje)` o orquestrador chama com o `hoje` que recebeu). Saíram das rotas no segundo uso, a carga dos dados de exemplo.
* `rota.server.ts`: a rota Hono, que lê o relógio uma vez, monta os repositórios pelos montadores e chama o orquestrador. O catálogo e os membros montam os repositórios uma vez, em `rotaDoCatalogo(db)` e `rotaDeMembros(db)`; a do empréstimo os monta a cada requisição, dentro do handler, com `repositoriosDeEmprestimo(db, hoje)`, fechando sobre o `hoje` daquela requisição, porque ele muda de uma requisição para outra. Os `RepositoriosDeDevolucao` não leem `hoje` (a regra `devolver` o põe no `Emprestimo`), então a rota do empréstimo os monta uma vez, com `repositoriosDeDevolucao(db)`, em `rotaDeEmprestimos(db, relogioDeTeste)`. Os `RepositoriosDeAtrasos` também são montados uma vez ali, com `repositoriosDeAtrasos(db)`: a leitura depende do dia, mas o `hoje` é passado pelo orquestrador a cada chamada, `listaDeAtrasosPedida(hoje, repositorios)`, e não fechado no montador. O corpo dos dois `POST` do empréstimo, que têm a mesma forma, é lido por `lerPedido(c)`, no mesmo `rota.server.ts`.

Um arquivo `.server.ts` roda só no servidor; o código do cliente nunca importa um deles. Os testes ficam ao lado do código que testam.

Um arquivo aparece numa fatia quando se paga: uma feature sem regra não tem `regras.ts`, uma que não guarda nada não tem repositório. Código sobre uma feature fica na fatia dela e é importado de lá; o que não pertence a nenhuma vai para `src/lib/` no segundo uso, e o arquivo diz onde estão o primeiro e o segundo.

**Dependências só onde há um fake.** O orquestrador recebe os seus repositórios (o teste passa fakes); o repositório recebe o `db` (o teste passa um SQLite em memória com as migrações reais); caso de uso e tela não recebem nenhuma. O relógio é um valor: `hoje`, string `YYYY-MM-DD`, lida uma vez onde a requisição chega.

O capítulo 6 do livro mostra o mesmo orquestrador assíncrono e com repositórios padrão; este projeto segue a versão do capítulo 7, síncrona e com repositórios obrigatórios, porque o `node:sqlite` é síncrono e o teste sempre passa os repositórios.

## Como os dados são acessados

* **Duas raízes de composição:** o início do servidor (`src/iniciar.server.ts`) e o comando dos dados de exemplo (`scripts/dadosDeExemplo.ts`). Só elas abrem o banco, as duas por `abrirBanco(raiz, banco)`, em `src/banco.server.ts`: o caminho relativo à raiz do repositório (a pasta criada se faltar) ou `:memory:`, o `DatabaseSync` e as migrações pendentes de `migracoes/`. O servidor repassa o `db` às rotas; o comando, à carga, que chama os orquestradores com os repositórios montados sobre ele, como as rotas fazem, numa transação.
* Cada repositório recebe o `db` como primeiro parâmetro; o montador do `repositorio.server.ts` fecha sobre ele o objeto de repositórios que o orquestrador recebe, e a rota (ou a carga) o chama. O repositório do empréstimo recebe também `hoje` (`buscarMembro(db, id, hoje)`, `listarMembrosDoEmprestimo(db, hoje)`), e a rota fecha sobre os dois, por requisição; a exceção é `listarEmprestimosAtrasados(db, hoje)`, cujo `hoje` o orquestrador passa a cada chamada, sobre um montador fechado só no `db`.
* `emAtraso` é calculado pelo repositório com `hoje`: os empréstimos abertos do membro com `devolver_em < hoje`.
* **O relógio:** `dataLocal()`, em `src/lib/dataLocal.ts`, lê a data local da máquina (`getFullYear`, `getMonth() + 1`, `getDate()`; não `toISOString`, que dá o dia de Greenwich), e só dois lugares a chamam, cada um uma vez por uso: `lerHoje(xHoje, relogioDeTeste)`, em `src/features/emprestimos/rota.server.ts`, na chegada de cada requisição, e o comando dos dados de exemplo, uma vez por rodada, que passa o `hoje` à carga. No `lerHoje`, só com o relógio de teste ligado um cabeçalho `x-hoje` presente vale como `hoje`, se for um dia que existe; senão é `HojeInvalido`, `400`, sem tocar o banco. Nenhuma regra, orquestrador ou repositório sabe do cabeçalho.
* O que o servidor guarda e garante está no docs/02.

## Como os erros trafegam

Exceções como valores (capítulo 5 do livro):

* **Recusa:** uma regra dizendo não, devolvida como valor (`RecusaDeEmprestimo`, `NaoEncontrado`).
* **Exceção:** uma falha de fora, capturada em `consultar(executar)`, o único `try`/`catch` perto do banco, e devolvida como `BancoDeDadosFalhou { codigo, mensagem }`. A violação do índice único de empréstimo aberto vira a recusa `JaEmprestado`; qualquer outra falha continua `BancoDeDadosFalhou`. A `mensagem` vai para o log antes de o servidor responder.
* **Erro:** um bug, nunca capturado.
* `throw` nunca conduz fluxo. Toda recusa tem a sua mensagem num `Record` sobre o tipo, então uma recusa nova sem mensagem não compila.
* `Result`, `ok` e `err` estão em `src/lib/result.ts`, e `consultar` e `BancoDeDadosFalhou` em `src/lib/consultar.server.ts`: nasceram no catálogo e vieram para `src/lib/` no segundo uso, os membros.

## Ambientes

* **Local**, a máquina do desenvolvedor (Windows, macOS ou Linux): o cliente, o servidor e o banco SQLite em arquivo. É o único ambiente. `npm run dev` o sobe num terminal só: o Vite em `http://localhost:5173`, que repassa `/api` ao servidor, e o servidor Hono em `http://localhost:3000` (`node --watch src/iniciar.server.ts`), os dois pelo `concurrently`; fechar o comando encerra os dois. Na partida, o servidor cria `data/biblioteca.sqlite` (ignorado pelo git) e aplica as migrações pendentes (docs/02 §Esquema). `npm run dados-de-exemplo` (docs/05 §5) grava nesse mesmo arquivo, sempre ele, com o `npm run dev` aberto ou não: ignora `BANCO` e `PORTA_DO_SERVIDOR`, cria o arquivo e aplica as migrações se faltarem, e a tela mostra os dados depois de recarregar a página.
* **O e2e**, dentro do mesmo ambiente local: `npm run e2e` sobe, pelo `webServer` do `playwright.config.ts`, um servidor e um cliente próprios, o servidor em `http://localhost:3100` com um banco em memória (`:memory:`) e o Vite em `http://localhost:5174`, com `reuseExistingServer: false`. Ele roda com o `npm run dev` aberto sem gravar no banco dele, e começa vazio a cada rodada.

Três variáveis de ambiente opcionais, lidas por `src/iniciar.server.ts`, separam os dois: `BANCO`, o arquivo do banco relativo à raiz do repositório, ou `:memory:` (padrão `data/biblioteca.sqlite`); `PORTA_DO_SERVIDOR` (padrão `3000`), que o `vite.config.ts` também lê para repassar `/api`; e `RELOGIO_DE_TESTE`, que com o valor `cabecalho` liga o relógio de teste: o cabeçalho `x-hoje: AAAA-MM-DD` de cada requisição dá o `hoje` dela (docs/03). Ausente ou com outro valor, o cabeçalho é ignorado. Só o `webServer` do Playwright as passa, pelo `env`, igual em todo sistema; `RELOGIO_DE_TESTE` só no do servidor. Nenhum script do `package.json` as usa (ADR-0005), então o `npm run dev` nunca tem o relógio de teste. O proxy do Vite repassa os cabeçalhos do pedido sem filtrar, `x-hoje` incluído; o e2e que recusa um membro atrasado é a prova.

O servidor roda TypeScript pelo próprio Node, que remove os tipos, sem `tsx` nem passo de build; o `npm run build` é só o do cliente, para `dist/`. A raiz de composição é `src/iniciar.server.ts`, e `src/servidor.server.ts` monta o app Hono (`criarServidor(db, opcoes?)`, com `opcoes.relogioDeTeste` falso por padrão) onde as rotas das fatias se montam; a raiz de composição passa `{ relogioDeTeste: process.env.RELOGIO_DE_TESTE === "cabecalho" }`.

Não há produção nem homologação no Marco 1.

## Tentado e removido de propósito

Nada ainda. Quando algo for tentado e removido, entra aqui com o ADR que diz por quê.
