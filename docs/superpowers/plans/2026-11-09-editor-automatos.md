# Editor Gráfico de Autômatos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor web de autômatos finitos (item 2.2 do Projeto 1) onde o usuário desenha AFDs/AFNs, vê a definição formal ao vivo, exporta JSON/SVG/PNG e simula cadeias com animação — publicado no Vercel.

**Architecture:** Toda a teoria vive em `src/lib/automaton/` como TypeScript puro (modelo imutável, análise AFD/AFN, simulação com fecho-ε, serialização, geometria, SVG), coberta por Vitest. Um store Zustand (com undo via zundo) envolve essas funções; a UI (React Flow + shadcn + libs animadas) só lê o store e chama ações. Canvas e exportação SVG compartilham o mesmo módulo de geometria.

**Tech Stack:** Vite + React + TypeScript · Tailwind CSS v4 · shadcn/ui · `@xyflow/react` · Zustand + zundo · `motion` · `lz-string` · Vitest · Animate UI / Magic UI / Cult UI / Aceternity UI · Vercel

**Spec:** `PLANO.md` (raiz do repositório). Desvio aprovado: a landing page com Spotlight foi cortada (YAGNI) — o app abre direto no editor.

## Global Constraints

- Node ≥ 20 e npm. `@xyflow/react` ≥ 12, Tailwind v4 (plugin `@tailwindcss/vite`), zustand ≥ 5, zundo ≥ 2.
- Todo texto de interface em **português (pt-BR)**.
- `src/lib/**` não importa React nem nada de `src/components/**` ou `src/store/**`.
- ε é o caractere `ε` (U+03B5), exportado como `EPSILON`. Na digitação, `eps` é aceito como alias.
- Todo símbolo tem exatamente 1 caractere (exceto `ε`). O simulador lê a cadeia caractere a caractere.
- Rótulos de estado são únicos e não vazios; padrão `q0`, `q1`, … (menor índice livre).
- No máximo um estado inicial. O primeiro estado criado vira inicial.
- `State.x`/`State.y` são o **centro** do círculo. Raio fixo `STATE_RADIUS = 28`.
- O JSON "do professor" segue exatamente o PDF: `{ "q0": { "a": "q1", "b": "q0" }, ... }`.
- Animação só onde explica o conceito: simulação, conflitos de AFN, aceito/rejeitado, troca de abas.
- Trabalho na branch `feat/editor-automatos`, um commit por tarefa. Produção no Vercel = branch `main`.

## Review Focus

