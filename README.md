# Editor de Autômatos

Editor gráfico de autômatos finitos (AFD e AFN) feito para o **Projeto 1 de Linguagens Formais (UFPB), item 2.2, "Editor gráfico para autômatos"**.

O desenho e a definição formal andam juntos: o canvas fica à esquerda e, à direita, a 5-tupla M = (Q, Σ, δ, q₀, F) e a tabela de transição se atualizam enquanto você desenha. O editor diz sozinho se o autômato é determinístico ou não e simula uma cadeia passo a passo, mostrando o símbolo percorrendo as transições.

**App:** https://editor-automatos.vercel.app

## O que o editor faz

- **Desenhar.** Crie estados, arraste-os, renomeie, marque o estado inicial (só um) e os de aceitação (círculo duplo). Crie transições entre estados, laços e transições de ida e volta (a aresta curva para não se sobrepor). Vários símbolos entre o mesmo par de estados ficam numa só aresta (`a, b`).
- **Definição formal ao vivo.** A aba *Definição* mostra Q, Σ, q₀, F e cada δ(q, a); a aba *Tabela δ* mostra a tabela de transição, com `→` no estado inicial, `*` nos de aceitação e `∅` onde não há transição.
- **AFD ou AFN, detectado sozinho.** O autômato é AFN quando um estado tem duas ou mais transições para o mesmo símbolo ou quando há ε-transição. Os conflitos ficam em laranja no canvas, as células responsáveis ficam marcadas na tabela e a ilha de status no topo lista o motivo (`δ(q0, a) tem 2 destinos`, `ε-transição de q0 para q1`). A ilha expande ao passar o mouse (ou ao focá-la pelo teclado) e também avisa: sem estado inicial, sem estado de aceitação, estado inalcançável e AFD incompleto.
- **Simulação passo a passo.** Digite uma cadeia na aba *Simular* e use reproduzir/pausar, passo anterior, próximo passo, início e fim. A fita mostra o símbolo lido, o token anima na transição usada e o painel lista as **cópias ativas** (no AFN, a leitura de um símbolo pode levar a várias cópias ao mesmo tempo; as cópias sem transição para o símbolo lido aparecem riscadas e morrem naquele passo). O ε-fecho é aplicado no início e depois de cada leitura. Cadeia aceita: confete; rejeitada: o selo treme. Cadeia vazia (ε) também funciona.
- **JSON.** Exporta e importa no formato do professor e em um formato completo que guarda tudo (veja [Formatos JSON](#formatos-json)).
- **SVG e PNG.** O SVG é gerado a partir do modelo do autômato (não é captura de tela); o PNG é desenhado a partir desse SVG, em 2x, com fundo branco.
- **Link compartilhável.** O botão de link copia uma URL com o autômato inteiro codificado no `#` do endereço. Quem abrir o link já vê o autômato, sem servidor e sem conta; colado numa aba onde o editor já está aberto, o link também carrega. Se havia um desenho no canvas, *Desfazer* o traz de volta. Depois de lido, o código sai da barra de endereço. Autômatos muito grandes não cabem no link; para eles, use o JSON.
- **Salvo no navegador.** O autômato fica guardado no `localStorage` a cada edição e volta ao recarregar a página (o histórico de desfazer, não). Um link compartilhável aberto tem prioridade sobre o desenho salvo. Sem armazenamento disponível (navegação privada, bloqueio), o editor funciona igual, só não lembra o desenho.
- **Desfazer e refazer** (até 100 passos).
- **Exemplos prontos** no menu *Exemplos* do dock: número ímpar de a's (o exemplo do PDF), termina em `ab`, contém `aba` (AFN) e só a's ou só b's (AFN com ε-transições).
- Funciona em telas estreitas: abaixo de 768 px o painel vira uma gaveta na base da tela.

## Como usar

1. **Estado:** dê dois cliques no fundo do canvas, ou escolha a ferramenta *Estado* (`S`) e clique. O primeiro estado criado já é o inicial.
2. **Mover e renomear:** arraste um estado para movê-lo. Com a ferramenta *Selecionar*, dois cliques no estado (ou `F2`, ou `Enter` num estado já selecionado) abrem o campo de nome; `Enter` aplica e `Esc` cancela. Os nomes não podem se repetir nem ficar vazios.
3. **Inicial e aceitação:** clique com o botão direito no estado (no teclado, tecla de menu ou `Shift+F10` com o estado em foco) para *Marcar como inicial*, *Alternar aceitação*, *Renomear* ou *Excluir*. Na tela de toque, segure o dedo no estado. Enquanto houver estados, uma dica no topo do canvas lembra esse menu, e os avisos de estado inicial ou de aceitação ausente dizem onde marcá-los.
4. **Transição:** escolha a ferramenta *Transição* (`T`), clique no estado de origem e depois no de destino (os dois iguais fazem um laço). Um diálogo pede os símbolos: separe por vírgula e escreva `eps` para ε. Cada símbolo tem um caractere. Com a ferramenta *Selecionar*, dois cliques no rótulo de uma aresta editam os símbolos.
5. **Apagar:** ferramenta *Apagar* (`D`) e clique no estado ou na aresta, ou selecione e aperte `Delete`.
6. **Simular:** aba *Simular*, digite a cadeia (ex.: `abba`) e aperte `Enter` ou *Simular*. Esc dentro do campo encerra a simulação. Editar o autômato também a encerra; arrastar um estado, não.

## Atalhos de teclado

Os atalhos não valem enquanto você digita num campo, num diálogo ou num menu aberto.

| Atalho | Ação |
| --- | --- |
| `V` | Ferramenta *Selecionar* |
| `S` | Ferramenta *Estado* |
| `T` | Ferramenta *Transição* |
| `D` | Ferramenta *Apagar* |
| `Delete` ou `Backspace` | Apaga o estado ou a transição selecionados |
| `⌘Z` / `Ctrl+Z` | Desfazer |
| `⇧⌘Z` / `Ctrl+Shift+Z` | Refazer |
| `Esc` | Cancela a origem escolhida ou o diálogo da transição e encerra a simulação |
| `Enter` num estado ou aresta em foco | Faz o mesmo que o clique; com *Selecionar*, num já selecionado, abre a edição |
| `F2` num estado ou aresta em foco | Com *Selecionar*, renomeia o estado ou edita os símbolos da transição |
| Tecla de menu ou `Shift+F10` num estado em foco | Abre o menu do estado |
| `Enter` no campo da cadeia | Inicia a simulação |

As dicas do dock (passe o mouse sobre um botão) mostram a tecla de cada ferramenta.

## Formatos JSON

Na aba *JSON* dá para alternar entre os dois formatos, copiar, baixar e importar. O botão *Exportar → JSON* do dock baixa o formato do professor.

### Formato do professor

Cada estado é uma chave, e cada símbolo leva ao estado de destino:

```json
{ "q0": { "a": "q1", "b": "q0" }, "q1": { "a": "q0", "b": "q1" } }
```

Em um AFN, os destinos viram listas, e a ε-transição usa a chave `ε`:

```json
{ "q0": { "ε": ["q1", "q2"] }, "q1": { "a": ["q1"] }, "q2": { "b": ["q2"] } }
```

Regras:

- Na exportação, o estado inicial vem primeiro. Na importação, **o primeiro estado do objeto vira o inicial**.
- Esse formato não diz quais estados são de aceitação nem onde cada um fica no canvas. Ao importar, nenhum estado é de aceitação (marque-os depois) e os estados são dispostos num círculo.
- Na importação, o destino pode ser um texto ou uma lista, e `eps` também vale como ε. Cada símbolo é um caractere.
- O editor mostra o JSON indentado; o conteúdo é o mesmo dos exemplos acima.

### Formato completo

Guarda tudo (nomes, posições, estado inicial, estados de aceitação) e permite reimportar o desenho exatamente como estava. O campo `format` identifica o formato:

```json
{
  "format": "automato-editor/v1",
  "automaton": {
    "states": [
      { "id": "q0", "label": "q0", "x": 140, "y": 260, "isInitial": true, "isAccepting": false },
      { "id": "q1", "label": "q1", "x": 500, "y": 260, "isInitial": false, "isAccepting": true }
    ],
    "transitions": [
      { "id": "q0-q0", "from": "q0", "to": "q0", "symbols": ["b"] },
      { "id": "q0-q1", "from": "q0", "to": "q1", "symbols": ["a"] },
      { "id": "q1-q0", "from": "q1", "to": "q0", "symbols": ["a"] },
      { "id": "q1-q1", "from": "q1", "to": "q1", "symbols": ["b"] }
    ]
  }
}
```

A importação valida o conteúdo e recusa o que não faz sentido (estado duplicado, mais de um inicial, transição para estado inexistente, símbolo com mais de um caractere), com uma mensagem de erro abaixo do campo.

## Como rodar

Precisa de Node 22.12 ou mais novo.

```bash
npm install     # instala as dependências
npm run dev     # servidor de desenvolvimento (Vite)
npm test        # roda os testes (Vitest)
npm run build   # confere os tipos (tsc) e gera a versão de produção em dist/
npm run preview # serve o build de produção localmente
```

## Estrutura do projeto

```
src/
  lib/
    automaton/      # o núcleo: TypeScript puro, sem React, com testes ao lado de cada arquivo
      types.ts      # State, Transition, Automaton
      operations.ts # adicionar/remover/renomear estado, inicial, aceitação, transições
      analysis.ts   # alfabeto, AFD ou AFN, conflitos, transições faltando, tabela δ
      simulate.ts   # simulação com ε-fecho, passo a passo
      serialize.ts  # JSON (formato do professor e completo), importação e link compartilhável
      geometry.ts   # laços, curvas e posição dos rótulos das arestas
      svg.ts        # exportação em SVG a partir do modelo
      symbols.ts    # leitura dos símbolos digitados ("a, b, eps")
      build.ts      # monta um autômato a partir de uma descrição literal (usado nos exemplos)
    export/         # download de arquivos e conversão de SVG em PNG (a única parte de `lib` que usa o DOM)
  store/editor.ts   # Zustand + zundo: o autômato, a ferramenta, a seleção, a simulação e o histórico
  components/
    canvas/         # React Flow: estados, transições, diálogo de símbolos
    panels/         # Definição, Tabela δ, JSON e Simular
    toolbar/        # dock de ferramentas e ilha de status
    ui/             # componentes de interface (shadcn/ui e Magic UI)
    animate-ui/     # abas animadas (Animate UI)
  hooks/            # atalhos de teclado, link compartilhável, reprodução da simulação
  examples/         # os autômatos prontos do menu Exemplos
```

A lógica teórica (análise, simulação, serialização, SVG) não depende de React nem do navegador e concentra os testes. A interface só desenha o que o núcleo calcula.

## Testes

`npm test` roda os testes (Vitest): o núcleo (`src/lib/automaton`), o store do editor, a conversão do modelo para o React Flow, as notações dos painéis, a fita da simulação, o texto da ilha de status, os atalhos de teclado, a reprodução da simulação e os exemplos.

## Tecnologias

Vite, React 19 e TypeScript; Tailwind CSS 4 e shadcn/ui (Radix); React Flow (`@xyflow/react`) para o canvas; Zustand e zundo para o estado e o desfazer; `motion` para as animações; componentes Animate UI (abas) e Magic UI (Confetti, Border Beam, Number Ticker, Shimmer Button); `lz-string` para o link compartilhável; Sonner para os avisos; Vitest para os testes. Publicado na Vercel.
