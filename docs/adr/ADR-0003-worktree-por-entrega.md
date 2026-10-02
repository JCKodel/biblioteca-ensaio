# ADR-0003: Um worktree por entrega

**Data:** 2026-10-02

## Contexto

O kit oferece três estratégias de git: trunk, um branch por entrega, ou um worktree por entrega. Em todas, a página e a construção de uma entrega são uma mudança que se desfaz em um passo, e o agente nunca faz commit nem merge. No curso, entregas diferentes são construídas ao mesmo tempo, por agentes diferentes, como no capítulo 20 do livro.

## Decisão

Decisão da pessoa, no /brainstorm: **um worktree por entrega.**

* O /propose cria o worktree `../biblioteca-<slug>` no branch `<slug>`, a partir do `main`, e escreve a página lá; o /apply constrói lá.
* A pessoa faz o commit no branch e o `git merge --no-ff <slug>` no `main` (ou um pull request com commit de merge no GitHub), depois `git worktree remove` e `git branch -d`.
* O agente nunca faz commit nem merge.

## Consequências

* Duas entregas são construídas ao mesmo tempo sem se misturar; cada uma chega ao `main` como um merge, desfeito com `git revert -m 1 <merge>`.
* Cada worktree instala as suas dependências (`npm ci`) e custa disco.
* Duas entregas que tocam as mesmas linhas dão conflito no merge; antes de rodar duas ao mesmo tempo, decide-se quais podem correr em paralelo. A fila (docs/06) costuma dar conflito.
* Portas e o banco local são compartilhados entre worktrees; separá-los, se for preciso, é uma entrega própria.
