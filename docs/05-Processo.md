# Processo

Como uma ideia vira código na biblioteca de empréstimos.

## 1. A regra

Uma entrega é uma página, `work/<slug>.md`. Se não cabe em uma página, são duas entregas. A página não é uma meta de concisão: é o teste de que o escopo foi entendido. Um escopo que precisa de cinco páginas ainda não foi decidido.

## 2. O fluxo

docs/06 → /propose <slug> → work/<slug>.md → /apply <slug>, em uma sessão nova → verificação verde, ambientes como diz o §5 → work/done/<slug>.md e git add → uma pessoa usa, revisa e faz o commit.

O /propose conversa e escreve a página, nunca código. O /apply constrói, prova, atualiza os documentos, coloca em stage e sugere o commit, nunca faz o commit por conta própria. Código só muda dentro do /apply: uma mudança pedida em qualquer outro lugar, por menor que seja, vira uma linha `[ ]` no docs/06; o que foi dito e a linha não comporta vai para um rascunho `work/<slug>.md`. A resposta para aí e nomeia `/propose <slug>`, como este host invoca os comandos; a pessoa o roda nesta sessão, cuja conversa o rascunho já guarda, ou numa nova. O /apply sempre começa numa sessão nova, e um subagente conta como uma: ela só tem o que a página diz.

Antes que o /propose mude a fila ou a página, ele reserva a linha como diz o slot de Git do §5: cria o worktree e o branch da entrega em origin, ou reabre o que este clone já tem; um que outro clone criou só abre com a palavra da pessoa, com `resume`. Traga para ele qualquer rascunho deixado para o slug. Acrescente a linha que faltar na fila onde ela cabe e diga que acrescentou. Comece a definir com `[~]`; comece a construir só uma página `[>]` completamente definida, com `[*]`. Siga o §4 para as linhas que esperam e o §6 antes de mudar código ou colocar em stage. Mantenha os slots e as regras do projeto em dia antes de usá-los; relate uma regra de processo que falte em vez de recorrer a uma instrução aposentada.

## 3. A página

    # <slug>

    **Objetivo.** Uma frase: o que o usuário consegue fazer depois.

    **Comportamento.** Cenários verificáveis na linguagem do usuário, cada
    um uma ação com entrada concreta e o resultado que o usuário vê. Inclua
    os casos que devem falhar e as bordas que os documentos implicam. Cada
    linha vira um teste ou uma checagem manual.

    **Contrato.** Dados, schema, API, formatos de mensagem, ou "nenhum". A
    única seção que precisa ser exata: uma tela errada se conserta numa
    sessão, uma coluna errada é uma migração, e uma regra de acesso errada
    já vazou.

    **Estados.** Vazio, carregando, erro, offline: uma linha cada, ou "os
    padrões". Só quando há uma tela.

    **Referência visual.** Onde está o design, e os tamanhos de tela. Só
    quando há uma tela. Uma tela cuja referência ainda não existe ganha uma
    como diz o slot de Design do §5, antes que esta página seja `[>]`.

    **Fora do escopo.** O que não entra, com meia linha de motivo cada.

    **Pronto quando.** Uma lista mecânica: os testes X passam; a verificação
    está verde; a captura de tela confere com Y.

Depois do /apply, a página também registra o que aconteceu, sob um título `## O que aconteceu` abaixo de Pronto quando, para que a definição acima fique como foi lida: o que divergiu, o que foi deixado de fora, o que a prova encontrou, as decisões tomadas. Ela termina com a mensagem de commit que o /apply sugeriu, num bloco cercado cuja info string é `commit`. Há um só bloco final: um /apply retomado substitui a sugestão anterior.

Um rascunho com perguntas de escopo abertas não está pronto para o /apply, mesmo que o arquivo exista: antes de `[>]`, toda seção acima está preenchida ou explicitamente inaplicável, e nenhuma decisão de escopo segue aberta. Peça à pessoa que revise a página: Comportamento verificável, Contrato exato, Fora do escopo nomeando o que ela supunha incluído, escolhas feitas em nome dela explícitas. As correções acontecem na conversa do /propose; o /apply começa numa sessão nova depois.

