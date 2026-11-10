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
- [ ] Vite + React + TS, Tailwind, shadcn init, React Flow, Zustand, motion, Vitest
- [ ] Primeiro deploy no Vercel já com a tela vazia (garante que o deploy não vira problema no fim)

### Fase 1 — Núcleo do editor (~3 h) · OBRIGATÓRIO
- [ ] Criar estado (duplo clique no canvas), arrastar, renomear
- [ ] Marcar inicial (único) e aceitação (círculo duplo)
- [ ] Criar transição arrastando entre estados; editar símbolos (vírgula, ε)
- [ ] Laços e arestas curvas para ida-e-volta; símbolos do mesmo par agrupados
- [ ] Selecionar / apagar (Delete), atalhos de teclado
- [ ] Exportar / importar JSON

### Fase 2 — Conceito visível (~2 h) · DIFERENCIAL
- [ ] Painel com a 5-tupla e tabela δ ao vivo
- [ ] Detector AFD/AFN com destaque dos conflitos no grafo
- [ ] Exportar SVG / PNG
- [ ] Galeria de exemplos (ex.: nº par de a's, termina em "ab", AFN com ε)

### Fase 3 — Simulação e polimento (~2 h) · SE DER TEMPO
- [ ] Simulação passo a passo (play / pause / próximo / voltar)
- [ ] Token animado percorrendo a aresta; cópias do AFN se dividindo e morrendo
- [ ] Aceita → confetti · Rejeita → shake vermelho
- [ ] Undo/redo, link compartilhável (autômato codificado na URL), dark mode

### Fase 4 — Entrega
- [ ] Testes da lógica (Vitest) passando
- [ ] Deploy final no Vercel
- [ ] Vídeo — **roteiro escrito por você** (o PDF pede); mencionar como a IA foi usada

## Registro de uso de IA (para o vídeo)
- Planejamento da arquitetura e escolha de bibliotecas com Claude Code
- (ir anotando aqui o que foi gerado, o que foi escrito/revisado à mão)
