# Worktree de uma entrega

Cada entrega é feita num worktree próprio, na pasta irmã `../biblioteca-<slug>`, no branch `<slug>`, sem prefixo (ADR-0003, ADR-0006). Este manual diz como reservar a linha criando esse worktree, como deixar uma sessão da pasta principal editá-lo, como integrar a entrega no `main` e como desfazê-la. O /propose faz a reserva; a pessoa faz o commit, o merge e a limpeza.

## O que precisa estar no lugar

* Um clone com `origin` configurado, na pasta principal, no branch `main`.
* Node 24 ou maior (`docs/manuals/rodar-a-partir-de-um-clone.md`).
* Os comandos rodam na pasta principal, a que tem o `main`, salvo quando o passo diz `-C ../biblioteca-<slug>`. São os mesmos no PowerShell, no cmd, no Terminal do macOS e no bash do Linux.

## Reservar a linha (o /propose faz)

1. `git fetch origin`.
2. `git ls-remote --exit-code --heads origin refs/heads/<slug>`. Sem saída (código 2): ninguém reservou; siga para o passo 3.
   * Com saída e a pasta `../biblioteca-<slug>` já existindo aqui: o worktree é deste clone; reabra-o e pare aqui.
   * Com saída e sem a pasta: o branch é de outro clone. Só com a palavra da pessoa (`resume`): `git worktree add --track -b <slug> ../biblioteca-<slug> origin/<slug>`, e pare aqui.
3. `git worktree add --no-track -b <slug> ../biblioteca-<slug> origin/main`: o worktree começa do que está integrado em origin, mesmo que o `main` local esteja atrás.
4. `git -C ../biblioteca-<slug> push -u origin <slug> --force-with-lease=refs/heads/<slug>:`, que cria o branch em origin só se ele ainda não existe. Se o push falhar porque o branch apareceu em origin nesse meio tempo, outro clone reservou antes: `git worktree remove --force ../biblioteca-<slug>` e `git branch -D <slug>`, e a linha não é desta sessão.
5. `npm ci` dentro de `../biblioteca-<slug>`: cada worktree instala as suas dependências.
6. Um rascunho `work/<slug>.md` deixado na pasta principal vai para o worktree.

Como saber que funcionou: `git worktree list` mostra `../biblioteca-<slug>` no branch `<slug>`, `git ls-remote --heads origin <slug>` mostra o branch, e `git -c "alias.fq=!sh .agents/skills/propose/scripts/queue.sh" fq branch` mostra a linha como reservada.

O que quebra se um passo for pulado: sem o push, a linha não fica reservada nos outros clones, e dois podem definir a mesma entrega; sem o `npm ci`, o `npm run verify` falha no worktree.

## Deixar uma sessão da pasta principal editar o worktree

Um comando digitado com vários slugs, na pasta principal, manda um subagente para cada `../biblioteca-<slug>`. A pasta fica fora do repositório principal, então o host precisa dela liberada para leitura e escrita antes: no Claude Code, `/add-dir ../biblioteca-<slug>` na sessão, ou o caminho em `additionalDirectories` das configurações; nos outros hosts, o jeito que cada um tem de abrir mais uma pasta no espaço de trabalho. Sem isso, o subagente não consegue escrever a página nem o código.

## Integrar a entrega (a pessoa faz)

1. No worktree, revise o que está em stage e faça o commit com a mensagem que o /apply sugeriu (docs/05 §6).
2. `git -C ../biblioteca-<slug> push origin <slug>`.
3. Na pasta principal, no `main`: `git pull`, depois `git merge --no-ff <slug>` (ou um pull request com commit de merge no GitHub). Num conflito do docs/06, reconcilie por slug, mantendo cada linha no seu estado mais recente (docs/05 §4).
4. `git push origin main`.
5. `git worktree remove ../biblioteca-<slug>` e `git branch -d <slug>`. Opcional: `git push origin --delete <slug>`; um branch que já está no `main` conta como integrado para o `queue.sh` de qualquer jeito.

Como saber que funcionou: `git log --oneline -1 main` mostra o merge, e a linha aparece `[x]` no `docs/06` do `main`.

O que quebra se um passo for pulado: sem o `--no-ff`, não há commit de merge, e desfazer a entrega deixa de ser um passo só; sem o push do `main`, os outros clones veem a entrega como construída e ainda não integrada.

## Desfazer

* Depois do merge: `git revert -m 1 <merge>` no `main`, e `git push origin main`. O revert desfaz só o que o git guarda; o Pronto quando da entrega diz como desfazer o que ela fez fora do git.
* Antes do merge, uma entrega cancelada: a linha termina `[x]` com `· dropped: <motivo>` e a página vai para `work/done/` dizendo o que foi construído e desfeito (docs/05 §4), com o código que não fica desfeito no próprio worktree. O branch é integrado como em "Integrar a entrega", para que o `main` guarde a linha e a página.
