# ADR-0004: Identificadores em português

**Data:** 2026-10-02

## Contexto

O padrão do kit é identificadores em inglês. A edição em português do livro escreve os nomes que o código inventa em português, sem acento (`Emprestimo`, `podePegarEmprestado`), e mantém em inglês as palavras da linguagem e os nomes das bibliotecas. O repositório precisa bater com o livro, e o curso é dado em português.

## Decisão

Decisão da pessoa, no /brainstorm: **identificadores em português, sem acento**, os do docs/03. Ficam em inglês as palavras da linguagem, os nomes das bibliotecas, `Result`, `ok`, `err`, `value`, `error`, as pastas `features/` e `src/lib/`, e o sufixo `.server.ts`. Documentação, nomes de testes e texto ao usuário em português do Brasil.

## Consequências

* O código do repositório e o do livro usam os mesmos nomes, e o vocabulário do docs/03 é o mesmo da conversa com o bibliotecário.
* Os nomes misturam duas línguas na fronteira com as bibliotecas (`result.ok`, `useState`); essa mistura é aceita.
* Quem não lê português terá mais dificuldade com o código.
