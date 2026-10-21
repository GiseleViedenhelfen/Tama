# Plano inicial — Agente de atendimento (Desafio técnico)

Documento de planejamento **antes da implementação**. Consolida requisitos do desafio, decisões tomadas, arquitetura proposta e fases de trabalho.

**Projeto:** Tama  
**Canal de mensagens:** mock via CLI (sem WhatsApp ou mensageria real)

---

## 1. Contexto e objetivo

Automatizar parte do atendimento por **mensagens de texto** com um agente que:

- Responde dúvidas sobre **pedidos**
- Ajuda a **solicitar cancelamento** quando as regras permitirem
- Usa uma **API principal** (Node.js, TypeScript, Express) como fonte da verdade
- Integra a **Fake Store API** apenas como complemento (catálogo/produto)
- Usa **pelo menos um modelo de IA** no fluxo (OpenAI)
- Protege dados do cliente e **não afirma sucesso** sem confirmação da API
- Opera com **guardrails explícitos** (código + prompt), **personalidade definida** e **recusa clara** a perguntas fora do escopo — não é um chat genérico “sem limites”

Referência do desafio: *Construção de um agente seguro de atendimento por mensagem de texto*.

---

## 2. Decisões fechadas

| Tópico | Decisão |
|--------|---------|
| Mensageria | **CLI** (`npm run chat`) — REPL no terminal |
| WhatsApp / plataforma real | **Fora de escopo**; mock conforme enunciado |
| Persistência | **PostgreSQL** em container Docker |
| Modelo de IA | **OpenAI** (`OPENAI_API_KEY`, modelo padrão sugerido: `gpt-4o-mini`) |
| API principal | Node.js + TypeScript + Express |
| Documentação HTTP | OpenAPI/Swagger + Swagger UI |
| Logs | Estruturados (JSON), sem PII/credenciais |
| Postura do agente | **Guardrails first**: escopo rígido, personalidade só dentro do escopo, recusas determinísticas |
| Histórico Git | **Commits granulares e com escopo** — um assunto por commit; ver §16 |

---

## 3. Arquitetura

```mermaid
flowchart LR
  subgraph channel [Canal mock]
    CLI[CLI readline]
  end
  subgraph app [Aplicação]
    Agent[Orquestrador do agente]
    LLM[OpenAI]
    Agent --> LLM
    Agent --> MainClient[Cliente API principal]
    Agent --> FakeStore[Cliente Fake Store]
  end
  subgraph infra [Infra local]
    API[Express API]
    PG[(PostgreSQL)]
    API --> PG
  end
  CLI --> Agent
  MainClient --> API
  FakeStore --> FSA[(fakestoreapi.com)]
```

**Princípio:** o LLM interpreta linguagem natural e redige respostas **dentro de limites fixos**; **regras de negócio, escopo, recusas e mudança de estado** ficam no **orquestrador** e na **API principal** — o modelo **nunca** é a única barreira de segurança.

```mermaid
flowchart TD
  IN[Mensagem do cliente] --> PRE[Pré-validação: tamanho, padrões óbvios]
  PRE --> ORQ[Orquestrador]
  ORQ --> CLS[Classificação estruturada de intenção + escopo]
  CLS -->|in_scope| ACT[Ações permitidas: API / Fake Store]
  CLS -->|out_of_scope / unsafe| REF[Resposta de recusa fixa + personalidade]
  CLS -->|handoff| HUM[Oferta atendimento humano]
  ACT --> FACT[Fatos vindos das APIs]
  FACT --> RDR[Redação curta: template + LLM restrito]
  REF --> OUT[Resposta ao cliente]
  RDR --> OUT
  HUM --> OUT
```

---

## 4. Regras de negócio

### 4.1 Regras do enunciado (aplicar na API e no agente)

