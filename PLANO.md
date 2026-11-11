# Plano — Editor Gráfico de Autômatos (Projeto 1 · item 2.2)

## Conceito
Editor de autômatos finitos onde **o desenho e a definição formal andam juntos**:
à esquerda o canvas, à direita a 5-tupla (Q, Σ, δ, q₀, F) e a tabela δ atualizando ao vivo.
O editor detecta sozinho se é AFD ou AFN e permite **simular uma cadeia passo a passo**,
com animação mostrando o símbolo percorrendo as transições (e as várias cópias no AFN).

Regra de design: **animação só onde ela explica o conceito** (simulação, não-determinismo,
aceitação/rejeição). O resto da interface é calma e limpa.

## Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- React Flow (`@xyflow/react`) — canvas, nós e arestas customizados
- Zustand (+ `zundo` para undo/redo)
- `motion` (framer-motion) — base de quase todas as libs de animação abaixo
- Vitest — testes da lógica do autômato
- Deploy: Vercel (import do repositório GitHub, preset Vite)

## Bibliotecas de UI — o que usar e onde
| Lib | Usar? | Onde no projeto |
|---|---|---|
| **Animate UI** | Sim (base) | Tabs animadas do painel (Definição / Tabela δ / JSON / Simulação), Switch, Tooltip, Dialog — mesma API do shadcn |
| **Magic UI** | Sim | `Confetti` ao aceitar cadeia · `Border Beam` no estado ativo / painel de simulação · `Number Ticker` em \|Q\|, \|Σ\|, passos · `Shimmer Button` no "Simular" |
| **Cult UI** | Sim | `Dynamic Island` como barra de status ("AFD ✓", "AFN · 2 conflitos", "Passo 3/7 · lendo 'b'") |
| **Aceternity UI** | Pontual | `Floating Dock` como paleta de ferramentas · `Spotlight` na landing (opcional) |
| **React Bits** | Pontual | `Click Spark` ao criar estado · animação de texto no título da landing |
| **21st.dev** | Busca | Registry para achar componentes específicos (command palette, toolbar) se faltar algo |
| Animata / Hover.dev | Talvez | Só inspiração; Hover.dev tem parte paga |
| Inspira UI | Não | É Vue/Nuxt — incompatível com React |
| motionsites / motionin / scrolltide | Não | Marketplaces pagos de prompts/templates de landing page; fora do escopo de um editor |
| posy.page | Não (código) | É um construtor de link-in-bio; serve só como referência estética (temas "papel"/"lofi") |

## Arquitetura
```
src/
  lib/automaton/        # TypeScript puro, sem React — o "coração" teórico
    types.ts            # State, Transition, Automaton
    operations.ts       # add/remove/rename, setInitial, toggleAccepting
    analysis.ts         # alfabeto, tipo AFD/AFN, conflitos, completude
    simulate.ts         # simulação AFD e AFN (fecho-ε), passo a passo
    serialize.ts        # JSON (formato do professor + formato estendido), import
    svg.ts              # exporta SVG limpo a partir do modelo
    *.test.ts
  store/editor.ts       # Zustand + undo/redo
  components/
    canvas/             # StateNode, TransitionEdge (laço, curva bidirecional), Canvas
    panels/             # FormalDefinition, TransitionTable, JsonView, SimulationPanel
    toolbar/            # Dock de ferramentas, StatusIsland
  examples/             # autômatos prontos (galeria)
```

### Modelo
```ts
type State = { id: string; label: string; x: number; y: number; isInitial: boolean; isAccepting: boolean }
type Transition = { id: string; from: string; to: string; symbols: string[] } // "ε" = movimento vazio
type Automaton = { states: State[]; transitions: Transition[] }
```

### Formatos de exportação
- **JSON do professor** (AFD): `{ "q0": { "a": "q1", "b": "q0" }, ... }` — para AFN, valores viram listas.
- **JSON estendido**: inclui `initial`, `accepting` e posições → permite reimportar o desenho.
- **SVG** gerado a partir do modelo (não screenshot) · **PNG** a partir do SVG.