## 4. A fila

docs/06: uma linha por entrega, em ordem, sob marcos, editada por conversa em qualquer sessão. A ordem é a prioridade: a próxima entrega é a primeira linha livre, e a pessoa reordena por conversa. Uma linha é a marca, o slug, uma frase e os seus sufixos, numa linha só; o que aconteceu vai na página, porque o /propose lê a fila inteira. Uma linha que precisa de outra antes termina com `· after <slug>`, escrito quando a linha é acrescentada, ou `· after all`, toda linha acima dela no seu marco, que é como a revisão é escrita. O `after` é lido por comando: o /propose começa quando toda linha que ele nomeia está `[>]` ou além, porque a definição precisa das páginas delas; o /apply começa quando toda linha que ele nomeia está integrada, porque a construção precisa do código delas. Com um worktree por entrega, integrada é a entrega com merge no `main`, e um `[x]` no seu branch é construída, esperando a integração. Uma linha que nenhuma cláusula do parágrafo do marco atual exige, quem quer que a acrescente, vai para o próximo marco, criado quando falta com um parágrafo que essa linha responde e a sua revisão por último; um achado da revisão do próprio marco fica nele (§8). Perguntado o que pode rodar agora, rode `git -c "alias.fq=!sh .agents/skills/propose/scripts/queue.sh" fq branch`, a estratégia que o slot de Git do §5 diz, e mostre a árvore dele: cada linha sob a última linha que ela espera, com o seu estado, depois as linhas livres para o /apply e para o /propose, em ordem, e a próxima. Ofereça as linhas livres como um comando com vários slugs, dizendo que cada slug é mais um agente e custa tanto quanto uma sessão. Duas construções não podem tocar os mesmos arquivos: antes da primeira edição, o /apply compara os arquivos que a sua página toca com as construções em andamento e as não integradas (§6), e uma sobreposição é um conflito, abaixo. A linha nunca sai da fila; ela muda de marca, no momento em que o trabalho muda, para que a fila mostre o que está acontecendo enquanto acontece:

| Marca | Significa | Quem põe |
|---|---|---|
| `[ ]` | não definida | a conversa que acrescenta a linha |
| `[~]` | sendo definida | o /propose, quando começa |
| `[>]` | completamente definida, página pronta para o /apply | o /propose, quando o §3 está completo |
| `[*]` | sendo construída | o /apply, quando começa |
| `[x]` | feita: a página está em `work/done/`; no branch, construída até o merge; com `· dropped:`, cancelada | o /apply, com a verificação verde; a pessoa, quando cancela |
| `[?]` | esperando | qualquer sessão, nos quatro casos abaixo |

As linhas do Marco 1 e a `dados-de-exemplo` foram feitas antes destas seis marcas, com `[ ]`, `[>]` e `[x]`; elas significam o mesmo.

Um quadro pode ler a fila, e pessoas puxam trabalho dela, então uma marca muda na hora: `[~]` é a primeira edição do /propose, `[*]` é a primeira do /apply, `[x]` é a última do /apply. Uma marca é mudada rodando `git -c "alias.fm=!sh .agents/skills/propose/scripts/mark.sh" fm <slug> "<marca>"`, com `stage` no fim quando a linha vai para o índice, como faz o `[x]` do /apply. Qualquer outra edição no docs/06 é a edição de arquivo do host nas linhas que ela muda, nunca um programa que escreve o arquivo inteiro. Com um worktree por entrega, a marca vive no branch da entrega, que o /propose cria em origin como a reserva, e o `main` mostra a linha como ela estava até o merge. Uma linha cujo branch existe em origin está reservada, digam as suas cópias o que disserem. A cópia do branch é a atual para o seu slug até o merge, a do `main` depois dele; um `[?]` em qualquer cópia bloqueia; uma linha que só um branch tem pertence ao seu marco. O `queue.sh` as lê assim; quem lê à mão, um quadro ou uma sessão, lê do mesmo jeito depois de `git fetch`.

