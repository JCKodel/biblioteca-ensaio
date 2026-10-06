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

docs/06: uma linha por entrega, em ordem, sob marcos. A linha nunca sai da fila; ela muda de marca, no momento em que o trabalho muda, para que a fila mostre o que está acontecendo enquanto acontece:

| Marca | Significa | Quem põe |
|---|---|---|
| `[ ]` | não definida | a conversa que acrescenta a linha |
| `[~]` | sendo definida | o /propose, quando começa |
| `[>]` | definida: `work/<slug>.md` existe | o /propose, quando a página está escrita |
| `[*]` | sendo construída | o /apply, quando começa |
| `[x]` | feita: a página está em `work/done/` | o /apply, com a verificação verde |
| `[?]` | esperando | qualquer sessão, nos três casos abaixo |

Uma linha espera quando a pessoa diz que ela está travada, quando precisa de uma resposta que foi pedida e não veio, ou quando precisa de outra linha feita antes, como uma correção encontrada no meio de um /apply. O motivo vai no fim da linha, em inglês, como o kit o escreve: `· blocked: <motivo>` ou `· blocked: after <slug>, <slug>`. Qualquer marca antes de `[x]` pode virar `[?]`. A linha sai de `[?]` quando o motivo se resolve: a pessoa diz, a sessão que registra a resposta tira a marca, ou o /apply a tira quando marca `[x]` a última linha de um `after`. Ela volta para `[>]` quando a página dela existe, e para `[ ]` quando não existe, e o próximo comando a marca de novo.

As linhas do Marco 1 e a `dados-de-exemplo` foram feitas antes destas seis marcas, com `[ ]`, `[>]` e `[x]`; elas significam o mesmo.

Cada marco é planejado com a sua revisão como última linha (§8). Editada por conversa, em qualquer sessão.

## 5. Este projeto

* **Língua da documentação:** português do Brasil. Identificadores em português, sem acento (docs/04).
* **Verificar:** `npm run verify`, que roda a checagem de tipos, o lint, os testes unitários, os testes ponta a ponta e o build. Verde antes de qualquer coisa ser declarada pronta. É o script `scripts/verificar.ts`: roda os passos nessa ordem, para no primeiro que falha, diz qual foi e sai com código diferente de zero. Não regrava as capturas de tela.
* **Ambientes:**
  * Local, a máquina do desenvolvedor: o cliente, o servidor e o banco SQLite. Uma entrega o deixa rodando com as migrações dela aplicadas na partida; o comando que o sobe é `npm run dev` (docs/01 §Ambientes).
* **Prova de uma tela:** capturas de tela com o Playwright em 390 e 1280 pixels de largura, salvas em `work/done/<slug>-*.png`. Não há arquivo de design: a referência é o estilo do esqueleto, registrado no docs/04 §Estilo visual, e as capturas `work/done/esqueleto-390.png` e `-1280.png`. As capturas são tiradas uma vez, fora do `verify`: `npx playwright screenshot --viewport-size=390,844 http://localhost:5173 work/done/<slug>-390.png` (e `1280,800`), com o `npm run dev` rodando. A captura de uma tela que não é a inicial usa o caminho dela: `http://localhost:5173/membros`.
* **Publicação:** nenhuma. Não há ambiente além do local.
* **Contexto:** `context/` vai para o commit. O repositório é público e serve de laboratório, e quem o lê, pessoa ou agente, precisa ver de onde cada decisão veio. Tudo o que está ali é material de exemplo, fictício, sem dado pessoal nem cláusula de confidencialidade; num projeto com mensagens reais de um cliente, a pasta iria para o `.gitignore`.
* **Git:** um worktree por entrega. O /propose cria o worktree `../biblioteca-<slug>` no branch `<slug>`, a partir do `main`, e escreve a página lá; o /apply constrói lá. A pessoa faz o commit no branch e, na pasta principal, o `git merge --no-ff <slug>` no `main` (ou um pull request com commit de merge no GitHub), depois `git worktree remove ../biblioteca-<slug>` e `git branch -d <slug>`. A página e a construção de uma entrega são uma mudança: um merge, desfeito com `git revert -m 1 <merge>`. O agente coloca em stage; ele nunca faz commit nem merge.

### Dados de exemplo