## Fases (prazo: amanhã)
### Fase 0 — Setup (~30 min)
- [x] Vite + React + TS, Tailwind, shadcn init, React Flow, Zustand, motion, Vitest
- [ ] Primeiro deploy no Vercel já com a tela vazia (garante que o deploy não vira problema no fim)

### Fase 1 — Núcleo do editor (~3 h) · OBRIGATÓRIO
- [x] Criar estado (duplo clique no canvas), arrastar, renomear
- [x] Marcar inicial (único) e aceitação (círculo duplo)
- [x] Criar transição entre estados (ficou em dois cliques, origem e destino, em vez de arrastar); editar símbolos (vírgula, ε)
- [x] Laços e arestas curvas para ida-e-volta; símbolos do mesmo par agrupados
- [x] Selecionar / apagar (Delete), atalhos de teclado
- [x] Exportar / importar JSON

### Fase 2 — Conceito visível (~2 h) · DIFERENCIAL
- [x] Painel com a 5-tupla e tabela δ ao vivo
- [x] Detector AFD/AFN com destaque dos conflitos no grafo
- [x] Exportar SVG / PNG
- [x] Galeria de exemplos (nº ímpar de a's do PDF, termina em "ab", contém "aba" (AFN), só a's ou só b's (AFN com ε))

### Fase 3 — Simulação e polimento (~2 h) · SE DER TEMPO
- [x] Simulação passo a passo (play / pause / próximo / voltar)
- [x] Token animado percorrendo a aresta; cópias do AFN se dividindo e morrendo
- [x] Aceita → confetti · Rejeita → shake vermelho
- [x] Undo/redo, link compartilhável (autômato codificado na URL)
- [ ] ~~Dark mode~~ (não feito: ficou fora do escopo do item 2.2)

### Fase 4 — Entrega
- [x] Testes da lógica (Vitest) passando (325 testes em 16 arquivos, `npm test`)
- [ ] Deploy final no Vercel
- [ ] Vídeo — **roteiro escrito por você** (o PDF pede); mencionar como a IA foi usada

## O que ficou diferente do plano
- **Dock e ilha de status:** o Floating Dock (Aceternity) e o Dynamic Island (Cult UI) foram avaliados e descartados. `ToolDock` e `StatusIsland` foram feitos com `motion` e Radix Toolbar, com a mesma ideia visual.
- **Bibliotecas de UI usadas:** Animate UI só nas abas do painel; Magic UI em Confetti, Border Beam, Number Ticker e Shimmer Button.
- **Não feitos:** Click Spark, Spotlight e o tema escuro.
- **Transição:** criada com dois cliques (origem e destino) e um diálogo de símbolos, em vez de arrastar entre os estados.

## Registro de uso de IA (para o vídeo)
O que foi feito com o Claude Code:
- **Planejamento:** a arquitetura, a escolha das bibliotecas, este plano e o plano de implementação em 12 tarefas (`docs/superpowers/plans/2026-11-09-editor-automatos.md`).
- **Implementação:** cada tarefa do plano (setup, núcleo teórico, store, canvas, painéis, dock, simulação) foi delegada a um subagente do Claude Code, uma tarefa por vez ou em paralelo quando os arquivos eram independentes.
- **Revisão automática:** depois de cada tarefa, outro agente do Claude Code revisou o código. Os problemas apontados voltaram para um agente corrigir (houve uma rodada de correção nas tarefas 3, 4, 5, 8, 9, 10 e 11) e o resultado foi revisado de novo.
- **Testes:** os testes do Vitest foram escritos pelos agentes junto com o código.
- **Verificação no navegador:** em cada tarefa de interface (8 a 12), os agentes abriram o app num Chrome real com scripts descartáveis do Playwright (fora do repositório) e conferiram o comportamento e as capturas de tela, inclusive o build de produção, os exemplos, a simulação, as exportações e o link compartilhável.
O que a IA não fez: o roteiro e a gravação do vídeo.

(complete com suas palavras: o que você revisou/escreveu à mão)
