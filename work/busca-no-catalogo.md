# busca-no-catalogo

**Objetivo.** No balcão, a bibliotecária digita parte do título ou do nome do autor e a lista do catálogo mostra só os livros que combinam, sem rolar a lista inteira.

Pedido de origem: issue #1 do GitHub, "A bibliotecária encontra um livro pelo título ou pelo autor". Ninguém estava disponível para responder durante o /propose: cada escolha que o pedido não fez foi feita pelo agente, da forma mais simples que atende aos critérios de aceite, e está marcada abaixo como **(escolha do agente)** para a revisão encontrá-la.

**Comportamento.**
* A tela do catálogo (`/`) ganha, entre o título "Livros" e a lista, um campo com o rótulo "Buscar por título ou autor". O formulário de cadastro acima dele não muda.
* A lista filtra enquanto a bibliotecária digita, a cada tecla, sem botão nem Enter **(escolha do agente: é o caminho mais curto até o livro com o membro esperando, e não pede nada ao servidor)**.
* Fica na lista o livro cujo título ou autor contém o texto digitado, em qualquer posição, sem diferenciar maiúsculas nem acentos, nos dois lados: com os dados de exemplo carregados,
  * "memorias" mostra "Memórias Póstumas de Brás Cubas" e "Memórias de um Sargento de Milícias", e só eles;
  * "MEMÓRIAS" e "Memorias" mostram os mesmos dois;
  * "sertoes" mostra "Os Sertões"; "sertão" mostra "Grande Sertão: Veredas" ("sertao" não está dentro de "sertoes": a busca é por trecho, não por raiz de palavra);
  * "machado" mostra os 4 livros de Machado de Assis (Dom Casmurro, Memórias Póstumas de Brás Cubas, Quincas Borba, O Alienista);
  * "alencar" mostra os 4 de José de Alencar; "eça de" e "eca de" mostram os 3 de Eça de Queirós (o "ç" conta como "c"); "eca" sozinho mostra esses 3 e também "Vidas Secas", que tem "eca" no título;
  * "cubas" mostra "Memórias Póstumas de Brás Cubas" pelo título; "assis" mostra os 4 de Machado de Assis pelo autor.
* Um livro que combina pelo título e pelo autor aparece uma vez.
* A ordem é a da lista inteira, do livro mais recente para o mais antigo; a busca só tira linhas, nunca reordena.
* Espaços no começo e no fim do que foi digitado são ignorados ("  machado " é "machado"). Espaços no meio contam como texto: "de assis" acha Machado de Assis; "machado assis" não acha nada **(escolha do agente: um trecho só, sem separar palavras, é a regra mais simples que cumpre os critérios)**.
* Um campo vazio, ou só com espaços, mostra a lista inteira, como hoje.
* Nada combina: no lugar da lista, "Nenhum livro encontrado." **(escolha do agente: o texto; o pedido só diz que a tela avisa)**. Apagar a busca traz a lista de volta.
* O ano e os exemplares não entram na busca: "1899" não acha Dom Casmurro **(escolha do agente: o pedido fala só de título e autor)**.
* Cadastrar um livro ou adicionar um exemplar com uma busca digitada mantém a busca: a lista é relida e filtrada de novo pelo mesmo texto. Um livro novo que não combina com a busca não aparece até ela ser apagada.
* Com o catálogo vazio, a tela continua dizendo "Nenhum livro no catálogo ainda.", digitado algo ou não.
* A busca não chama o servidor: filtra a lista que a tela já carregou ao abrir **(escolha do agente: o catálogo de uma pequena biblioteca cabe numa resposta, e assim nenhuma rota, SQL nem migração muda)**. Um livro cadastrado em outro balcão aparece ao recarregar a página, como hoje.
* O banco não responde ao abrir a tela: a mensagem de `Falhou` do docs/03, como hoje; o campo de busca não aparece sem lista.
* Nada do cadastro de livros e exemplares, dos membros, do empréstimo, da devolução nem dos atrasos muda.

**Contrato.**
* **Banco e servidor:** nenhum. Nenhuma migração (`user_version` continua 3), nenhuma rota nova, e o `GET /api/livros` não muda (docs/02).
* **Caso de uso**, em `src/features/catalogo/regras.ts`, puro, ao lado de `textoDeExemplares`:
  * `buscarNoCatalogo(livros: LivroDoCatalogo[], busca: string): LivroDoCatalogo[]`: apara a `busca`; vazia, devolve `livros`; senão, os livros, na mesma ordem, em que `normalizado(livro.titulo)` ou `normalizado(livro.autor)` contém `normalizado(busca)`. Não recusa nada e não falha, então devolve a lista e não um `Result`, como `textoDeExemplares` devolve o texto.
  * `normalizado(texto)`, privado do `regras.ts` (não exportado): `texto.normalize("NFD")`, sem as marcas combinantes (`/\p{M}/gu`), em `toLowerCase()`. É a primeira ocorrência de normalizar texto no projeto; não vai para `src/lib/` (docs/01, abstração na segunda ocorrência).
