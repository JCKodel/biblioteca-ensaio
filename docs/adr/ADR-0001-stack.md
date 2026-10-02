# ADR-0001: Stack

**Data:** 2026-10-02

## Contexto

A biblioteca de empréstimos é o laboratório público do curso baseado no livro *Uma Página de Cada Vez* e precisa bater com o exemplo dele: um app web para o bibliotecário no balcão, um servidor que impõe as regras do empréstimo, e um banco. Os alunos usam Windows, e o agente escreve a maior parte do código. O capítulo 12 do livro escolhe uma stack pelo que o projeto precisa, por quanto código público o agente aprendeu nela, e por a stack conferir a si mesma.

## Decisão

Decisão da pessoa, no /brainstorm:

* TypeScript em todo o código: é a linguagem com mais contribuidores no GitHub, e os tipos conferem o trabalho do agente.
* React com Vite no cliente.
* Node 24 com Hono no servidor.
* SQLite pelo módulo nativo `node:sqlite` (`DatabaseSync`, síncrono), sem ORM, com migrações em arquivos SQL numerados aplicados na partida (o porquê do `node:sqlite` está no ADR-0005).
* Vitest para os testes unitários, Playwright para os ponta a ponta, Biome para lint e formatação.

## Consequências

* Um compilador e testes que rodam em segundos avisam o agente quando ele erra, antes da pessoa.
* O código do livro se lê igual ao do repositório, o que serve ao curso.
* Sem ORM, o SQL é escrito à mão nos repositórios, e o esquema mora nas migrações e no docs/02.
* O repositório é síncrono, então o orquestrador do servidor também é (docs/01).
