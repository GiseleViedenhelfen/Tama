# Tama

Agente seguro de atendimento por mensagem (CLI mock) + API principal de pedidos — desafio técnico.

## Decisões e limitações

- **Canal:** CLI (`npm run chat`), não WhatsApp.
- **Dados:** PostgreSQL; pedidos seed `1001`–`1004`.
- **IA:** OpenAI (`gpt-4o-mini` por padrão) para classificação; regras e cancelamento validados na API.
- **Fake Store:** complemento de produto; não define status/cancelamento.
- **Autenticação do cliente:** não modelada (suposição: ID do pedido na mensagem).

Documentação: `docs/BUSINESS_RULES.md`, `docs/AGENT_INSTRUCTIONS.md`, `docs/TEST_CASES.md`, `docs/PLANO_INICIAL.md`.

## Configuração (`.env`)

Toda configuração sensível fica em **`.env`** (não versionado). Use `.env.example` como modelo:

```bash
cp .env.example .env
# Edite .env: POSTGRES_*, OPENAI_API_KEY, etc.
```

- **`.env`** — só `POSTGRES_*` (e demais chaves); **não** coloque `DATABASE_URL` no arquivo.
- **Docker Compose** — monta `DATABASE_URL` nos containers (`api`, `db-setup`) a partir de `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, etc.
- A app lê **`DATABASE_URL` do ambiente do processo** (definida pelo Compose em runtime).

Não é necessário `export` no shell se você roda comandos na raiz do projeto: `dotenv` carrega `.env` automaticamente.

## Pré-requisitos

- Node.js 20+
- Docker (opcional, recomendado para Postgres + API)
- `OPENAI_API_KEY` no `.env` para o CLI

## Docker (API + Postgres)

```bash
docker compose up --build
```

Compose usa o `.env` da raiz só para **substituir** `${...}` no YAML; cada serviço recebe **apenas** as variáveis listadas em `environment` (sem expor o arquivo inteiro no Git).

- API: http://localhost:3000  
- Swagger: http://localhost:3000/docs  
- Health: http://localhost:3000/health  

## Migração / seed (Compose)

Com Postgres no ar:

```bash
docker compose up -d postgres
npm run build
npm run migrate
```

(`db-setup` usa o mesmo `DATABASE_URL` montado no `docker-compose.yml`.)

## API no host (opcional)

Só se você exportar `DATABASE_URL` manualmente (ex.: `@localhost` para Postgres local):

```bash
npm run dev
```

## CLI (agente)

Com a API no ar:

```bash
npm run chat
```

(`MAIN_API_URL` e `OPENAI_API_KEY` no `.env`.)

**Groq:** chave `gsk_...`, `OPENAI_BASE_URL=https://api.groq.com/openai/v1`, e um **model id da sua conta** (ex.: `openai/gpt-oss-20b`). Liste os disponíveis: `curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`.

## Testes

**CI (GitHub Actions):** workflow [`tests.yml`](.github/workflows/tests.yml) em push/PR em `main` ou `master` — `npm run build`, testes unitários e integração com Postgres.

Configure no repositório:

1. **Settings → Environments → `test`** — *Environment protection rules* (ex.: só `main`/`master` ou revisores). O workflow não declara credenciais; o Postgres do job é efêmero (auth `trust`, só na rede do runner).
2. **Settings → Branches** — proteja `main`/`master` e exija o check **Tests** antes do merge.

**Unitários** (rápidos, sem Postgres):

```bash
npm test
```

**Integração** (API + Postgres real; suba o banco com `docker compose up -d postgres`, rode `npm run migrate`, e use `POSTGRES_*` no `.env` ou `DATABASE_URL` apontando para `localhost`):

```bash
npm run test:integration
```

Todos:

```bash
npm run test:all
```

## Endpoints principais

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/health` | Saúde |
| GET | `/orders/:orderId` | Consulta pedido |
| POST | `/orders/:orderId/cancellation` | Cancelamento (só `processing`) |

Códigos de resultado: `ORDER_FOUND`, `ORDER_NOT_FOUND`, `ORDER_NOT_CANCELLABLE`, `CANCELLATION_SUCCESS`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