* **Cliente:**
  * `useCatalogo()` ganha o estado `busca: string` (começa `""`) e `alterarBusca(valor: string)`, e publica `livrosEncontrados`, que é `buscarNoCatalogo(lista.livros, busca)` quando a lista está `Carregada`. A `ListaDoCatalogo` e as chamadas às rotas não mudam; `recarregar` não toca a `busca`.
  * `TelaDeCatalogo.tsx` renderiza o campo com as classes do formulário (`campo`, `campo__rotulo`, `campo__entrada`), um `<input type="search">` dentro de um `<label>` com o rótulo "Buscar por título ou autor", e a lista a partir de `livrosEncontrados`. Com a lista `Carregada` e não vazia e nenhum livro encontrado, um `<p>` com "Nenhum livro encontrado.".
* **Documentos que a entrega atualiza:** docs/03 (o termo "busca no catálogo", já escrito por este /propose); docs/01, na árvore, se a fatia ganhar arquivo (não deve ganhar); docs/04 §Estilo visual, a captura nova na lista de referências; `docs/manuals/dados-de-exemplo.md`, uma linha "Na busca do catálogo" na tabela citável ("memorias" mostra 2 livros; "machado", 4).

**Estados.**
* Carregando: "Carregando o catálogo.", como hoje, sem o campo de busca.
* Vazio: "Nenhum livro no catálogo ainda.", como hoje, sem o campo de busca **(escolha do agente: não há o que buscar)**.
* Nada encontrado: "Nenhum livro encontrado.", com o campo de busca, para a bibliotecária corrigir o que digitou.
* Erro e offline: a mensagem de `Falhou` do docs/03, sem lista nem campo, como hoje.

**Referência visual.** Não há arquivo de design (docs/05 §5). O campo é um campo do formulário de `work/done/catalogo-390.png` e `-1280.png`, com o rótulo acima, largura até `--largura-do-formulario`, entre o título "Livros" e a lista; a lista e as linhas não mudam. Cabe em 390 pixels sem rolagem horizontal. Capturas em `http://localhost:5173/`, com os dados de exemplo carregados e "machado" digitado na busca. Nenhuma variável de estilo nova é esperada; se vier, entra no `src/estilo.css` e no docs/04.

**Fora do escopo.**
* Busca por assunto: o pedido a deixa de fora, e o livro não tem assunto (docs/03).
* Busca pelo ano, pela quantidade de exemplares ou pelo id: o pedido fala só de título e autor.
* Busca no servidor, com SQL, paginação ou índice: o catálogo de uma pequena biblioteca cabe numa resposta; vira uma entrega quando não couber.
* Várias palavras em qualquer ordem, erro de digitação, relevância ou destaque do trecho achado: um trecho exato, sem acento e sem maiúscula, cumpre os critérios do pedido.
* Buscar o exemplar ou o livro na tela de empréstimo (o `<select>` de exemplares): o pedido é sobre o catálogo; a tela de empréstimo não muda.
* Lembrar a busca entre visitas ou na URL: a busca começa vazia a cada vez que a tela abre.

**Pronto quando.**
* [ ] Os testes unitários de `buscarNoCatalogo` passam, cada um com o nome da regra: acha por trecho do título; acha por trecho do autor; ignora maiúsculas; ignora acentos nos dois lados ("memorias" e "MEMÓRIAS"; "eca" acha "Eça"); apara a busca; busca vazia ou só com espaços devolve a lista inteira; nada combina devolve `[]`; mantém a ordem; um livro que combina por título e autor aparece uma vez; o ano não entra.
* [ ] Um e2e passa em `/`: com três livros cadastrados pela tela, um deles com acento no título e outro com o autor buscado, digitar um trecho sem acento e em maiúsculas mostra só o do título; digitar parte do autor mostra os dele; digitar algo que não existe mostra "Nenhum livro encontrado."; apagar a busca mostra os três.
* [ ] `npm run verify` está verde.
* [ ] Com os dados de exemplo carregados (`npm run dados-de-exemplo`), "memorias" mostra os 2 livros e "machado" os 4 descritos acima, conferidos à mão, como o "Como testar" do pedido.
* [ ] As capturas `work/done/busca-no-catalogo-390.png` e `-1280.png` conferem com a referência visual.
* [ ] Desfazer: `git revert -m 1 <merge>`; a entrega não age fora do git.
