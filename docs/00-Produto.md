# Produto

## Propósito

Uma pequena biblioteca empresta exemplares dos seus livros a membros; um bibliotecário registra cada empréstimo e cada devolução.
O app é o balcão dessa biblioteca: ele guarda o catálogo (livros e seus exemplares), os membros, e os empréstimos em aberto e encerrados, e aplica as regras do empréstimo no momento em que o bibliotecário empresta, para que nenhuma regra dependa da memória de quem está no balcão.

## Público

* **O bibliotecário**, a pessoa que usa o app, no balcão. Todo requisito do Marco 1 serve a ele.
* **Os membros** não usam o app no Marco 1. Eles aparecem nos dados (quem pegou o quê, até quando), mas não têm tela, login nem acesso.

## Como funciona

* O bibliotecário cadastra os livros da biblioteca e, para cada livro, os exemplares que existem na estante.
* O bibliotecário cadastra os membros, e pode suspender e reativar um membro.
* Quando um membro quer levar um exemplar, o bibliotecário registra o empréstimo. O app calcula a data de devolução a partir do prazo de empréstimo (docs/03) e a mostra.
* A regra, nas palavras do usuário: **um exemplar volta até a sua data de devolução, e um membro com um exemplar atrasado não pega mais nada.** Um membro suspenso também não pega.
* Quando a regra diz não, o app recusa o empréstimo e diz por quê, com a mensagem do docs/03; nada é registrado.
* Um exemplar emprestado não pode ser emprestado de novo até voltar, mesmo que dois bibliotecários tentem no mesmo instante.
* Quando o membro devolve, o bibliotecário registra a devolução, e o exemplar fica livre para o próximo empréstimo.

## Não é

* Reservas: não existem.
* Multas por atraso: não existem por enquanto; é a decisão em aberto OD-1.
* Categorias de membro: não existem; todo membro tem o mesmo prazo de empréstimo (YAGNI, capítulo 4 do livro).
* Renovações: não existem; um empréstimo termina na devolução (YAGNI, capítulo 4 do livro).
* Notificações por email: não existem por enquanto; é a decisão em aberto OD-2.
* Login de membros: os membros não usam o app.
* Pagamentos: a biblioteca não cobra nada pelo app.

## Valores

As decisões são medidas contra estas palavras:

* **Simples:** a forma mais simples que faz o trabalho, para a pessoa que vem depois.
* **Verificável:** toda regra tem um teste que a nomeia como uma frase, e toda entrega tem uma prova.
* **Legível por quem chega:** quem entra no projeto, pessoa ou agente, entende uma decisão lendo um documento ou uma página, sem perguntar a ninguém.

## Perguntas de produto

Toda decisão responde sim a todas:

1. Um bibliotecário no balcão consegue fazer isto sozinho, sem ajuda?
2. A regra do empréstimo continua valendo (data de devolução, atraso, suspensão), e é imposta num lugar só?
3. Isto está dentro do que o produto é, e fora de "Não é" e das decisões em aberto?
4. Cada regra nova tem um teste cujo nome é uma frase da regra?
5. Quem chega ao projeto entende o porquê lendo a página da entrega?

## Decisões em aberto

Ninguém fecha estas sozinho. Uma página que toca nelas as nomeia como fora do escopo; um agente a quem pedem para construí-las para e pergunta.

* **OD-1, multas por devolução atrasada.** Existem? Quanto? Até a decisão, um atraso só impede novos empréstimos.
* **OD-2, aviso de atraso por email aos membros.** O setor de TI permite enviar email? Até a decisão, nenhum email é enviado.
