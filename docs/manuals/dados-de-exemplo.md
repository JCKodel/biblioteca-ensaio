# Dados de exemplo

O que é este comando e quando usá-lo: carregar dados de demonstração no banco do `npm run dev`, para mostrar ou testar à mão as telas com um catálogo, membros e empréstimos de verdade. Precisa do Node 24 ou maior e de `npm ci` já rodado (`docs/manuals/rodar-a-partir-de-um-clone.md`). Saiu do docs/05 §5 na migração do kit de 2026-10-26; as páginas em `work/done/` que citam "docs/05 §5" para os dados de exemplo apontam para cá.

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