Uma linha espera em quatro casos:

* a pessoa diz que ela está travada;
* ela precisa de uma resposta que foi pedida e não veio;
* um trabalho já começado descobre que precisa de outra linha feita antes, como uma correção encontrada no meio de um /apply;
* a leitura de código de uma revisão de marco deixou de fora parte do seu intervalo (§8).

A linha termina com o comando que a retoma, `· resume: propose` ou `· resume: apply`, depois o motivo, `· blocked: <motivo>` ou `· blocked: after <slug>, <slug>`. Os sufixos ficam em inglês, como o kit os escreve; o motivo, em português. Uma dependência conhecida quando a linha é acrescentada é `· after <slug>` sozinho, sem `[?]`: uma ordem, não uma interrupção. Quando o motivo se resolve (a pessoa diz, a sessão que registra a resposta o tira, ou a última linha de um `after` é integrada), tire os dois sufixos: `resume: propose` volta para `[ ]`, mantendo qualquer rascunho, e `resume: apply` volta para `[>]`.

Uma linha `[~]` ou `[*]` cuja sessão acabou sem travá-la (o host fechou, a conexão ou o seu limite) mantém a marca; o comando dela a retoma com a palavra da pessoa, inspecionando a página, a árvore e o índice antes de editar. Uma entrega que a pessoa cancela, por ser impossível, recusada ou não mais desejada, termina `[x]` com `· dropped: <motivo>` no fim da linha, a sua página em `work/done/` dizendo o que foi construído e desfeito; uma linha cujo `after` a nomeia fica para a pessoa decidir de novo.

Duas sessões numa mesma árvore de trabalho, em linhas livres que tocam arquivos diferentes, são o caso normal de trabalho paralelo em trunk. Outra linha mudando de marca, a página ou os arquivos de outra entrega na árvore e as entradas de índice de outra sessão são trabalho dessa sessão, não um conflito: não pare por eles nem toque neles; mude só a linha desta entrega e coloque em stage só os seus caminhos e trechos, incluindo as suas próprias linhas do docs/06. Um conflito é uma linha editada pelas duas, ou um arquivo de que esta página precisa e que a outra entrega está mudando; então pare e relate. Edições de duas entregas num mesmo trecho, cada uma na sua linha, como as linhas vizinhas da fila, não conflitam em nada: são separadas ao colocar em stage. Em worktrees, mude só a linha desta entrega; quando os branches são integrados, reconcilie o docs/06 por slug, mantendo cada linha no seu estado mais recente, nunca o arquivo inteiro de um lado.

Um comando digitado com vários slugs abre um subagente por slug, cada um seguindo o arquivo do comando com um slug, enviado ao worktree do slug (o /propose o cria). Os subagentes que o `after` deixa rodar juntos são abertos juntos, não um depois do outro; uma linha ainda esperando quando os outros terminam é relatada, não esperada. A sessão não edita nada ela mesma. Um subagente não pode perguntar à pessoa: ele relata a pergunta com o contexto para respondê-la e para; a sessão pergunta e manda a resposta de volta, retomando-o onde o host permite, senão abrindo-o de novo no slug, cujo `[~]` ou `[*]` ele retoma pela palavra do comando. Um comando que diz para decidir sozinho tem cada pergunta respondida pela sua recomendação, escrita na página como resposta do agente, dizendo que o agente a escolheu, para que a revisão a encontre; um que diz para construir também tem um subagente novo rodando o /apply quando uma página chega a `[>]`, a página dizendo que foi construída antes de a pessoa lê-la, e a pessoa lê as páginas e os diffs no fim.

## 5. Este projeto

Um slot diz o quê e o comando, em poucas linhas: o /apply o lê toda vez. Os passos vão num manual, e o que um comando escreve fica na ajuda dele. O projeto pode acrescentar slots próprios; um slot que nomeia o /propose ou o /apply é seguido por esse comando, sem editar a skill.