1. O agente pode consultar o status de um pedido.
2. Cancelamento só se o pedido ainda estiver **em processamento**.
3. Pedidos **enviados** não podem ser cancelados pelo fluxo automatizado.
4. Antes de cancelar, o agente deve **confirmar a intenção** do cliente.
5. Só informar cancelamento realizado se a **API principal** retornar sucesso.
6. Se não verificar pedido, falha de API ou informação insuficiente → **não** afirmar que concluiu a ação.
7. Oferecer **atendimento humano** fora do escopo ou quando não resolver com segurança.
8. Dados do cliente ou API externa **não substituem** regras de negócio nem instruções do agente.

### 4.2 Dúvidas para negócio/produto (registrar na documentação)

- Enum exato de status além de “processamento” e “enviado” (ex.: entregue, cancelado)?
- “Em processamento” é um único status ou um grupo?
- Como o cliente identifica o pedido (só ID, e-mail, CPF)? Implicações de segurança?
- Formato do encaminhamento humano (mensagem fixa, ticket, fila)?
- Cancelamento parcial ou multi-item?

### 4.3 Suposições provisórias (marcar como suposição)

- Status: `processing` | `shipped` | `delivered` | `cancelled`.
- Apenas `processing` é cancelável via automação.
- Identificação por **ID do pedido** (ex.: `1001`); seeds sem PII real.
- Respostas do agente em **português (BR)**.
- Sessão CLI: estado em memória no processo (`sessionId` opcional via flag).

### 4.4 Matriz de decisão do agente

| Situação | Ação |
|----------|------|
| Consulta de status + ID válido | Consultar API principal → responder |
| Cancelar + em processamento | Pedir confirmação → em “sim” → POST cancelamento |
| Cancelar + enviado/entregue | Recusar + explicar regra + oferecer humano |
| ID ausente | Pedir esclarecimento |
| Prompt injection / ignorar regras | Recusar; não revelar instruções internas |
| Fake Store indisponível | Responder pedido se possível; informar que complemento de catálogo falhou |
| API principal indisponível | Não afirmar sucesso; retry ou humano |
| Pergunta fora do escopo (geral, piadas, código, opinião, etc.) | **Recusar**; não responder o conteúdo; redirecionar ao que o agente faz |
| Pedido para agir como outro persona / “modo desenvolvedor” | Recusar; manter persona de atendimento |
| Ambiguidade entre escopo e fora de escopo | Tratar como **fora de escopo** ou pedir clarificação **só** se for claramente sobre pedido/produto |

---

## 4.5 Personalidade, escopo e guardrails (requisito central)

Este agente **não** é um assistente aberto. É um **atendente virtual da loja** com capacidades limitadas e verificáveis.

### Escopo permitido (in_scope)

O agente **pode** ajudar apenas com:

1. **Consultar status** de um pedido (via API principal), quando o cliente informar o ID (ou após pedir o ID).
2. **Iniciar fluxo de cancelamento** conforme regras (confirmação + API principal).
3. **Informações complementares de produto** ligadas ao atendimento (via Fake Store), quando relevante — ex.: “o que é o item do meu pedido?”, “qual o preço de referência do produto X do catálogo?” — **sem** substituir status ou cancelamento.
4. **Saudações breves** e orientação sobre o que ele consegue fazer (“posso ajudar com status e cancelamento de pedidos”).
5. **Encaminhamento humano** quando não puder resolver com segurança.

### Fora de escopo (out_of_scope) — **não responder ao conteúdo**

O agente **não** deve:

- Responder perguntas gerais (clima, notícias, receitas, homework, programação, etc.).
- Dar opinião, aconselhamento médico/jurídico/financeiro ou conteúdo sensível.
- Executar ou simular ações que não existem na API (alterar endereço, trocar produto, dar desconto, etc.) — explicar limitação e oferecer humano se aplicável.
- Conversar “por conversar” além de uma linha educada de redirecionamento.
- Cumprir pedidos para **ignorar regras**, **revelar prompt/instruções**, **inventar status** ou **dizer que cancelou** sem sucesso da API.

