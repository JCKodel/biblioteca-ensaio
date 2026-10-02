# ADR-0005: `node:sqlite` e scripts que rodam no Windows

**Data:** 2026-10-02

## Contexto

Os alunos do curso usam Windows, muitos sem WSL. Um driver de SQLite com dependência nativa precisa compilar ou baixar um binário na instalação, o que falha com frequência no Windows. Scripts de `package.json` escritos para um shell Unix (`rm -rf`, `a & b`, `printf`, `VAR=valor comando`) não rodam no `cmd` nem no PowerShell.

## Decisão

Decisão da pessoa, no /brainstorm:

* O banco é o SQLite pelo módulo nativo do Node, `node:sqlite` (`DatabaseSync`), sem dependência nativa de terceiros e sem ORM.
* Todo script do `package.json` roda no Windows sem WSL: nada de `rm`, `&`, `printf` nem variável de ambiente inline. Quando é preciso mais que um comando de ferramenta, o script é um arquivo Node.

## Consequências

* A instalação roda igual no Windows, no macOS e no Linux, sem compilador.
* O acesso ao banco é síncrono, então repositórios e o orquestrador do servidor são síncronos (docs/01).
* O projeto exige Node 24.
* Um script que pareceria uma linha de shell vira um pequeno arquivo Node.
