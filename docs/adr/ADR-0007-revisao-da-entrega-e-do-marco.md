# ADR-0007: Quem revisa uma entrega e quem lê o código de um marco

**Data:** 2026-10-26

## Contexto

O kit de 2026.10.27 acrescenta ao docs/05 §5 dois slots que este projeto não tinha: a Revisão da entrega, um contexto que não escreveu a entrega lendo as mudanças dela antes do commit, e a Revisão do marco, que agora também lê o código do marco inteiro (§8). Até aqui, a revisão do marco só conferia as cláusulas à mão (`work/done/m1-review.md`). Os documentos não diziam quem faz nenhuma das duas. O agente escolheu durante a migração do kit, em 2026-10-26; a pessoa pode rever esta decisão.

## Decisão

* **Revisão da entrega:** um agente somente leitura, no modelo da sessão, lê a entrega inteira contra a sua base: `git diff HEAD` dos caminhos dela, em stage ou não, os commits que o branch da entrega já tem e os arquivos que ela criou. É a opção do kit que não depende de um host: o projeto é usado em vários (`.claude/`, `.cursor/`, `.gemini/`, `.github/`).
* **Revisão do marco:** os leitores do kit, um agente somente leitura por área, no modelo da sessão, com um verificador no mesmo modelo. As áreas saem dos módulos do docs/01: catálogo e membros; o empréstimo, com a devolução e os atrasos; a base e os dados; a tela comum, os ponta a ponta e os documentos. É o que o kit propõe quando o slot não nomeia um comando do host.

## Consequências

* Cada /apply custa mais um agente antes de sugerir o commit.
* A `m2-review` é a primeira revisão que lê código. A base do intervalo dela é o commit da `m1-review`.
* Uma área que cresce demais para uma leitura cuidadosa se divide no slot.