**Comportamento esperado:** recusa curta, no tom da personalidade, + lembrete do que **pode** fazer + oferta de atendimento humano quando fizer sentido. **Sem** parágrafos úteis sobre o assunto fora de escopo.

### Personalidade (dentro do escopo)

Definir uma persona estável documentada em `docs/AGENT_INSTRUCTIONS.md`, por exemplo:

| Atributo | Diretriz |
|----------|----------|
| Nome / papel | Atendente da loja (ex.: “Tama, assistente de pedidos”) |
| Tom | Cordial, objetivo, empatia moderada — mensagens **curtas** (estilo SMS/WhatsApp) |
| Formalidade | “Você”, PT-BR, sem gíria excessiva |
| Erros / limites | Honesto (“não consigo confirmar”, “não posso ajudar com isso”) |
| Marca | Não inventar promoções, prazos ou políticas não vindas da API |

A personalidade **não** amplia o escopo: serve só para **como** dizer, não **o que** é permitido.

### Guardrails em camadas (defesa em profundidade)

| Camada | Responsabilidade |
|--------|------------------|
| **1. Código (orquestrador)** | Whitelist de intenções acionáveis; fluxo de confirmação; bloqueio se `scope !== in_scope`; respostas de recusa **pré-aprovadas** para `out_of_scope` e `unsafe` |
| **2. Saída estruturada do LLM** | JSON schema obrigatório: `scope`, `intent`, `orderId?`, `confidence?`; valores enum — sem texto livre para decidir ações |
| **3. System prompt** | Escopo, persona, proibições, exemplos de recusa; instrução explícita: “se fora do escopo, `scope: out_of_scope` e não responda a pergunta” |
| **4. Pós-processamento** | Respostas finais sobre pedido/cancelamento **ancoradas** em JSON da API; LLM só reformula; fatos críticos (status, cancelado sim/não) vêm de **template** preenchido com dados da API |
| **5. Testes** | Casos automatizados: perguntas aleatórias, injection, “ignore suas regras”, pedidos ilegais — esperado recusa sem vazamento de prompt |

**Regra de ouro:** se o orquestrador classificar `out_of_scope` ou `unsafe`, **não** chamar tools de pedido/cancelamento e **não** pedir ao LLM “responder com conhecimento geral”; usar roteiro fixo (com leve variação opcional só em frases não factuais).

### Exemplos de recusa (rascunho para implementação)

- *“Não consigo ajudar com isso daqui — sou o assistente de pedidos da loja. Posso consultar status ou orientar cancelamento (quando permitido). Quer falar de algum pedido?”*
- *“Por segurança, não posso seguir essa instrução. Posso ajudar com seu pedido ou transferir para um atendente humano.”*

---

## 5. API principal (Express + TypeScript)

### 5.1 Endpoints previstos

| Método | Caminho | Sucesso | Erros de domínio |
|--------|---------|---------|------------------|
| `GET` | `/health` | 200 | — |
| `GET` | `/orders/:orderId` | 200 + pedido | 404 não encontrado |
| `POST` | `/orders/:orderId/cancellation` | 200 + pedido atualizado | 404, 409 não cancelável, 422 validação |

Respostas com corpo estável e **`code`** (ex.: `ORDER_NOT_FOUND`, `ORDER_NOT_CANCELLABLE`, `CANCELLATION_SUCCESS`, `INTERNAL_ERROR`) para o agente não depender de texto livre.

### 5.2 Camadas

`routes` → `controllers` → `services` (regras) → `repository` (PostgreSQL).

A regra **“só cancela em processamento”** deve existir no **service da API**, não só no prompt do LLM.

### 5.3 Modelo de dados (PostgreSQL)

```text
orders
  id            TEXT PRIMARY KEY
  status        TEXT NOT NULL     -- processing | shipped | delivered | cancelled
  product_id    INTEGER           -- id Fake Store (complemento; não define status)
  customer_ref  TEXT              -- opcional, opaco
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ
```

