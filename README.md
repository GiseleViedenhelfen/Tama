# Tama

Agente seguro de atendimento por mensagem (CLI mock) + API principal de pedidos — desafio técnico.

## Decisões e limitações

- **Canal:** CLI (`npm run chat`), não WhatsApp.
- **Dados:** PostgreSQL; pedidos seed `1001`–`1004`.
- **IA:** OpenAI (`gpt-4o-mini` por padrão) para classificação; regras e cancelamento validados na API.
- **Fake Store:** complemento de produto; não define status/cancelamento.
- **Autenticação do cliente:** não modelada (suposição: ID do pedido na mensagem).

Documentação: `docs/BUSINESS_RULES.md`, `docs/AGENT_INSTRUCTIONS.md`, `docs/TEST_CASES.md`, `docs/PLANO_INICIAL.md`.

## Pré-requisitos

- Node.js 20+
- Docker (opcional, recomendado para Postgres + API)
- `OPENAI_API_KEY` para o CLI

## Docker (API + Postgres)

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:3000  
- Swagger: http://localhost:3000/docs  
- Health: http://localhost:3000/health  

## Desenvolvimento local

```bash
npm ci
docker compose up -d postgres
Use `.env` POSTGRES_* (see README).
npm run migrate
npm run seed
npm run dev
```

## CLI (agente)

Com a API no ar:

```bash
export MAIN_API_URL=http://localhost:3000
export OPENAI_API_KEY=sk-...
npm run chat
```

## Testes

```bash
npm test
```

## Endpoints principais

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/health` | Saúde |
| GET | `/orders/:orderId` | Consulta pedido |
| POST | `/orders/:orderId/cancellation` | Cancelamento (só `processing`) |

Códigos de resultado: `ORDER_FOUND`, `ORDER_NOT_FOUND`, `ORDER_NOT_CANCELLABLE`, `CANCELLATION_SUCCESS`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