* **Língua da documentação:** português do Brasil. Identificadores em português, sem acento (docs/04).
* **Verificar:** `npm run verify`, que roda a checagem de tipos, o lint, os testes unitários, os testes ponta a ponta e o build, rápido o bastante para rodar em toda entrega. Verde antes de qualquer coisa ser declarada pronta. É o script `scripts/verificar.ts`: para no primeiro passo que falha, diz qual foi e sai com código diferente de zero. Não regrava as capturas de tela. Testes lentos: nenhum; os ponta a ponta já rodam no `verify`.
* **Ambientes:**
  * Local, a máquina do desenvolvedor: o cliente, o servidor e o banco SQLite. Uma entrega o deixa rodando com as migrações dela aplicadas na partida; o comando que o sobe é `npm run dev` (docs/01 §Ambientes), e a partir de um clone novo, `docs/manuals/rodar-a-partir-de-um-clone.md`.
* **Design:** não há arquivo de design nem ferramenta de design. A referência de uma tela é o estilo do docs/04 §Estilo visual e as capturas das entregas feitas em `work/done/<slug>-390.png` e `-1280.png`, a começar pelas do `esqueleto`; a página diz em Referência visual em quais capturas a tela nova se apoia. O /apply compara a tela com essa referência e corrige ou justifica cada divergência; um valor de estilo novo entra no `src/estilo.css` e no docs/04.
* **Prova de uma tela:** capturas de tela com o Playwright em 390 e 1280 pixels de largura, salvas em `work/done/<slug>-*.png`, tiradas uma vez, fora do `verify`, com o `npm run dev` rodando: `npx playwright screenshot --viewport-size=390,844 http://localhost:5173 work/done/<slug>-390.png` (e `1280,800`). A captura de uma tela que não é a inicial usa o caminho dela: `http://localhost:5173/membros`.
* **Publicação:** nenhuma. Não há ambiente além do local, e o agente não publica nada. As últimas palavras do /apply dizem que o local está no estado da entrega.
* **Contexto:** `context/` vai para o commit. O repositório é público e serve de laboratório, e quem o lê, pessoa ou agente, precisa ver de onde cada decisão veio. Tudo o que está ali é material de exemplo, fictício, sem dado pessoal nem cláusula de confidencialidade; num projeto com mensagens reais de um cliente, a pasta iria para o `.gitignore`.
* **Revisão da entrega:** antes de sugerir o commit, o /apply pede a um agente somente leitura, no modelo da sessão, que leia a entrega inteira contra a sua base: `git diff HEAD` dos caminhos da entrega, em stage ou não, os commits que o branch da entrega já tem (`git log main..HEAD`) e os arquivos que ela criou. Os achados verdadeiros são corrigidos na própria entrega antes da verificação final (ADR-0007).
* **Manuais:** `docs/manuals/`, um arquivo por ação que leva mais de um comando, com o nome do que ela faz. Isso é rodar o produto a partir de um clone novo, o que uma pessoa faz à mão fora de uma entrega (publicar, reverter, trocar um segredo, configurar um serviço) e uma prova que o /apply roda em outra máquina. Cada um se basta para quem o roda sem ter lido mais nada: o que faz e quando, o que precisa estar no lugar, os comandos em ordem, como saber que funcionou, como desfazer, o que quebra se um passo for pulado. Um slot que nomeia um desses comandos aponta para o manual dele em vez de guardar os passos; uma entrega que muda um atualiza o manual dele.
  * Rodar a biblioteca a partir de um clone novo: `docs/manuals/rodar-a-partir-de-um-clone.md`.
  * Carregar e recomeçar os dados de exemplo (`npm run dados-de-exemplo`): `docs/manuals/dados-de-exemplo.md`.
  * Reservar, integrar e desfazer o worktree de uma entrega: `docs/manuals/worktree-de-uma-entrega.md`.
