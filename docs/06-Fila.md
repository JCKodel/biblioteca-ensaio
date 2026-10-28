# Fila

## Marco 1: uma bibliotecária empresta e recebe de volta

Quando ele fecha, uma bibliotecária consegue cadastrar livros, seus exemplares e
membros, emprestar um exemplar a um membro por 21 dias e registrar a devolução;
um membro com um livro atrasado ou com a inscrição suspensa é recusado.

```
[x] esqueleto        app e servidor vazios, npm run verify, primeira captura de tela
[x] catalogo         a bibliotecária cadastra livros e seus exemplares
[x] membros          a bibliotecária cadastra, suspende e reativa membros
[x] emprestar-livro  a bibliotecária empresta um exemplar, e as regras podem recusar
[x] devolver-livro   a bibliotecária registra uma devolução, e o exemplar fica livre
[x] m1-review        o marco conferido contra o parágrafo dele · after all
```

## Marco 2: a biblioteca no dia a dia

Quando ele fecha, a bibliotecária vê os empréstimos vencidos e encontra um livro
pelo título ou pelo autor, vê os empréstimos de um membro com a data de devolução
de cada um, e um bibliotecário novo trabalha no primeiro dia só com o guia.

```
[x] dados-de-exemplo        um comando carrega livros, membros e três meses de empréstimos, para demonstração
[x] lista-de-atrasos        a bibliotecária vê os empréstimos vencidos
[x] busca-no-catalogo       a bibliotecária encontra um livro pelo título ou pelo autor
[ ] emprestimos-do-membro   a página de um membro lista os empréstimos dele, com a data de devolução de cada um
[ ] relatorio-do-mes        a bibliotecária vê quantos empréstimos e devoluções houve em cada mês
[ ] guia-do-bibliotecario   um bibliotecário novo empresta e recebe de volta no primeiro dia, só com o guia
[?] aviso-de-atraso         o membro com livro atrasado recebe um aviso · resume: propose · blocked: OD-2, o email aos membros é uma decisão em aberto (docs/00)
[ ] m2-review               o marco conferido contra o parágrafo dele · after all
```
