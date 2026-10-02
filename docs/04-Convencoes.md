# Convenções

## Línguas

* **Documentação:** português do Brasil, incluindo os nomes dos documentos (`00-Produto.md` a `06-Fila.md`), as páginas em `work/` e os ADRs.
* **Identificadores:** português, sem acento (`Emprestimo`, `devolverEm`, `podePegarEmprestado`), como no livro (ADR-0004). Ficam em inglês as palavras da linguagem, os nomes das bibliotecas, `Result`, `ok`, `err`, `value`, `error`, as pastas `features/` e `src/lib/`, e o sufixo `.server.ts`.
* **Texto que o usuário lê:** português do Brasil; as mensagens fixas estão no docs/03. Nenhum travessão em texto que um usuário lê.

## Nomes

* Tipos e componentes em PascalCase: `Emprestimo`, `TelaDeEmprestimo`.
* Funções e variáveis em camelCase: `emprestar`, `buscarMembro`, `hoje`.
* Constantes de domínio em MAIÚSCULAS_COM_SUBLINHADO: `DIAS_DE_EMPRESTIMO`.
* Arquivos de uma fatia como no capítulo 6 do livro: `TelaDe<X>.tsx`, `eventosDe<X>.ts`, `regras.ts`, `repositorio.server.ts`, `rota.server.ts`; testes `<arquivo>.test.ts` ao lado.
* Tabelas e colunas em snake_case, português, sem acento, no singular: `emprestimo`, `devolver_em`.
* Pastas de feature no plural, pelo termo do docs/03: `emprestimos/`, `membros/`, `catalogo/`.
* Slugs de entrega em minúsculas unidas por hífens: `emprestar-livro`.

## Estilo e formatação

* **Biome** faz o lint e a formatação, com tabs para indentar. O que o Biome aceita é o estilo; não há outro guia.
* **Scripts que rodam no Windows sem WSL.** Todo script do `package.json` roda igual no Windows, no macOS e no Linux: nada de `rm`, `&`, `printf` nem variável de ambiente inline. Quando é preciso mais que um comando de ferramenta, o script é um arquivo Node (ADR-0005).
* **TypeScript apagável.** O servidor e os scripts rodam pelo Node, que remove os tipos sem compilar; o `tsconfig.json` liga `erasableSyntaxOnly` e `allowImportingTsExtensions`. Só sintaxe apagável (nada de `enum`, `namespace`, propriedades declaradas no construtor) e imports relativos com a extensão (`./banco.server.ts`, `./Aplicacao.tsx`). Um único `tsconfig.json` cobre cliente, servidor, testes e scripts.

## Estilo visual

Não há arquivo de design. A referência são as capturas `work/done/esqueleto-390.png` e `work/done/esqueleto-1280.png` e as variáveis de `src/estilo.css`, um só arquivo CSS, sem biblioteca de CSS nem de componentes:

| Variável | Valor |
|---|---|
| `--fonte` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--tamanho-do-texto` | `16px` |
| `--altura-da-linha` | `1.5` |
| `--cor-do-texto` | `#1a1a1a`, sobre `--cor-do-fundo` `#ffffff` (contraste 17,4:1) |
| `--cor-de-destaque` | `#1f5f8b`, a faixa do cabeçalho, com `--cor-do-texto-no-destaque` `#ffffff` (contraste 6,8:1) |
| `--margem` | `16px` |
| `--largura-maxima` | `960px`, o conteúdo centrado |

O título do cabeçalho tem `1.5rem`. Sem modo escuro, ícone nem fonte da web.

## Testes

Um teste para cada peça (capítulo 8 do livro). Um teste troca só o I/O e o relógio.

| Peça | O teste dela | Onde fica |
|---|---|---|
| Caso de uso | chamado só com dados, sem preparação, com `hoje` passado como valor | `regras.test.ts`, ao lado |
| Repositório | contra um SQLite em memória com as migrações reais | `repositorio.server.test.ts`, ao lado |
| Orquestrador | com fakes: `falsos` preenche os repositórios que o teste define, e os outros são `naoEsperado`, que lança se chamado; nunca mocks | `eventosDe<X>.test.ts`, ao lado |
| Tela | poucos testes Playwright, um por cenário que o usuário vê | `e2e/`, na raiz |

* Vitest roda os testes unitários no Node; Playwright roda os ponta a ponta num navegador real.
* O nome de um teste é uma frase em português da regra: `emprestar recusa um membro com um livro atrasado`.
* O teste é visto vermelho antes do código que o faz passar.

## Commit

O formato está no docs/05 §6. O assunto diz o que a entrega faz, no presente, como no capítulo 19 do livro, até 72 caracteres, com o slug entre parênteses no fim:

```
Empresta um exemplar, e recusa pelas regras (emprestar-livro)

- <um destaque, uma linha>
- <até cinco>

work/done/emprestar-livro.md
```