* **Revisão do marco:** os leitores do kit, um agente somente leitura por área, no modelo da sessão, com um verificador no mesmo modelo (ADR-0007). As áreas, pelos módulos do docs/01: catálogo e membros (`src/features/catalogo/`, `src/features/membros/`); o empréstimo, com a devolução e os atrasos (`src/features/emprestimos/`); a base e os dados (`src/lib/`, `src/*.server.ts`, `migracoes/`, `src/dadosDeExemplo/`, `scripts/`); a tela comum, os ponta a ponta e os documentos (`src/estilo.css`, `src/Aplicacao.tsx`, `src/cliente.tsx`, `e2e/`, `docs/`).
* **Git:** um worktree por entrega (ADR-0003), na pasta irmã `../biblioteca-<slug>`, no branch `<slug>`, sem prefixo. A página e a construção de uma entrega são uma mudança: um merge no `main`, desfeito com `git revert -m 1 <merge>`. O revert desfaz o que o git guarda; uma entrega que age fora do git (uma migração rodada num banco que não é descartável, uma mensagem enviada) diz no seu Pronto quando como isso se desfaz, ou que não se desfaz. O agente coloca em stage; ele nunca faz commit nem merge por conta própria e, quando pedido, dá o passo que a pessoa nomeia. O /propose reserva a linha criando o branch em origin, só quando nenhum clone o criou, e o worktree a partir do `main` de origin, como diz `docs/manuals/worktree-de-uma-entrega.md`; um branch `<slug>` que está em origin e não aqui é de outro clone, aberto só com `resume`. O `claim.sh` do kit não serve a este layout, porque pede uma pasta oculta e um prefixo; a fila é lida com a estratégia `branch` do `queue.sh`, que lê os branches sem prefixo (ADR-0006). A pessoa faz o commit no branch e o merge, e remove o worktree, como diz o mesmo manual. Uma sessão na pasta principal que edita um worktree precisa da pasta dele liberada no host, como diz o manual.

## 6. Commit

Esta seção é dona do formato do commit; o docs/04 aponta para cá. Antes de editar, inspecione o `git status`, os diffs e os arquivos não rastreados. O que esta entrega não mudou (a página de outra sessão, os arquivos e o trecho dela no docs/06, a edição de qualquer pessoa) não é dela: preserve isso e as entradas de índice que já existem. Quando uma mudança que esta entrega precisa editar não é claramente dela, pare e relate os caminhos; não faça reset nem stash deles.

Coloque em stage só os arquivos ou trechos desta entrega, incluindo a mudança da página para `work/done/` e as mudanças de documentação. Use caminhos explícitos para os arquivos que são só dela e stage seletivo para os arquivos mistos; nunca `git add -A` nem `git add .`. Inspecione o diff em stage depois e relate qualquer entrada sem relação que já estava em stage, que um commit simples incluiria; não a tire do índice. Um commit precisa conter só esta entrega para que a promessa de uma mudança se cumpra. Com duas sessões numa mesma árvore, a pessoa faz o commit de cada entrega quando a sessão dela termina, de um índice que contém só ela. Nunca nomeando caminhos no `git commit`: isso pega cada arquivo nomeado inteiro da árvore de trabalho e leva o trecho da outra sessão, em stage ou não. Uma árvore de trabalho tem um índice só, então, quando a segunda sessão já colocou em stage, a pessoa põe os caminhos dela de lado com `git restore --staged <caminhos>`, faz o commit da primeira e os coloca em stage de novo.

O agente coloca em stage e sugere a mensagem; a pessoa faz o commit depois de revisar. Assunto no presente, como no capítulo 19 do livro ("Empresta um exemplar, e recusa pelas regras (emprestar-livro)"), até 72 caracteres, com o slug entre parênteses no fim; corpo com até cinco tópicos de uma linha, os destaques e não o raciocínio; a última linha aponta para o caminho real da página, onde mora o raciocínio: `work/done/<slug>.md` quando pronta, `work/<slug>.md` quando travada. Uma mensagem parcial diz que é parcial e nomeia o que a trava; não pode dar a entender que a verificação passou ou que a entrega está pronta.

