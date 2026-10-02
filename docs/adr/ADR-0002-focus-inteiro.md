# ADR-0002: FOCUS inteiro

**Data:** 2026-10-02

## Contexto

O kit oferece três respostas para a organização do código: o FOCUS inteiro (as quatro peças, exceções como valores, fatias verticais), só os dois princípios (fatias verticais e exceções como valores), ou nenhum. Este repositório é o exemplo do livro, cujos capítulos 5 a 8 ensinam o FOCUS com a biblioteca de empréstimos.

## Decisão

Decisão da pessoa, no /brainstorm: **FOCUS inteiro**, como no capítulo 7 do livro.

* Fatias verticais em `src/features/`: `emprestimos/` (com `devolucao/`), `membros/`, `catalogo/`; `src/lib/` só no segundo uso.
* Tela, orquestrador, caso de uso e repositório, com a tabela de responsabilidades do docs/01.
* No servidor, o orquestrador é síncrono e recebe os repositórios como parâmetro obrigatório, como no capítulo 7 (`emprestimoPedido(evento, hoje, repositorios)`); no cliente, é um hook React que chama a rota com `await`.
* Exceções como valores: `Result`, `consultar` como único `try`/`catch` perto do banco.

O capítulo 6 do livro mostra o orquestrador assíncrono e com repositórios padrão; a pessoa escolheu a forma do capítulo 7.

## Consequências

* Toda regra mora em um caso de uso puro e tem um teste só com dados; todo fluxo tem um teste com fakes, sem banco e sem tela.
* Uma peça só é escrita quando a entrega precisa do trabalho dela: uma feature sem regra não tem `regras.ts`.
* O código do repositório ilustra o livro capítulo por capítulo.
