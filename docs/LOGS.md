# Logs estruturados (exemplos)

A API usa **pino** (JSON). Campos sensíveis não são logados (`authorization`, chaves).

## Requisição HTTP

```json
{
  "level": 30,
  "time": 1710000000000,
  "service": "tama-api",
  "req": { "method": "GET", "url": "/orders/1001" },
  "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "msg": "request completed",
  "res": { "statusCode": 200 },
  "responseTime": 12
}
```

## Consulta de pedido

```json
{
  "level": 30,
  "service": "tama-api",
  "event": "order.lookup.result",
  "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "orderId": "1001",
  "code": "ORDER_FOUND",
  "success": true,
  "msg": "order.lookup.result"
}
```

## Cancelamento

```json
{
  "level": 30,
  "service": "tama-api",
  "event": "order.cancellation.result",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "orderId": "1001",
  "code": "CANCELLATION_SUCCESS",
  "success": true,
  "msg": "order.cancellation.result"
}
```

## Fake Store

```json
{
  "level": 30,
  "service": "tama-api",
  "event": "external.fakestore.fetch",
  "productId": 1,
  "httpStatus": 200,
  "durationMs": 245,
  "ok": true,
  "msg": "external.fakestore.fetch"
}
```
