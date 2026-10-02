# Processo

Como uma ideia vira código na biblioteca de empréstimos.

## 1. A regra

Uma entrega é uma página, `work/<slug>.md`. Se não cabe em uma página, são duas entregas. A página não é uma meta de concisão: é o teste de que o escopo foi entendido. Um escopo que precisa de cinco páginas ainda não foi decidido.

## 2. O fluxo

docs/06 → /propose <slug> → work/<slug>.md → /apply <slug>, em uma sessão nova → verificação verde, ambientes como diz o §5 → work/done/<slug>.md e git add → uma pessoa revisa e faz o commit.

O /propose conversa e escreve a página, nunca código. O /apply constrói, prova, atualiza os documentos, coloca em stage e sugere o commit, nunca faz commit.

## 3. A página

    # <slug>

    **Objetivo.** Uma frase: o que o usuário consegue fazer depois.

    **Comportamento.** Cenários verificáveis na linguagem do usuário. Cada
    linha vira um teste ou uma checagem manual.

    **Contrato.** Dados, schema, API, formatos de mensagem, ou "nenhum". A
    única seção que precisa ser exata.

    **Estados.** Vazio, carregando, erro, offline: uma linha cada, ou "os
    padrões". Só quando há uma tela.

    **Referência visual.** Onde está o design, e os tamanhos de tela. Só
    quando há uma tela.

    **Fora do escopo.** O que não entra, com meia linha de motivo cada.

    **Pronto quando.** Uma lista mecânica: os testes X passam; a verificação
    está verde; a captura de tela confere com Y.

Depois do /apply, a página também registra o que aconteceu: o que divergiu, o que foi deixado de fora, o que a prova encontrou, as decisões tomadas.

## 4. A fila

docs/06: uma linha por entrega, em ordem, sob marcos. A linha nunca sai da fila; ela muda de marca: `[ ]` não definida, `[>]` definida e não construída, `[x]` feita. Cada marco é planejado com a sua revisão como última linha (§8). Editada por conversa, em qualquer sessão.

## 5. Este projeto

* **Língua da documentação:** português do Brasil. Identificadores em português, sem acento (docs/04).
* **Verificar:** `npm run verify`, que roda a checagem de tipos, o lint, os testes unitários, os testes ponta a ponta e o build. Verde antes de qualquer coisa ser declarada pronta. É o script `scripts/verificar.ts`: roda os passos nessa ordem, para no primeiro que falha, diz qual foi e sai com código diferente de zero. Não regrava as capturas de tela.
* **Ambientes:**
  * Local, a máquina do desenvolvedor: o cliente, o servidor e o banco SQLite. Uma entrega o deixa rodando com as migrações dela aplicadas na partida; o comando que o sobe é `npm run dev` (docs/01 §Ambientes).
* **Prova de uma tela:** capturas de tela com o Playwright em 390 e 1280 pixels de largura, salvas em `work/done/<slug>-*.png`. Não há arquivo de design: a referência é o estilo do esqueleto, registrado no docs/04 §Estilo visual, e as capturas `work/done/esqueleto-390.png` e `-1280.png`. As capturas são tiradas uma vez, fora do `verify`: `npx playwright screenshot --viewport-size=390,844 http://localhost:5173 work/done/<slug>-390.png` (e `1280,800`), com o `npm run dev` rodando.
* **Publicação:** nenhuma. Não há ambiente além do local.
* **Git:** um worktree por entrega. O /propose cria o worktree `../biblioteca-<slug>` no branch `<slug>`, a partir do `main`, e escreve a página lá; o /apply constrói lá. A pessoa faz o commit no branch e, na pasta principal, o `git merge --no-ff <slug>` no `main` (ou um pull request com commit de merge no GitHub), depois `git worktree remove ../biblioteca-<slug>` e `git branch -d <slug>`. A página e a construção de uma entrega são uma mudança: um merge, desfeito com `git revert -m 1 <merge>`. O agente coloca em stage; ele nunca faz commit nem merge.

## 6. Commit

O agente coloca em stage e sugere a mensagem; a pessoa faz o commit depois de revisar. Assunto no presente, como no capítulo 19 do livro ("Empresta um exemplar, e recusa pelas regras (emprestar-livro)"), até 72 caracteres, com o slug entre parênteses no fim; corpo com até cinco tópicos de uma linha, os destaques e não o raciocínio; a última linha aponta para `work/done/<slug>.md`, onde mora o raciocínio.

## 7. O que este processo não tem

Nenhuma especificação formal, nenhum delta de especificação, nenhuma pasta de mudança, nenhuma tarefa numerada, nenhuma barreira antes da implementação, nenhuma revisão de revisão, nenhum subagente especializado, nenhuma ferramenta que as entregas não pediram. Quando uma dessas é proposta, a pergunta é: que erro concreto ela teria pegado? A resposta nomeia um erro que aconteceu.

## 8. Fechando um marco

Um marco é planejado com a sua revisão como última linha,
`<marco>-review`, uma entrega como as outras: o /propose escreve a página
dela, o /apply a executa. Ela pega o parágrafo do marco cláusula por
cláusula e escreve, para cada uma, que entrega a atende e como uma pessoa a
testa. Ela não revisa código e não corrige nada. A pessoa testa cada
cláusula à mão: uma cláusula que nenhuma entrega atende, ou que falha nas
mãos da pessoa, é um achado.

Cada achado vira uma linha `[ ]` no mesmo marco, abaixo da linha da
revisão, esperando o /propose. O marco fecha quando essas linhas estão
`[x]`. Elas não têm uma segunda revisão: cada uma passa pela sua página,
pela sua prova e pelo commit da pessoa, que é a revisão. Um achado nunca é
uma correção no meio do marco seguinte.