`npm run dados-de-exemplo` carrega no `data/biblioteca.sqlite` (o banco do `npm run dev`, sempre ele) um catálogo, membros e três meses de empréstimos, sempre os mesmos, com as datas contadas a partir do dia em que roda: rodado amanhã, cada empréstimo cai um dia depois, e as contagens não mudam. Sem o arquivo, ele o cria; as migrações pendentes rodam antes, como na partida do servidor. Passa pelas mesmas regras do balcão: os orquestradores, em ordem de data, numa transação só (docs/01 §Como os dados são acessados).

* **Num banco que já tem dados** (qualquer linha em `livro`, `exemplar`, `membro` ou `emprestimo`), o comando recusa, diz quanto há, não muda nada e sai com código 1.
* **Para recomeçar:** `npm run dados-de-exemplo:apagar` apaga todos os livros, exemplares, membros e empréstimos, diz quanto havia e carrega os dados de exemplo; num banco vazio, só carrega. As migrações e o `user_version` ficam. `npm run dados-de-exemplo -- --apagar` faz o mesmo, mas o PowerShell pode engolir o `--`; o script próprio não depende de shell.
* **Com o `npm run dev` aberto**, a carga funciona e a tela mostra os dados depois de recarregar a página. Se o servidor estiver gravando no mesmo instante, a carga pode falhar com `Os dados de exemplo não foram carregados, e nada foi mudado: o banco falhou (database is locked).`: nada mudou, e basta rodar de novo.
* Um argumento que não é `--apagar` é recusado antes de abrir o banco. Qualquer recusa ou falha no meio da carga desfaz tudo, inclusive o que o `--apagar` apagou, e o comando diz qual passo parou.

O que o comando escreve num banco vazio (a data é a do dia):

```text
migração 0001-catalogo.sql
migração 0002-membros.sql
migração 0003-emprestimos.sql
Dados de exemplo carregados em data/biblioteca.sqlite, com hoje 2026-10-02.
30 livros e 60 exemplares.
25 membros, 2 suspensos.
120 empréstimos: 108 devolvidos (90 no prazo, 18 com atraso) e 12 abertos (8 no prazo, 4 atrasados).
```

A tabela citável. Os ids são os do banco, porque a carga começa com as tabelas vazias:

| O quê | Quanto ou quem |
|---|---|
| Livros | 30, ids 1 a 30, todos com ano; 60 exemplares, ids 1 a 60, em ordem de livro (8 livros com 3, 14 com 2, 8 com 1) |
| Membros | 25, matrículas 1 a 25 |
| Empréstimos | 120 nos últimos 90 dias, pelo menos 30 em cada período de 30 dias: 90 devolvidos no prazo, 18 devolvidos com atraso, 8 abertos no prazo e 4 abertos atrasados |
| Na tela de empréstimo | 12 empréstimos abertos e 48 exemplares disponíveis |
| Na tela de atrasos | 4 linhas, nesta ordem: exemplar 26 (Os Sertões), Sofia Campos Ramos, Matrícula 21, "Atrasado há 39 dias"; exemplares 1 (Dom Casmurro) e 20 (O Cortiço), Carla Mendes Rocha, Matrícula 3, "Atrasado há 19 dias", o 1 antes do 20 (emprestados no mesmo dia, o 1 registrado antes); exemplar 34 (Vidas Secas), Lucas Almeida Pereira, Matrícula 12, "Atrasado há 9 dias". O exemplar 46, que vence hoje, não aparece |
| Abertos atrasados | exemplar 1 (Dom Casmurro) e exemplar 20 (O Cortiço), à matrícula 3, Carla Mendes Rocha, emprestados há 40 dias, atrasados há 19; exemplar 34 (Vidas Secas), à matrícula 12, Lucas Almeida Pereira, há 30 dias, atrasado há 9; exemplar 26 (Os Sertões), à matrícula 21, Sofia Campos Ramos, há 60 dias, atrasado há 39 |
| Vence hoje | exemplar 46 (A Hora da Estrela), à matrícula 5, Eduarda Nascimento, emprestado há 21 dias: aberto no prazo, não atrasado |
| Recusados por atraso | matrículas 3 (`emAtraso` 2), 12 e 21 (`emAtraso` 1): "Devolva primeiro os seus livros atrasados." |
| Suspensos | matrículas 8, Henrique Barbosa, e 19, Renata Duarte, com empréstimos, todos devolvidos: "A sua matrícula está suspensa." |
| Nunca emprestados | matrículas 24, Vinícius Rocha Melo, e 25, Yasmin Oliveira Prado; livros 24, Os Lusíadas (exemplar 51), e 25, Amor de Perdição (exemplar 52) |

