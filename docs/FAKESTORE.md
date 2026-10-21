# Integração Fake Store API

A [Fake Store API](https://fakestoreapi.com) é uma **fonte externa complementar**. Ela **não** substitui a API principal de pedidos nem define status logístico ou cancelamento (regra 8 do desafio).

## Papel na solução

| Responsabilidade | API principal (Tama) | Fake Store |
|------------------|----------------------|------------|
| Status do pedido | Sim | Não |
| Cancelamento | Sim | Não |
| Nome, preço, categoria do produto | Só via `productId` no pedido | Sim (`GET /products/{id}`) |

Fluxo típico no agente:

1. Cliente pergunta sobre o item ou pedido com contexto de produto.
2. Orquestrador consulta `GET /orders/:id` na API principal.
3. Se o pedido tiver `productId`, o cliente HTTP chama `GET {FAKESTORE_BASE_URL}/products/{productId}`.
4. A resposta ao cliente combina **status oficial (API)** + **detalhe de catálogo (opcional)**.

Implementação: `src/fakestore/client.ts`, usado pelo `AgentOrchestrator` em `handleProductInfo`.

## Configuração

- Variável `FAKESTORE_BASE_URL` (padrão `https://fakestoreapi.com`).
- No Docker Compose, repassada ao serviço `api`; o CLI do agente lê a mesma variável ao rodar `npm run chat`.

## Tratamento de falhas

O cliente HTTP:

- Usa timeout (8s).
- Registra eventos `external.fakestore.fetch` / `external.fakestore.error` (nível debug — ver `docs/LOGS.md`).
- Retorna `null` em HTTP não-OK, corpo vazio, JSON inválido ou exceção de rede.

Quando `getProduct` retorna `null`, o agente **mantém** o status informado pela API principal e acrescenta a nota de catálogo indisponível (`productUnavailableNote()`).

## Limitações conhecidas

- API pública de demonstração, sem SLA.
- Escritas (POST/PUT/DELETE) na Fake Store são simuladas — não são usadas neste projeto.
- Preço e título são referência de catálogo, não valores contratuais do pedido do cliente.

## Testes

- Unitários com `fetch` mockado: `tests/unit/fakestore.client.test.ts`.
- Orquestrador com Fake Store indisponível: `tests/unit/orchestrator.test.ts` (TC06).

Comportamento do agente em relação à Fake Store: `docs/AGENT_INSTRUCTIONS.md` §4.