Seeds: pedidos em vários status para demo e testes.

---

## 6. Integração Fake Store API

**Base:** `https://fakestoreapi.com`  
**Papel:** complementar atendimento (nome, preço, descrição, categoria do produto).

### Endpoints úteis

- `GET /products/{id}` — detalhe do produto
- `GET /products?limit=&sort=` — listagem
- `GET /products/categories`
- `GET /products/category/{category}`

**Não usar** Fake Store para status de pedido ou cancelamento.

### Comportamentos a tratar no cliente HTTP

- Escritas (POST/PUT/PATCH/DELETE) são **fabricadas** e não persistem — evitar dependência delas.
- `GET /products/{id}` inválido pode retornar **HTTP 200 com corpo vazio** — tratar como “não encontrado”, não confiar só no status code.
- Timeout, indisponibilidade e JSON inesperado → log + degradação graciosa na resposta do agente.

### Uso sugerido no agente

Pedidos seed incluem `product_id` → após consultar pedido na API principal, opcionalmente enriquecer com `GET /products/{product_id}` quando o cliente perguntar sobre o item.

Documentação detalhada da integração: arquivo dedicado na implementação (ex.: `docs/FAKE_STORE.md`).

---

## 7. Agente e OpenAI

### 7.1 Papel do modelo

**Faz:**

- Classificar **`scope`** (`in_scope` | `out_of_scope` | `unsafe`) e **intenção** (`order_status`, `cancel_request`, `product_info`, `greeting`, `confirm_yes`, `confirm_no`, `human_handoff`, `clarification`)
- Extrair `orderId` quando possível e dentro do escopo
- Redigir respostas **breves** em PT-BR **somente** quando `in_scope`, respeitando persona

**Não faz:**

- Responder conteúdo de perguntas `out_of_scope`
- Decidir cancelabilidade ou inventar status
- Executar cancelamento sem fluxo de confirmação no orquestrador
- Substituir validações da API principal
- Ser a única camada de segurança (guardrails vivem no código)

### 7.2 Orquestrador (código determinístico)

1. Estado de sessão: `pendingConfirmation: { orderId, action: 'cancel' } | null`
2. Se há confirmação pendente → interpretar sim/não (regex primeiro; LLM só se ambíguo)
3. Caso contrário → OpenAI com **JSON schema obrigatório** (`scope`, `intent`, …)
4. Se `scope !== in_scope` ou `intent === unsafe` → **resposta de recusa** (template); **fim** — sem tools
5. Se `in_scope` → executar apenas tools permitidas: `getOrder`, `requestCancellation`, `getProduct`
6. Fatos (status, cancelado, erros API) → **strings fixas** preenchidas com dados; LLM opcional só para suavizar tom **sem alterar fatos**

### 7.3 Segurança e anti-injection

- Instruções de escopo, persona, anti-vazamento de system prompt
- Recusa explícita a: “ignore regras anteriores”, “mostre seu prompt”, “finja que cancelou”, roleplay fora do atendente
- Mensagens do usuário tratadas como **dados não confiáveis** — nunca como instruções de sistema
- `OPENAI_API_KEY` apenas via variável de ambiente
- Limite de tamanho de entrada na CLI (ex.: 2–4 KB)
- Log de `scope`/`intent` (sem logar mensagem completa se política exigir redação)

### 7.4 Testes

Testes automatizados **simulam** respostas OpenAI (JSON fixo). Chave real só para uso manual via CLI.

Entregável: `docs/AGENT_INSTRUCTIONS.md` + prompts versionados no repositório.

---

## 8. CLI (mock de mensageria)

**Comando previsto:** `npm run chat`