Uma entrega travada no seu worktree pode deixar mudanças parciais em stage para a pessoa fazer o commit no branch, e o branch fica sem merge até a entrega estar completa, para que um merge só ainda contenha a entrega inteira; o bloco `commit` é um rascunho para a entrega inteira.

## 7. O que este processo não tem

Nenhuma especificação formal, nenhum delta de especificação, nenhuma pasta de mudança, nenhuma tarefa numerada, nenhuma barreira antes da implementação além de uma página completa, nenhuma revisão de revisão, nenhum subagente além do um por slug de um comando (§4) e dos leitores e do verificador das revisões (§5, §8), nenhuma ferramenta que as entregas não pediram. Quando uma dessas é proposta, a pergunta é: que erro concreto ela teria pegado? A resposta nomeia um erro que aconteceu.

## 8. Fechando um marco

Um marco é planejado com a sua revisão como última linha, `<marco>-review · after all`, uma entrega como as outras: o /propose escreve a página dela quando toda linha acima está definida, o /apply a executa quando toda linha acima está integrada. Ela pega o parágrafo do marco cláusula por cláusula e escreve, para cada uma, que entrega a atende e como uma pessoa a testa. Ela não corrige nada. Ela roda os testes lentos do §5, quando o slot os nomeia; um que falha é um achado. A pessoa testa cada cláusula à mão: uma cláusula que nenhuma entrega atende, ou que falha nas mãos da pessoa, é um achado.

A revisão também lê o código, o único olhar sobre o todo em vez de uma entrega: toda página pode estar certa e o todo errado. A página dela nomeia a base e o fim do intervalo. A base é o commit da revisão do marco anterior, para que o intervalo contenha as correções dos achados dela, que não têm segunda revisão; para um primeiro marco, o primeiro commit; onde não existe revisão anterior, um commit que a página nomeia, dizendo por quê. O fim é o commit em que o HEAD estava quando a leitura começou, para que o intervalo fique fixo enquanto os leitores trabalham. Os caminhos são os que `git diff --stat <base>..<fim>` mostra: sempre o intervalo, porque um commit sozinho lê só aquele commit. Ela custa, então a sessão diz que é hora e só a começa com a palavra da pessoa. O slot de Revisão do marco do §5 diz quem lê: a revisão profunda do host, que a pessoa lança sobre esse intervalo, ou os leitores do kit, um agente somente leitura por área do slot, em paralelo onde o host roda agentes, senão uma sessão nova por área, aberta pela pessoa. Uma área grande demais para uma leitura cuidadosa se divide de novo. Cada leitor tem o repositório inteiro aberto e lê as mudanças da sua área procurando o que a revisão de nenhuma entrega podia ver, o trabalho de uma entrega contra o de outra, um documento contra outro, o todo contra o docs/01, e relata candidatos por arquivo e linha e os caminhos que leu. De qualquer jeito, um verificador, um agente ou a sessão da revisão, abre o arquivo de cada candidato e o marca como visto (verdadeiro no arquivo hoje), latente (nada o dispara hoje) ou fraco (a afirmação não se sustenta como foi dita) antes que a pessoa o veja. Eles não corrigem nada. Quando os caminhos lidos deixam de fora alguns do intervalo, a página diz quais e a linha espera como `[?]` com `· resume: apply` e `· blocked: <o que foi lido>` (§4). Um candidato que a pessoa confirma é um achado como os outros.

Cada achado vira uma linha `[ ]` no mesmo marco, abaixo da linha da revisão, esperando o /propose. O marco fecha quando essas linhas estão `[x]`. Elas não têm uma segunda revisão: cada uma passa pela sua página, pela sua prova e pelo commit da pessoa, que é a revisão. Um achado nunca é uma correção no meio do marco seguinte.
