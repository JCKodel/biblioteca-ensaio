# Biblioteca de empréstimos

Uma pequena biblioteca empresta exemplares dos seus livros a membros; um bibliotecário registra cada empréstimo e cada devolução.
Prosa em português do Brasil; identificadores em português, sem acento.

## Leia antes de agir
- o produto: docs/00 · o vocabulário: docs/03
- como é construído: docs/01 · estilo e testes: docs/04
- processo: docs/05 · fila: docs/06
- o servidor: docs/02 · as decisões: docs/adr/
- como rodar, e o que uma pessoa faz à mão (reservar e integrar um worktree, os dados de exemplo): docs/manuals/

## Inegociáveis
- Um exemplar volta até a sua data de devolução; um membro com um exemplar atrasado, ou suspenso, não pega mais nada. O servidor impõe a regra (docs/00, docs/02).
- O prazo de empréstimo é escrito uma vez, no docs/03; todo o resto usa o termo.
- Multas (OD-1) e email aos membros (OD-2) são decisões em aberto: pare e pergunte (docs/00).
- Toda regra de negócio é um caso de uso puro que devolve um `Result`; `throw` nunca conduz fluxo (docs/01).
- Nenhuma regra lê o relógio: `hoje` é lido uma vez onde a requisição chega e passado como valor (docs/01).
- Todo script do `package.json` roda no Windows sem WSL (docs/04, ADR-0005).
- Uma entrega = uma página em work/<slug>.md: /propose para definir, /apply para construir. Código só muda dentro do /apply: uma mudança pedida fora dele, por menor que seja, vira uma linha `[ ]` no docs/06, com um rascunho de página para o que a linha não comporta, e a resposta para aí, nomeando o /propose (docs/05 §2).
- Nenhum travessão em texto que um usuário lê (docs/04).
- O agente coloca em stage e sugere a mensagem de commit. Ele nunca faz commit nem merge por conta própria; quando pedido, dá o passo que a pessoa nomeia.
- Coloque em stage só as mudanças desta entrega, como diz o docs/05 §6; preserve as edições sem relação e as entradas de índice que já existem.

## Não reconstrua
- Nada ainda. O que for tentado e removido entra aqui com o seu ADR.

## Como trabalhar
- FOCUS inteiro em fatias verticais, `src/features/<feature>/`: tela, orquestrador, casos de uso, repositório (docs/01, ADR-0002).
- Exceções como valores: `consultar` é o único `try`/`catch` perto do banco; recusas e falhas viajam em `Result` (docs/01).
- `npm run verify` antes de declarar qualquer coisa pronta.
- Abstração na segunda ocorrência concreta, e a entrega diz qual foi a primeira (docs/01).
- Ambiguidade → pergunte. Os documentos são vivos: uma entrega que muda comportamento atualiza o documento dono dele, na mesma entrega.
- Perguntado em que pé estão as coisas, responda pelo docs/06 e pelo work/, e pelos branches das entregas depois de `git fetch`: as linhas em andamento, as marcas delas e o próximo comando, como este host o invoca. Perguntado o que uma entrega decidiu ou por quê, responda pela página dela e pelos ADRs que ela nomeia.