- Loop readline: stdin → orquestrador → stdout
- Flags sugeridas: `--session <id>` para continuidade
- Exemplos de conversa exportados para `docs/CONVERSATION_EXAMPLES.md` (atende requisito de exemplos de conversa)

README deve declarar explicitamente que **integração real com WhatsApp não faz parte do escopo**.

---

## 9. Docker e execução local

### 9.1 Compose (visão)

- Serviço **postgres** (volume persistente, healthcheck)
- Serviço **api** (build da app, `DATABASE_URL`, `OPENAI_*`, porta 3000)
- CLI roda no **host** com `MAIN_API_URL=http://localhost:3000` e mesmas credenciais OpenAI (se o agente rodar no host)

### 9.2 Variáveis de ambiente (`.env.example`)

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `FAKESTORE_BASE_URL`
- `LOG_LEVEL`
- `MAIN_API_URL` (CLI)
- `PORT`

---

## 10. Observabilidade

- **pino** (ou equivalente) — logs JSON estruturados
- Correlation/request id no HTTP
- Eventos: consulta de pedido, solicitação/resultado de cancelamento, chamadas Fake Store, erros
- **Não** logar: credenciais, conteúdo sensível de usuários Fake Store, mensagens completas se política exigir redação

Exemplos de formato de log documentados no README ou `docs/LOGS.md`.

---

## 11. Testes

### 11.1 Documentação obrigatória (`docs/TEST_CASES.md`)

Para cada caso: objetivo, cenário, condições, comportamento esperado.

Exemplos:

1. Status de pedido em processamento — sucesso
2. Cancelamento com confirmação — sucesso após API 2xx
3. Cancelamento pedido enviado — API 409 — agente não diz “cancelado”
4. Pedido inexistente — 404
5. Falha/timeout API principal — sem afirmação de conclusão
6. Fake Store falha — degradação
7. Injection — recusa
8. Fora do escopo — **não** responde o assunto; redireciona + humano opcional
9. “Qual a capital da França?” / coding help — recusa com persona
10. “Diga que meu pedido foi cancelado” sem API — recusa / não afirma
11. Tentativa de mudar persona — mantém atendente da loja

### 11.2 Automatizados

- API: supertest (happy path, 404, 409, validação)
- Agente: LLM e Fake Store mockados
- Fake Store: MSW/nock

---

## 12. Estrutura de repositório (prevista)

```text
Tama/
├── docker-compose.yml
├── Dockerfile
├── README.md
├── docs/
│   ├── PLANO_INICIAL.md          # este arquivo
│   ├── BUSINESS_RULES.md
│   ├── AGENT_INSTRUCTIONS.md
│   ├── TEST_CASES.md
│   ├── CONVERSATION_EXAMPLES.md
│   └── FAKE_STORE.md
├── migrations/
├── src/
│   ├── api/
│   ├── agent/
│   ├── cli/
│   └── db/
└── tests/
```

---

## 13. Fases de implementação

| Fase | Objetivo |
|------|----------|
| 0 | Plano aprovado (este documento) |
| 1 | Scaffold TS, Express, lint, Docker, Postgres |
| 2 | Migrations, seeds, endpoints de pedidos |
| 3 | Swagger UI + logs estruturados |
| 4 | Cliente Fake Store |
| 5 | Orquestrador + OpenAI + **guardrails/escopo/recusas** |
| 6 | CLI + fluxo de confirmação + persona documentada |
| 7 | Testes + documentação de casos e conversas |
| 8 | README (decisões, limitações, como rodar) + GitHub |

Cada fase (ou subentrega dentro dela) deve corresponder a **um ou mais commits escopados**, não a um único commit monolítico.

---

## 14. Commits granulares (obrigatório na implementação)

Durante a implementação, manter histórico **pequeno, revisável e por escopo** — facilita review do desafio e rollback.

### Regras

