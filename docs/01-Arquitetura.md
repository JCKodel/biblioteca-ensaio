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
    TelaDeEmprestimo.tsx, eventosDeEmprestimo.ts, regras.ts,
    repositorio.server.ts, rota.server.ts,
    regras.test.ts, eventosDeEmprestimo.test.ts,
    repositorio.server.test.ts
src/features/emprestimos/devolucao/   devolver um exemplar
src/features/membros/     o que a biblioteca guarda sobre um membro
src/features/catalogo/    livros e exemplares
src/lib/                  o que não pertence a nenhuma feature, no segundo uso
```

Numa fatia, cada arquivo é uma peça:

* `TelaDe<X>.tsx`: a **tela**, no cliente.
* `eventosDe<X>.ts`: o **orquestrador**. No servidor, o handler da rota chama um orquestrador **síncrono**, como no capítulo 7: `emprestimoPedido(evento, hoje, repositorios)`, com `RepositoriosDeEmprestimo` obrigatório, e `estadoDe` para separar um `Recusado` de um `Falhou`. No cliente, o orquestrador é um hook React que chama a rota com `await` e publica o estado.
* `regras.ts`: os **casos de uso**, funções puras e síncronas. O servidor impõe `emprestar`; o cliente importa `podePegarEmprestado` só para decidir o que mostrar.
* `repositorio.server.ts`: o **repositório**, que recebe o `db`: `buscarMembro(db, id)`.
* `rota.server.ts`: a rota Hono, que lê o relógio uma vez, monta os repositórios fechando sobre o `db` e chama o orquestrador.

Um arquivo `.server.ts` roda só no servidor; o código do cliente nunca importa um deles. Os testes ficam ao lado do código que testam.

Um arquivo aparece numa fatia quando se paga: uma feature sem regra não tem `regras.ts`, uma que não guarda nada não tem repositório. Código sobre uma feature fica na fatia dela e é importado de lá; o que não pertence a nenhuma vai para `src/lib/` no segundo uso, e o arquivo diz onde estão o primeiro e o segundo.

**Dependências só onde há um fake.** O orquestrador recebe os seus repositórios (o teste passa fakes); o repositório recebe o `db` (o teste passa um SQLite em memória com as migrações reais); caso de uso e tela não recebem nenhuma. O relógio é um valor: `hoje`, string `YYYY-MM-DD`, lida uma vez onde a requisição chega.

O capítulo 6 do livro mostra o mesmo orquestrador assíncrono e com repositórios padrão; este projeto segue a versão do capítulo 7, síncrona e com repositórios obrigatórios, porque o `node:sqlite` é síncrono e o teste sempre passa os repositórios.

## Como os dados são acessados

* **Raiz de composição:** o início do servidor abre o banco (`DatabaseSync`), aplica as migrações em ordem e repassa o `db`. Nenhum outro código abre o banco.
* Cada repositório recebe o `db` como primeiro parâmetro; a rota fecha sobre ele para montar o objeto de repositórios que o orquestrador recebe.
* `emAtraso` é calculado pelo repositório com `hoje`: os empréstimos abertos do membro com `devolver_em < hoje`.
* O que o servidor guarda e garante está no docs/02.

## Como os erros trafegam

Exceções como valores (capítulo 5 do livro):

* **Recusa:** uma regra dizendo não, devolvida como valor (`RecusaDeEmprestimo`, `NaoEncontrado`).
* **Exceção:** uma falha de fora, capturada em `consultar(executar)`, o único `try`/`catch` perto do banco, e devolvida como `BancoDeDadosFalhou { codigo, mensagem }`. A violação do índice único de empréstimo aberto vira a recusa `JaEmprestado`; qualquer outra falha continua `BancoDeDadosFalhou`. A `mensagem` vai para o log antes de o servidor responder.
* **Erro:** um bug, nunca capturado.
* `throw` nunca conduz fluxo. Toda recusa tem a sua mensagem num `Record` sobre o tipo, então uma recusa nova sem mensagem não compila.
* `Result`, `ok` e `err` nascem na primeira fatia que os usa e vão para `src/lib/result.ts` no segundo uso.

## Ambientes

* **Local**, a máquina do desenvolvedor (Windows, macOS ou Linux): o cliente, o servidor e o banco SQLite em arquivo. É o único ambiente. O comando que o sobe é criado pela primeira entrega (`esqueleto`).

Não há produção nem homologação no Marco 1.

## Tentado e removido de propósito

Nada ainda: o projeto não tem código. Quando algo for tentado e removido, entra aqui com o ADR que diz por quê.