Os livros, pelo id, com os exemplares de cada um:

| id | Título | Autor | Ano | Exemplares |
|---|---|---|---|---|
| 1 | Dom Casmurro | Machado de Assis | 1899 | 1 a 3 |
| 2 | Memórias Póstumas de Brás Cubas | Machado de Assis | 1881 | 4 a 6 |
| 3 | Quincas Borba | Machado de Assis | 1891 | 7 a 8 |
| 4 | O Alienista | Machado de Assis | 1882 | 9 a 11 |
| 5 | Iracema | José de Alencar | 1865 | 12 a 14 |
| 6 | O Guarani | José de Alencar | 1857 | 15 a 16 |
| 7 | Senhora | José de Alencar | 1875 | 17 a 18 |
| 8 | Lucíola | José de Alencar | 1862 | 19 |
| 9 | O Cortiço | Aluísio Azevedo | 1890 | 20 a 22 |
| 10 | O Ateneu | Raul Pompeia | 1888 | 23 |
| 11 | Triste Fim de Policarpo Quaresma | Lima Barreto | 1915 | 24 a 25 |
| 12 | Os Sertões | Euclides da Cunha | 1902 | 26 a 27 |
| 13 | Memórias de um Sargento de Milícias | Manuel Antônio de Almeida | 1854 | 28 |
| 14 | A Moreninha | Joaquim Manuel de Macedo | 1844 | 29 a 30 |
| 15 | Inocência | Visconde de Taunay | 1872 | 31 |
| 16 | Macunaíma | Mário de Andrade | 1928 | 32 a 33 |
| 17 | Vidas Secas | Graciliano Ramos | 1938 | 34 a 36 |
| 18 | São Bernardo | Graciliano Ramos | 1934 | 37 a 38 |
| 19 | O Quinze | Rachel de Queiroz | 1930 | 39 a 40 |
| 20 | Capitães da Areia | Jorge Amado | 1937 | 41 a 43 |
| 21 | Grande Sertão: Veredas | João Guimarães Rosa | 1956 | 44 a 45 |
| 22 | A Hora da Estrela | Clarice Lispector | 1977 | 46 a 48 |
| 23 | Morte e Vida Severina | João Cabral de Melo Neto | 1955 | 49 a 50 |
| 24 | Os Lusíadas | Luís de Camões | 1572 | 51 |
| 25 | Amor de Perdição | Camilo Castelo Branco | 1862 | 52 |
| 26 | O Primo Basílio | Eça de Queirós | 1878 | 53 a 54 |
| 27 | Os Maias | Eça de Queirós | 1888 | 55 a 56 |
| 28 | A Cidade e as Serras | Eça de Queirós | 1901 | 57 |
| 29 | Mensagem | Fernando Pessoa | 1934 | 58 |
| 30 | Ensaio sobre a Cegueira | José Saramago | 1995 | 59 a 60 |

As matrículas: 1 Ana Beatriz Souza, 2 Bruno Carvalho Lima, 3 Carla Mendes Rocha, 4 Daniel Ferreira Alves, 5 Eduarda Nascimento, 6 Felipe Araújo Costa, 7 Gabriela Ribeiro Santos, 8 Henrique Barbosa, 9 Isabela Moreira Dias, 10 João Pedro Martins, 11 Juliana Teixeira Gomes, 12 Lucas Almeida Pereira, 13 Mariana Castro Freitas, 14 Mateus Cardoso, 15 Natália Pinto Correia, 16 Otávio Monteiro, 17 Patrícia Vieira Lopes, 18 Rafael Cunha Batista, 19 Renata Duarte, 20 Rodrigo Nunes Farias, 21 Sofia Campos Ramos, 22 Thiago Moura Reis, 23 Vanessa Lima Cavalcanti, 24 Vinícius Rocha Melo, 25 Yasmin Oliveira Prado.

Os 120 empréstimos estão em `src/dadosDeExemplo/plano.ts`, em dias antes de `hoje`, e o `plano.test.ts` confere cada número desta seção.

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