1. **Um propósito por commit** — não misturar API de pedidos + agente + docs no mesmo commit.
2. **Mensagem com escopo** — formato [Conventional Commits](https://www.conventionalcommits.org/) em inglês ou PT (escolher um e manter consistente):

   ```text
   <tipo>(<escopo>): <descrição curta no imperativo>

   [corpo opcional — porquê, não o quê]
   ```

   **Tipos:** `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `build`  
   **Escopos sugeridos:** `api`, `db`, `agent`, `cli`, `fakestore`, `docker`, `docs`, `openapi`, `logs`

3. **Commit compilável quando possível** — preferir sequência: infra → domínio → integração → agente → testes.
4. **Docs no commit relacionado** — ex.: `docs(agent): add guardrails and persona` junto ou logo após o código do agente, não espalhar doc genérica em todo commit de feat.
5. **Não commitar** `.env`, segredos, `node_modules`, artefatos de build desnecessários.
6. **Commits só quando solicitado** pelo fluxo de trabalho; durante o desafio, pedir confirmação ou seguir instrução explícita de commitar por etapa.

### Mapa fase → commits sugeridos (exemplo)

| Ordem | Commit (exemplo) |
|-------|------------------|
| 1 | `chore: init typescript, eslint and project layout` |
| 2 | `build(docker): add compose with postgres and api service` |
| 3 | `feat(db): add migrations and order repository` |
| 4 | `feat(db): seed sample orders` |
| 5 | `feat(api): implement order lookup and cancellation routes` |
| 6 | `feat(api): enforce cancellation business rules in service layer` |
| 7 | `feat(openapi): document endpoints and serve swagger ui` |
| 8 | `feat(logs): add structured request and domain event logging` |
| 9 | `feat(fakestore): add product client with error handling` |
| 10 | `feat(agent): add orchestrator and scope classification` |
| 11 | `feat(agent): add openai adapter with structured output` |
| 12 | `feat(agent): add out-of-scope refusal templates and guardrails` |
| 13 | `feat(cli): add chat repl and session state` |
| 14 | `docs: add business rules, agent instructions and test cases` |
| 15 | `test(api): add order and cancellation integration tests` |
| 16 | `test(agent): add scoped guardrail and flow tests with mocks` |
| 17 | `docs: add readme with run instructions and architecture notes` |

Ajustar granularidade (mais commits se uma feat for grande); **nunca** juntar `feat(api)` e `feat(agent)` no mesmo commit.

### Anti-padrões

- `feat: implement challenge` (grande demais)
- Múltiplos escopos: `feat(api,agent,cli): ...`
- WIP sem valor no histórico final (squash só se o usuário pedir)

---

## 15. Checklist de entregáveis (enunciado)

- [x] Código-fonte
- [ ] Repositório GitHub (+ permissões se privado) — publicar e linkar no README
- [x] Instruções locais + Docker — `README.md`
- [x] OpenAPI/Swagger da API principal — `/docs`
- [x] Documentação de regras (dúvidas + suposições + conduta) — `docs/BUSINESS_RULES.md`
- [x] Instruções do agente + modelo OpenAI identificado — `docs/AGENT_INSTRUCTIONS.md`
- [x] Integração Fake Store explicada — `docs/FAKESTORE.md`
- [x] Documentação de casos de teste — `docs/TEST_CASES.md`
- [x] Testes automatizados e/ou exemplos de conversa — `tests/`, `docs/CONVERSATION_EXAMPLES.md`
- [x] Decisões e limitações — `README.md`
- [x] Exemplos de logs estruturados — `docs/LOGS.md`

---

## 16. Limitações conhecidas (previstas)

- Canal simulado (CLI), não produção de mensageria
- OpenAI depende de chave externa e conectividade
- Fake Store é mock de terceiros, sem SLA
- Autenticação de cliente no canal não modelada no MVP (apenas ID de pedido)

---

*Última atualização do plano: CLI, Postgres em container, OpenAI, guardrails/persona/escopo e **commits granulares por escopo (§14)** — antes do `init` do código.*