1. **Excluir o estado inicial, ou um estado com transições nas duas direções** → nenhuma transição fica órfã e a análise avisa "Nenhum estado inicial" (testes nas Tasks 2 e 3).
2. **Renomear um estado para um nome vazio ou que já existe** → a operação é recusada com mensagem, e o modelo não muda (Task 2).
3. **Importar JSON malformado ou que aponta para um estado inexistente** → mensagem de erro, e o autômato atual não muda (Tasks 5 e 9).
4. **Editar o autômato com uma simulação em andamento** → a simulação é descartada, sem destaques de estados velhos (Task 7).
5. **Cadeia vazia, símbolo fora do alfabeto ou ciclo de ε** → resultado correto e nenhum loop infinito (Task 4).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/automaton/types.ts` | Tipos `State`, `Transition`, `Automaton`, `Point`, `EPSILON` |
| `src/lib/automaton/symbols.ts` | Parse/format da lista de símbolos digitada |
| `src/lib/automaton/operations.ts` | Operações imutáveis de edição |
| `src/lib/automaton/geometry.ts` | `STATE_RADIUS`, layout em círculo, caminhos de arestas/laços |
| `src/lib/automaton/build.ts` | Construtor declarativo (fixtures de teste e exemplos) |
| `src/lib/automaton/analysis.ts` | Alfabeto, AFD/AFN, conflitos, completude, alcançabilidade, tabela δ |
| `src/lib/automaton/simulate.ts` | Fecho-ε e simulação passo a passo |
| `src/lib/automaton/serialize.ts` | JSON do professor, JSON estendido, importação, link compartilhável |
| `src/lib/automaton/svg.ts` | Exportação SVG a partir do modelo |
| `src/lib/export/download.ts` | Download de arquivo e conversão SVG→PNG (browser) |
| `src/examples/index.ts` | Galeria de autômatos prontos |
| `src/store/editor.ts` | Store Zustand + temporal (undo/redo) |
| `src/components/canvas/*` | `toFlow.ts`, `StateNode`, `TransitionEdge`, `ArrowDefs`, `SymbolDialog`, `AutomatonCanvas` |
| `src/components/panels/*` | `SidePanel`, `FormalDefinition`, `TransitionTable`, `JsonPanel`, `SimulationPanel` |
| `src/components/toolbar/*` | `ToolDock`, `StatusIsland` |
| `src/hooks/*` | `useKeyboardShortcuts`, `useShareLink`, `useSimulationPlayback` |

---

### Task 1: Esqueleto do projeto + primeiro deploy

**Files:**
- Create: projeto Vite na raiz (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`), `components.json`, `src/components/ui/*` (shadcn)

**Interfaces:**
- Produces: alias `@/` → `src/`; script `npm test` = `vitest run`; componentes shadcn `button dialog input label context-menu tooltip badge separator sonner table textarea`.

- [ ] **Step 1: Scaffold.** Na raiz do repo: `npm create vite@latest . -- --template react-ts` (diretório não vazio → "Ignore files and continue"), depois `npm install`.
- [ ] **Step 2: Tailwind v4.** `npm install tailwindcss @tailwindcss/vite`; adicionar `tailwindcss()` aos plugins de `vite.config.ts`; `src/index.css` contém `@import "tailwindcss";`.
- [ ] **Step 3: Alias `@/`.** Em `tsconfig.json` e `tsconfig.app.json`: `"baseUrl": "."`, `"paths": { "@/*": ["./src/*"] }`. `npm i -D @types/node`; em `vite.config.ts`: `resolve.alias['@'] = path.resolve(__dirname, './src')`.
- [ ] **Step 4: shadcn.** `npx shadcn@latest init` (base color neutral) e `npx shadcn@latest add button dialog input label context-menu tooltip badge separator sonner table textarea`.
- [ ] **Step 5: Dependências.** `npm install @xyflow/react zustand zundo motion lz-string` e `npm i -D vitest`.
- [ ] **Step 6: Vitest.** Em `vite.config.ts`: `/// <reference types="vitest/config" />` e `test: { environment: 'node' }`. Em `package.json`: `"test": "vitest run"`.
- [ ] **Step 7: Placeholder.** `App.tsx` renderiza tela cheia com o título "Editor de Autômatos" e um `<Button>` do shadcn.
- [ ] **Step 8: Verificar.** `npm run build` → sai sem erros. `npx vitest run --passWithNoTests` → código 0. `npm run dev` → título visível em `http://localhost:5173`.
- [ ] **Step 9: Commit.** `git add -A && git commit -m "chore: scaffold Vite + React + Tailwind + shadcn"`
- [ ] **Step 10: Deploy inicial (precisa do usuário).** Com autorização do usuário: `git push -u origin feat/editor-automatos`. No Vercel: Add New → Project → importar `JucaGF/Projeto1_Linguagens-formais` → preset Vite (build `npm run build`, output `dist`). O deploy de preview da branch deve mostrar o título.

---

### Task 2: Modelo, símbolos, operações e exemplos

**Files:**
- Create: `src/lib/automaton/types.ts`, `symbols.ts`, `operations.ts`, `geometry.ts` (só layout por enquanto), `build.ts`, `src/examples/index.ts`
- Test: `src/lib/automaton/symbols.test.ts`, `src/lib/automaton/operations.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export const EPSILON = 'ε'
  export type StateId = string; export type TransitionId = string
  export interface Point { x: number; y: number }
  export interface State { id: StateId; label: string; x: number; y: number; isInitial: boolean; isAccepting: boolean }
  export interface Transition { id: TransitionId; from: StateId; to: StateId; symbols: string[] }
  export interface Automaton { states: State[]; transitions: Transition[] }
  // symbols.ts
  parseSymbols(input: string): { symbols: string[]; invalid: string[] }
  formatSymbols(symbols: string[]): string            // ['a','ε'] → 'a, ε'
  // geometry.ts
  export const STATE_RADIUS = 28
  circleLayout(count: number, index: number): Point   // centro (320, 260), raio 180, começa à esquerda (ângulo π)
  // operations.ts — todas puras, retornam um Automaton novo
  emptyAutomaton(): Automaton
  addState(a: Automaton, at: Point): { automaton: Automaton; state: State }
  removeState(a: Automaton, id: StateId): Automaton
  moveState(a: Automaton, id: StateId, at: Point): Automaton
  labelError(a: Automaton, id: StateId, label: string): string | null
  renameState(a: Automaton, id: StateId, label: string): Automaton   // devolve `a` inalterado se labelError
  setInitial(a: Automaton, id: StateId): Automaton
  toggleAccepting(a: Automaton, id: StateId): Automaton
  addTransition(a: Automaton, from: StateId, to: StateId, symbols: string[]): Automaton // mescla no mesmo par from→to
  setTransitionSymbols(a: Automaton, id: TransitionId, symbols: string[]): Automaton  // [] remove
  removeTransition(a: Automaton, id: TransitionId): Automaton
  // build.ts — ids = rótulos; id da transição = `${from}-${to}`; posições por circleLayout
  build(spec: { states: string[]; initial?: string; accepting?: string[];
                transitions: [from: string, symbols: string, to: string][] }): Automaton
  // examples/index.ts
  export interface Example { id: string; name: string; description: string; automaton: Automaton }
  export const EXAMPLES: Example[]
  export const PDF_EXAMPLE: Automaton   // = EXAMPLES[0].automaton
  ```
  O id de estado/transição criado pela UI é `crypto.randomUUID()`.

- [ ] **Step 1: Testes de símbolos.**
  ```ts
  expect(parseSymbols('a, b ,a')).toEqual({ symbols: ['a', 'b'], invalid: [] })
  expect(parseSymbols('eps, ε')).toEqual({ symbols: ['ε'], invalid: [] })
  expect(parseSymbols('ab, ,c')).toEqual({ symbols: ['c'], invalid: ['ab'] })
  expect(formatSymbols(['a', 'ε'])).toBe('a, ε')
  ```
- [ ] **Step 2: Testes de operações** (`operations.test.ts`, `at = { x: 0, y: 0 }`):
  - `addState numera q0, q1 e só o primeiro é inicial`: rótulos `q0`/`q1`; `isInitial` true/false.
  - `addState reaproveita o menor índice livre`: com {q0,q1}, remove q0 → o próximo é `q0`.
  - `removeState remove as transições ligadas`: q0 –a→ q1, q1 –b→ q0, q1 –b→ q1; remove q1 → `transitions` = `[]`.
  - `removeState do inicial deixa sem inicial`: `states.some(s => s.isInitial)` = false.
  - `setInitial deixa exatamente um inicial`: depois de `setInitial(q1)`, só q1 tem `isInitial`.
  - `labelError`: `''` → `'O nome não pode ser vazio'`; `'  '` → igual; `'q1'` em q0 → `'Já existe um estado chamado "q1"'`; `'q0'` em q0 → `null`.
  - `renameState com nome inválido devolve o mesmo objeto`: `expect(renameState(a, q0, 'q1')).toBe(a)`.
  - `addTransition mescla símbolos no mesmo par`: `['a']` e depois `['a','b']` em q0→q1 → 1 transição com `['a','b']`.
  - `setTransitionSymbols com [] remove a transição`.
- [ ] **Step 3: Rodar** `npx vitest run src/lib/automaton` → FAIL (módulos inexistentes).
- [ ] **Step 4: Implementar** `types.ts`, `symbols.ts`, `geometry.ts` (`STATE_RADIUS`, `circleLayout`), `operations.ts` e `build.ts` conforme as interfaces.
- [ ] **Step 5: Implementar `src/examples/index.ts`** com `build`:
  1. `impar-de-a` — "Número ímpar de a's (exemplo do PDF)": estados q0,q1; inicial q0; aceita q1; `[q0,'b',q0] [q0,'a',q1] [q1,'a',q0] [q1,'b',q1]`.
  2. `termina-em-ab` — "Termina em ab" (AFD): q0,q1,q2; aceita q2; `[q0,'b',q0] [q0,'a',q1] [q1,'a',q1] [q1,'b',q2] [q2,'a',q1] [q2,'b',q0]`.
  3. `contem-aba` — "Contém aba" (AFN): q0..q3; aceita q3; `[q0,'a,b',q0] [q0,'a',q1] [q1,'b',q2] [q2,'a',q3] [q3,'a,b',q3]`.
  4. `as-ou-bs` — "Só a's ou só b's" (AFN com ε): q0,q1,q2; aceita q1,q2; `[q0,'ε',q1] [q0,'ε',q2] [q1,'a',q1] [q2,'b',q2]`.
- [ ] **Step 6: Rodar** `npx vitest run src/lib/automaton` → PASS.
- [ ] **Step 7: Commit.** `git add src/lib src/examples && git commit -m "feat(lib): modelo, operações, símbolos e exemplos"`

---

### Task 3: Análise (AFD/AFN, conflitos, tabela δ)

**Files:**
- Create: `src/lib/automaton/analysis.ts`
- Test: `src/lib/automaton/analysis.test.ts`

**Interfaces:**
- Consumes: `Automaton`, `EPSILON`, `build`, `EXAMPLES`.
- Produces:
  ```ts
  export type Conflict =
    | { kind: 'nondeterministic'; stateId: StateId; symbol: string; transitionIds: TransitionId[] }
    | { kind: 'epsilon'; transitionId: TransitionId }
  export interface Analysis {
    alphabet: string[]            // ordenado, sem ε
    kind: 'DFA' | 'NFA'           // NFA se houver qualquer conflito
    conflicts: Conflict[]
    missing: { stateId: StateId; symbol: string }[]   // só preenchido quando kind === 'DFA'
    initial: StateId | null
    accepting: StateId[]
    unreachable: StateId[]
    warnings: string[]            // textos prontos para a UI, na ordem abaixo
  }
  analyze(a: Automaton): Analysis
  transitionTable(a: Automaton): { columns: string[]; rows: { state: State; cells: Record<string, StateId[]> }[] }
  // columns = alphabet, + 'ε' no fim se existir alguma transição ε; destinos na ordem de a.states
  ```
  Ordem e texto dos avisos: `'Nenhum estado inicial'`, `'Nenhum estado de aceitação'`, `` `Estado inalcançável: ${label}` `` (um por estado), `` `AFD incompleto: faltam ${n} transições` ``.

- [ ] **Step 1: Testes.**
  - `exemplo do PDF é AFD completo`: `kind 'DFA'`, `alphabet ['a','b']`, `conflicts []`, `missing []`, `warnings []`.
  - `contem-aba é AFN por não determinismo`: `conflicts` contém `{ kind: 'nondeterministic', stateId: 'q0', symbol: 'a', transitionIds: ['q0-q0', 'q0-q1'] }`.
  - `as-ou-bs é AFN por ε`: 2 conflitos `epsilon`; `alphabet ['a','b']`.
  - `AFD incompleto`: `build({ states: ['q0','q1'], initial: 'q0', transitions: [['q0','a,b','q1']] })` → `missing` = `[{q1,a},{q1,b}]`; `warnings` = `['Nenhum estado de aceitação', 'AFD incompleto: faltam 2 transições']`.
  - `inalcançável`: q0 –a→ q0, q2 isolado → `unreachable ['q2']` e aviso `'Estado inalcançável: q2'`.
  - `sem inicial`: `build` sem `initial` → `initial null` e o primeiro aviso é `'Nenhum estado inicial'`.
  - `tabela δ`: em `contem-aba`, `columns ['a','b']`, linha q0 `cells.a = ['q0','q1']`; em `as-ou-bs`, `columns ['a','b','ε']`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/automaton/analysis.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `analyze` e `transitionTable`. Alcançabilidade é uma BFS a partir do inicial, seguindo todas as transições, inclusive ε. Sem inicial, a lista `unreachable` fica vazia.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(lib): análise AFD/AFN e tabela de transição"` (incluir arquivos novos com `git add`).

---

### Task 4: Simulação com fecho-ε

**Files:**
- Create: `src/lib/automaton/simulate.ts`
- Test: `src/lib/automaton/simulate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SimStep {
    consumed: number          // quantos símbolos já foram lidos
    symbol: string | null     // símbolo lido neste passo (null no passo 0)
    active: StateId[]         // cópias vivas após o fecho-ε, na ordem de a.states
    fired: TransitionId[]     // transições usadas para ler `symbol`
    died: StateId[]           // estados ativos no passo anterior sem transição para `symbol`
  }
  export interface SimTrace { input: string; steps: SimStep[]; accepted: boolean; error: 'no-initial' | null }
  epsilonClosure(a: Automaton, ids: Iterable<StateId>): Set<StateId>
  simulate(a: Automaton, input: string): SimTrace   // steps.length === input.length + 1 (exceto com erro)
  ```

- [ ] **Step 1: Testes.**
  - `PDF: ímpar de a's`: `'a'` aceita; `'aa'` rejeita; `'abba'` rejeita; `'bab'` aceita.
  - `passo 0`: `simulate(PDF,'a').steps[0]` = `{ consumed: 0, symbol: null, active: ['q0'], fired: [], died: [] }`; `steps[1].fired` = `['q0-q1']`.
  - `cadeia vazia`: PDF `''` → rejeita (1 passo); `as-ou-bs` `''` → aceita e `steps[0].active` = `['q0','q1','q2']`.
  - `AFN se ramifica`: `contem-aba` `'ba'` → `steps[2].active` = `['q0','q1']`; `'babab'` aceita; `'abba'` rejeita.
  - `símbolo fora do alfabeto`: PDF `'ac'` → `steps[2].active` = `[]`, `steps[2].died` = `['q1']`, rejeita.
  - `ciclo de ε termina`: `build({ states:['q0','q1'], initial:'q0', accepting:['q1'], transitions:[['q0','ε','q1'],['q1','ε','q0']] })`, `''` → aceita.
  - `sem inicial`: `error 'no-initial'`, `steps []`, `accepted false`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/automaton/simulate.test.ts` → FAIL.
- [ ] **Step 3: Implementar.** O fecho é uma busca por pilha com `Set` de visitados (o que garante o término com ciclos de ε). Cada passo: para cada estado ativo, junta os destinos das transições que contêm o símbolo; se um estado não tiver nenhuma, entra em `died`; o conjunto novo é o fecho dessa união. A cadeia é aceita se o último `active` tiver algum estado de aceitação.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit.** `git add src/lib/automaton/simulate* && git commit -m "feat(lib): simulação AFD/AFN com fecho-ε"`

---

### Task 5: Serialização JSON e link compartilhável

**Files:**
- Create: `src/lib/automaton/serialize.ts`
- Test: `src/lib/automaton/serialize.test.ts`

**Interfaces:**
- Consumes: `analyze` (para decidir string × lista), `parseSymbols`, `circleLayout`.
- Produces:
  ```ts
  export type ProfessorJson = Record<string, Record<string, string | string[]>>
  export interface ExtendedJson { format: 'automato-editor/v1'; automaton: Automaton }
  toProfessorJson(a: Automaton): ProfessorJson   // AFD → valores string; AFN → todos os valores em lista; chaves = rótulos
  toExtendedJson(a: Automaton): ExtendedJson
  parseAutomatonJson(text: string): { ok: true; automaton: Automaton } | { ok: false; error: string }
  encodeShare(a: Automaton): string              // lz-string compressToEncodedURIComponent do ExtendedJson
  decodeShare(s: string): Automaton | null
  ```
  Importação do formato do professor: id = rótulo; o inicial é a primeira chave; não há estados de aceitação; posições vêm de `circleLayout`. Estados que só aparecem como destino → erro.

- [ ] **Step 1: Testes.**
  - `exporta o exemplo do PDF igual ao PDF`: `toProfessorJson(PDF_EXAMPLE)` = `{ q0: { a: 'q1', b: 'q0' }, q1: { a: 'q0', b: 'q1' } }`.
  - `AFN usa listas`: em `contem-aba`, `q0` = `{ a: ['q0','q1'], b: ['q0'] }` e `q1` = `{ b: ['q2'] }`.
  - `estado sem transição vira {}`.
  - `ida e volta do estendido`: `parseAutomatonJson(JSON.stringify(toExtendedJson(a)))` → `{ ok: true, automaton: a }` (toEqual) para os 4 exemplos.
  - `importa o formato do professor`: o JSON do PDF → ok; q0 é inicial; `toProfessorJson(resultado)` = JSON do PDF.
  - Erros: `'{'` → `'JSON inválido'`; `'[1,2]'` → `'Formato não reconhecido'`; `'{"q0":{"a":"q9"}}'` → `'Transição para estado inexistente: "q9"'`; `'{"q0":{"ab":"q0"}}'` → `'Símbolo inválido: "ab"'`.
  - `link`: `decodeShare(encodeShare(a))` toEqual `a`; `decodeShare('lixo')` → `null`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.** Na importação estendida, validar a forma mínima (arrays `states`/`transitions`, campos com o tipo certo) e devolver `'Formato não reconhecido'` se algo faltar.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit.** `git add src/lib/automaton/serialize* && git commit -m "feat(lib): exportação/importação JSON e link compartilhável"`

---

### Task 6: Geometria das arestas e exportação SVG

**Files:**
- Modify: `src/lib/automaton/geometry.ts`
- Create: `src/lib/automaton/svg.ts`
- Test: `src/lib/automaton/geometry.test.ts`, `src/lib/automaton/svg.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CURVE_OFFSET = 40
  export interface EdgeGeometry { path: string; labelX: number; labelY: number }
  edgeGeometry(from: Point, to: Point, curved: boolean): EdgeGeometry
  selfLoopGeometry(center: Point): EdgeGeometry
  initialArrowPath(center: Point): string     // seta de 40px vindo da esquerda até a borda do círculo
  toSvg(a: Automaton): string                 // SVG autônomo, fundo branco, fonte serifada
  ```
  Regras: a perpendicular de `from→to` é `(dy, −dx)/|d|`. Reta: vai de borda a borda, com o rótulo no ponto médio + perpendicular·12. Curva: `Q` com ponto de controle = ponto médio + perpendicular·`CURVE_OFFSET`, e rótulo em ponto médio + perpendicular·32 (assim, um par de ida e volta se separa sozinho). Laço: cúbica acima do estado, saindo de −120° e chegando a −60° na borda, com rótulo em `(cx, cy − 72)`. Números arredondados a 2 casas e caminhos no formato `M x y L x y` / `M x y Q cx cy x y` / `M x y C ...`.

- [ ] **Step 1: Testes de geometria.**
  - `reta`: `edgeGeometry({x:0,y:0},{x:100,y:0},false)` → `path 'M 28 0 L 72 0'`, `labelX 50`, `labelY -12`.
  - `curva`: o mesmo par com `true` → `path` contém `'Q 50 -40'`, rótulo `(50, -32)`; o par invertido → rótulo `(50, 32)`.
  - `laço`: `selfLoopGeometry({x:0,y:0})` → `labelX 0`, `labelY -72`, `path` contém `' C '`.
- [ ] **Step 2: Testes de SVG.**
  - `toSvg(PDF_EXAMPLE)` começa com `'<svg'` e contém `xmlns="http://www.w3.org/2000/svg"`, `'>q0<'`, `'>a<'` e `'marker-end'`.
  - O número de `'<circle'` é 3 (2 estados + 1 anel de aceitação).
  - `as-ou-bs` contém `'>ε<'`.
  - `toSvg(emptyAutomaton())` contém `width="200"` e `height="200"`.
- [ ] **Step 3: Rodar** → FAIL.
- [ ] **Step 4: Implementar.** O `viewBox` é a caixa que envolve os estados, mais 60px de margem. Use um `<marker id="arrow">` em `<defs>`. Laço quando `from === to`; curva quando existe a transição inversa `to→from`.
- [ ] **Step 5: Rodar** → PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(lib): geometria de arestas e exportação SVG"` (com `git add` dos arquivos).

---

### Task 7: Store do editor (Zustand + undo)

**Files:**
- Create: `src/store/editor.ts`
- Test: `src/store/editor.test.ts`

**Interfaces:**
- Consumes: tudo de `src/lib/automaton`.
- Produces:
  ```ts
  export type Tool = 'select' | 'add-state' | 'add-transition' | 'delete'
  export type Selection = { kind: 'state' | 'transition'; id: string } | null
  export interface SimulationState { trace: SimTrace; step: number; playing: boolean }
  export interface EditorState {
    automaton: Automaton; tool: Tool; selection: Selection
    pendingFrom: StateId | null                          // 1º clique no modo transição
    pendingTransition: { from: StateId; to: StateId } | null  // abre o SymbolDialog
    simulation: SimulationState | null
    setTool(t: Tool): void; select(s: Selection): void
    addStateAt(p: Point): void
    moveState(id: StateId, p: Point): void
    renameState(id: StateId, label: string): string | null   // devolve o erro
    setInitial(id: StateId): void; toggleAccepting(id: StateId): void
    removeState(id: StateId): void; removeTransition(id: TransitionId): void
    setTransitionSymbols(id: TransitionId, input: string): string | null
    deleteSelection(): void
    clickState(id: StateId): void      // select: seleciona · add-transition: 2 cliques · delete: remove
    confirmTransition(input: string): string | null
    cancelTransition(): void
    loadAutomaton(a: Automaton): void
    startSimulation(input: string): void; stepTo(n: number): void
    setPlaying(p: boolean): void; stopSimulation(): void
  }
  export const useEditor  // create<EditorState>()(temporal(..., { partialize: s => ({ automaton: s.automaton }), limit: 100 }))
  ```
  Regras: **toda ação que muda `automaton` zera `simulation` e `pendingFrom`**. Erros de símbolo: `'Informe ao menos um símbolo'`, `` `Símbolo inválido: ${invalid.join(', ')}` ``. `stepTo` limita o passo a `[0, steps.length-1]`. O estado inicial do store é `emptyAutomaton()` com a ferramenta `select`.

- [ ] **Step 1: Testes** (`beforeEach`: `useEditor.setState(initial)` e `useEditor.temporal.getState().clear()`):
  - `addStateAt duas vezes → q0, q1`.
  - `transição em dois cliques`: ferramenta `add-transition`, `clickState(q0)`, `clickState(q1)` → `pendingTransition {from:q0,to:q1}`; `confirmTransition('a, b')` → `null` e a transição tem `['a','b']`.
  - `laço`: dois cliques no mesmo estado → `{from:q0,to:q0}`.
  - `símbolo inválido mantém o diálogo`: `confirmTransition('ab')` → `'Símbolo inválido: ab'` e `pendingTransition` não muda.
  - `ferramenta apagar`: `clickState(q0)` remove o estado.
  - `editar descarta a simulação`: `loadAutomaton(PDF_EXAMPLE)`, `startSimulation('a')` → `simulation.step 0`; `toggleAccepting('q0')` → `simulation null`.
  - `undo`: `loadAutomaton(PDF)`, `removeState('q1')`, `temporal.undo()` → 2 estados de volta.
- [ ] **Step 2: Rodar** `npx vitest run src/store` → FAIL.
- [ ] **Step 3: Implementar** com `create` + `temporal`.
- [ ] **Step 4: Rodar** `npm test` → tudo PASS.
- [ ] **Step 5: Commit.** `git add src/store && git commit -m "feat: store do editor com undo/redo"`

---

### Task 8: Canvas interativo (React Flow)

**Files:**
- Create: `src/components/canvas/toFlow.ts`, `toFlow.test.ts`, `StateNode.tsx`, `TransitionEdge.tsx`, `ArrowDefs.tsx`, `SymbolDialog.tsx`, `AutomatonCanvas.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useEditor`, `analyze`, `edgeGeometry`, `selfLoopGeometry`, `initialArrowPath`, `STATE_RADIUS`, `formatSymbols`.
- Produces:
  ```ts
  export interface FlowContext {
    selection: Selection; pendingFrom: StateId | null
    active: Set<StateId>; died: Set<StateId>; fired: Set<TransitionId>
    conflicts: Set<TransitionId>; stepKey: number
  }
  export type StateNodeData = { label: string; isInitial: boolean; isAccepting: boolean;
    selected: boolean; pending: boolean; active: boolean; died: boolean }
  export type TransitionEdgeData = { symbols: string[]; curved: boolean; selfLoop: boolean;
    selected: boolean; firing: boolean; conflict: boolean; stepKey: number }
  toFlowNodes(a: Automaton, ctx: FlowContext): Node<StateNodeData>[]   // type 'state', position = centro − STATE_RADIUS
  toFlowEdges(a: Automaton, ctx: FlowContext): Edge<TransitionEdgeData>[] // type 'transition', uma por Transition
  ```
  Decisões: as transições são criadas por **dois cliques** (e não arrastando um handle). Cada nó tem um `Handle` source e um target **invisíveis, de tamanho 0, no centro**. Assim o `sourceX/sourceY` que o React Flow passa à aresta é o centro, que acompanha o arrasto ao vivo. As posições dos nós ficam em `useNodesState` (estado local), sincronizado a partir do store quando `automaton` muda; o store só recebe `moveState` em `onNodeDragStop` (1 entrada de undo por arrasto).

- [ ] **Step 1: Testes do `toFlow`.**
  - Com q0 –a→ q1 e q1 –b→ q0, as duas arestas têm `curved: true`; com uma só, `curved: false`.
  - Um laço tem `selfLoop: true`.
  - A posição do nó q0 do PDF é `{ x: state.x − 28, y: state.y − 28 }`.
  - Um id em `ctx.fired` → `firing: true`; um id em `ctx.conflicts` → `conflict: true`.
- [ ] **Step 2: Rodar** → FAIL. **Step 3: Implementar `toFlow.ts`.** **Step 4: Rodar** → PASS.
- [ ] **Step 5: `StateNode`.** Círculo de 56px com o rótulo. Anel duplo quando `isAccepting`; seta de entrada quando `isInitial`. Estilos: `selected` → anel primário, `pending` → anel tracejado, `active` → brilho âmbar, `died` → pisca vermelho uma vez (`motion`). Dois cliques no rótulo → `<input>` de renomear (Enter confirma, Esc cancela, erro mostrado via `toast` do sonner). Botão direito → `ContextMenu` do shadcn: "Marcar como inicial", "Alternar aceitação", "Renomear", "Excluir".
- [ ] **Step 6: `TransitionEdge`.** Calcula a geometria a partir de `sourceX/sourceY/targetX/targetY` e de `data`. Desenha `<path markerEnd="url(#arrow)">` e o rótulo com `formatSymbols` via `EdgeLabelRenderer`. `conflict` → traço laranja; clique no rótulo → seleciona; dois cliques no rótulo → edita os símbolos (`setTransitionSymbols`).
- [ ] **Step 7: `ArrowDefs`** — `<svg>` oculto com `<marker id="arrow">`. **`SymbolDialog`** — `Dialog` aberto quando `pendingTransition` existe, com `Input` (placeholder `a, b, eps`) e erro em linha vindo de `confirmTransition`.
- [ ] **Step 8: `AutomatonCanvas`.** Usa `ReactFlow` com `nodeTypes`/`edgeTypes`, `<Background variant="dots">`, `<Controls>` e `fitView`. `onPaneClick`: na ferramenta `add-state`, chama `addStateAt(screenToFlowPosition(...))`; nas outras, `select(null)`. Dois cliques no fundo também criam estado. `onNodeClick` → `clickState`. O cursor muda conforme a ferramenta. `App.tsx` passa a renderizar o canvas em tela cheia (com `ReactFlowProvider`).
- [ ] **Step 9: Verificar no navegador** (`npm run dev`):
  - Carregar `PDF_EXAMPLE` temporariamente no `App`. Aparecem 2 estados, q1 com anel duplo, seta em q0, laços acima e o par a/a curvado sem sobreposição.
  - Arrastar um estado leva as arestas junto.
  - Criar estado, transição (incluindo um laço), renomear e excluir funcionam.
  - `npm run build` passa.
- [ ] **Step 10: Commit.** `git add -A && git commit -m "feat: canvas interativo com estados e transições"`

---

### Task 9: Painel lateral (definição formal, tabela δ, JSON) e barra de status

**Files:**
- Create: `src/components/panels/SidePanel.tsx`, `FormalDefinition.tsx`, `TransitionTable.tsx`, `JsonPanel.tsx`, `src/components/toolbar/StatusIsland.tsx`, `src/lib/export/download.ts`
- Modify: `src/App.tsx` (layout: canvas à esquerda, painel de 380px à direita; abaixo de 768px o painel vira uma gaveta embaixo)

**Interfaces:**
- Consumes: `analyze`, `transitionTable`, `toProfessorJson`, `toExtendedJson`, `parseAutomatonJson`, `useEditor`.
- Produces: `downloadFile(name: string, content: string | Blob, mime: string): void`; `svgToPngBlob(svg: string, scale?: number): Promise<Blob>` (padrão 2; via `Image` + `canvas`).

- [ ] **Step 1: Instalar componentes.** Rodar o comando shadcn de cada página: Animate UI **Tabs** (animate-ui.com, seção Components → Tabs) e Cult UI **Dynamic Island** (cult-ui.com → Dynamic Island). Os arquivos caem em `src/components/ui/`.
- [ ] **Step 2: `SidePanel`.** Abas animadas "Definição", "Tabela δ", "JSON", "Simular" (a aba "Simular" mostra o placeholder "Em breve" até a Task 11).
- [ ] **Step 3: `FormalDefinition`.** Mostra `M = (Q, Σ, δ, q₀, F)` e, abaixo: `Q = {q0, q1}`, `Σ = {a, b}`, `q₀ = q0` (ou "—"), `F = {q1}`, e δ em lista (`δ(q0, a) = q1`; para AFN, `δ(q0, a) = {q0, q1}`). Use fonte serifada/itálica para os símbolos matemáticos. Embaixo, a lista de `warnings` com ícone de alerta. Os contadores |Q| e |Σ| usam o Magic UI **Number Ticker** (instalar pelo comando da página).
- [ ] **Step 4: `TransitionTable`.** `Table` do shadcn: a primeira coluna tem `→` no inicial e `*` nos de aceitação; uma célula vazia mostra `∅`; uma célula com mais de um destino ou na coluna ε fica com fundo laranja (é ela que torna o autômato AFN).
- [ ] **Step 5: `JsonPanel`.** Alternador entre "Formato do professor" e "Formato completo"; `<pre>` com o JSON indentado em 2; botões "Copiar" (com toast "JSON copiado") e "Baixar .json" (`automato.json`). Na seção "Importar", um `Textarea` + botão "Carregar" + upload de `.json`. Em caso de erro, `parseAutomatonJson` → mensagem em vermelho e **nenhuma** chamada a `loadAutomaton`.
- [ ] **Step 6: `StatusIsland`.** Fica no topo do canvas e mostra: `"AFD ✓"` (verde) / `"AFD incompleto"` / `"AFN · N conflitos"` (laranja) / `"Vazio — dê dois cliques para criar um estado"`. Durante uma simulação, mostra `"Passo k/n · lendo 'x'"`. A ilha expande ao passar o mouse e lista os avisos.
- [ ] **Step 7: Destaque de conflitos.** O `AutomatonCanvas` preenche `ctx.conflicts` com os `transitionIds` dos conflitos de `analyze`.
- [ ] **Step 8: Verificar no navegador.** Desenhar o exemplo do PDF à mão. A definição e a tabela mudam a cada edição; o JSON do professor é idêntico ao do PDF. Adicionar `q0 –a→ q0` faz a ilha mudar para "AFN · 1 conflito" e a aresta ficar laranja. Colar `{"q0":{"a":"q9"}}` mostra o erro e o desenho continua igual. `npm run build` passa.
- [ ] **Step 9: Commit.** `git add -A && git commit -m "feat: painel com definição formal, tabela δ, JSON e status"`

---

### Task 10: Paleta de ferramentas, exportações, exemplos, atalhos e compartilhamento

**Files:**
- Create: `src/components/toolbar/ToolDock.tsx`, `src/hooks/useKeyboardShortcuts.ts`, `src/hooks/useShareLink.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useEditor` (incluindo `useEditor.temporal`), `toSvg`, `svgToPngBlob`, `downloadFile`, `EXAMPLES`, `encodeShare`, `decodeShare`.
- Produces: `useShareLink(): { copyShareLink(): Promise<void> }` — ao montar, lê `location.hash` no formato `#a=<código>` e chama `loadAutomaton` se o código for válido.

- [ ] **Step 1: Instalar** o Aceternity **Floating Dock** (comando shadcn na página do componente).
- [ ] **Step 2: `ToolDock`** fixo embaixo, no centro, com estes itens, nesta ordem:
  - Ferramentas: Selecionar (V), Estado (S), Transição (T), Apagar (D). A ferramenta ativa fica destacada.
  - | Desfazer, Refazer
  - | Exemplos: menu com os 4 `EXAMPLES`; se houver estados, confirma com o `Dialog` "Substituir o autômato atual?".
  - | Exportar: SVG (`automato.svg`), PNG (`automato.png`) e JSON.
  - | Compartilhar: copia o link e mostra o toast "Link copiado".
  - | Limpar: com confirmação.
- [ ] **Step 3: `useKeyboardShortcuts`.** `V/S/T/D` trocam a ferramenta; `Delete`/`Backspace` → `deleteSelection`; `Ctrl/⌘+Z` → undo; `Ctrl/⌘+Shift+Z` → redo; `Esc` → cancela `pendingFrom`/diálogo e para a simulação. Os atalhos são ignorados quando o foco está num `input`/`textarea`.
- [ ] **Step 4: Verificar no navegador.**
  - Cada atalho funciona.
  - O SVG baixado abre no navegador igual ao canvas (estados, anel duplo, seta inicial, laço, rótulos).
  - O PNG não fica com fundo transparente.
  - Undo desfaz um arrasto inteiro de uma vez.
  - Abrir o link copiado numa aba anônima mostra o mesmo autômato.
  - `npm run build` passa.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: dock de ferramentas, exportações, exemplos, atalhos e link"`

---

### Task 11: Simulação animada

**Files:**
- Create: `src/components/panels/SimulationPanel.tsx`, `src/hooks/useSimulationPlayback.ts`
- Modify: `SidePanel.tsx` (troca o placeholder), `AutomatonCanvas.tsx` (preenche `active/died/fired/stepKey` a partir de `simulation`), `TransitionEdge.tsx` (token)

**Interfaces:**
- Consumes: `useEditor` (`startSimulation`, `stepTo`, `setPlaying`, `stopSimulation`, `simulation`), `SimStep`.
- Produces: `useSimulationPlayback()` — enquanto `playing`, avança 1 passo a cada 700 ms e chama `setPlaying(false)` no último.

- [ ] **Step 1: Instalar** os componentes Magic UI **Confetti**, **Shimmer Button** e **Border Beam** (comandos shadcn nas páginas). O Border Beam envolve o card da fita enquanto `playing`.
- [ ] **Step 2: `SimulationPanel`.**
  - Campo "Cadeia de entrada" + Shimmer Button "Simular".
  - Controles: ⏮ ◀ ▶/⏸ ▶ ⏭.
  - **Fita:** os caracteres em células, com os já lidos esmaecidos e o atual destacado; a cadeia vazia aparece como `ε`.
  - **Cópias ativas:** lista de badges com os estados de `steps[k].active`. O texto é "1 cópia" para AFD e "N cópias" para AFN, com as cópias que morreram neste passo riscadas.
  - **Resultado no último passo:** "Aceita ✓" (verde, dispara o Confetti uma vez) ou "Rejeitada ✗" (vermelho, com shake via `motion`: `x: [0,-8,8,-6,6,0]`).
  - Com `error 'no-initial'`, mostra "Defina um estado inicial antes de simular".
- [ ] **Step 3: Token na aresta.** Quando `firing`, o `TransitionEdge` renderiza `<circle r={6}>` com `<animateMotion dur="0.6s" fill="freeze" path={geometry.path} />`, com `key={stepKey}` para reiniciar a cada passo.
- [ ] **Step 4: Destaques.** O `StateNode` recebe `active`/`died` (já estilizados na Task 8). Durante a simulação, o canvas continua editável, e qualquer edição encerra a simulação (regra do store).
- [ ] **Step 5: Verificar no navegador.**
  - Exemplo do PDF com `abba`: 1 cópia por passo; o token percorre a aresta certa a cada passo; termina em "Rejeitada" com shake.
  - `contem-aba` com `babab`: as cópias se multiplicam, aparece "2 cópias" e o resultado é "Aceita" com confetti.
  - `as-ou-bs` com a cadeia vazia: o passo 0 já mostra 3 cópias e o resultado é "Aceita".
  - Editar durante o play para tudo e limpa os destaques.
  - `npm run build` e `npm test` passam.
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat: simulação animada passo a passo"`

---

### Task 12: Acabamento, README e deploy final

**Files:**
- Modify: `README.md`, `PLANO.md` (marcar o que foi feito e registrar o uso de IA), `index.html` (`<title>Editor de Autômatos</title>`, `lang="pt-BR"`)

- [ ] **Step 1: README.** O que é o projeto, link do deploy, como rodar (`npm install`, `npm run dev`, `npm test`), os formatos JSON com exemplos e os atalhos de teclado.
- [ ] **Step 2: Polimento (opcional).** (a) Item "Tema escuro" no `ToolDock`: alterna a classe `dark` no `<html>` (as variáveis do shadcn já trazem as cores) e salva a escolha em `localStorage` dentro de try/catch; o canvas e o `Background` acompanham. (b) React Bits **Click Spark** em volta do canvas, disparando só quando um estado é criado. Verificar os dois temas no navegador.
- [ ] **Step 2b: Registro de IA** em `PLANO.md`: o que foi gerado com o Claude Code e o que foi revisado à mão (o usuário completa).
- [ ] **Step 3: Verificação completa.** `npm test` → todos PASS; `npm run build` → sem erros nem avisos de tipo; `npm run preview` → o fluxo das Tasks 8–11 funciona no build de produção.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "docs: README e registro de uso de IA"`
- [ ] **Step 5: Publicar (precisa do usuário).** Com autorização: push da branch, merge em `main` (PR ou merge local + push). O Vercel publica a produção. Abrir a URL de produção e repetir o roteiro do Step 3 ao vivo, incluindo o link compartilhável.
