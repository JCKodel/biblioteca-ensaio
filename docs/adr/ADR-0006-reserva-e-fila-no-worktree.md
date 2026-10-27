# ADR-0006: A reserva de uma linha e a leitura da fila com o worktree irmão

**Data:** 2026-10-26

## Contexto

O ADR-0003 decidiu um worktree por entrega, na pasta irmã `../biblioteca-<slug>`, no branch `<slug>`. O kit de 2026.10.27 pede que o /propose reserve a linha criando o branch em origin, para que ela fique tomada em todo clone, e lê a fila com o `queue.sh`. Os scripts do kit, para um worktree por entrega, supõem outro layout: uma pasta oculta ao lado do `main/` (`<oculta>/worktrees/<slug>`) e um prefixo no branch (`focus-kit/<slug>`). O `claim.sh worktree` não consegue criar `../biblioteca-<slug>`, e o `queue.sh worktree` ignora branches sem o prefixo. Os documentos não diziam como reservar nem como ler a fila. O agente escolheu durante a migração do kit, em 2026-10-26; a pessoa pode rever esta decisão.

## Decisão

* O layout do ADR-0003 fica: `../biblioteca-<slug>`, branch `<slug>`, sem prefixo. Nada se move.
* A reserva é a do kit, feita por comandos em vez do `claim.sh`: o branch `<slug>` é criado em origin só quando nenhum clone o tem, a partir do `main` de origin, e o worktree sai dele; um branch que está em origin e não aqui é de outro clone, aberto só com `resume`. Os passos estão em `docs/manuals/worktree-de-uma-entrega.md`.
* A fila é lida com `git -c "alias.fq=!sh .agents/skills/propose/scripts/queue.sh" fq branch`: a estratégia `branch` lê cada branch de origin sem prefixo como a reserva e a cópia da linha do seu slug, que é o que este layout guarda.

## Consequências

* Antes, um worktree só existia neste clone; agora a reserva também cria o branch em origin, e outro clone vê a linha tomada.
* Num worktree, o `queue.sh branch` reconhece a entrega pelo branch em que está.
* Todo branch de origin além do `main` conta como uma entrega; um branch que não é de entrega não deve ir para origin.
* Se a pessoa preferir o layout do kit (pasta oculta e prefixo), uma entrega própria muda o slot de Git e este ADR, e os worktrees abertos terminam antes.
