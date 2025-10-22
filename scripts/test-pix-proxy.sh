#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: ./scripts/test-pix-proxy.sh https://seu-dominio.com/checkout/api order-123"
  exit 1
fi

BASE_URL="$1"
ORDER_ID="$2"

echo "== Criando cobranca PIX =="
CREATE_RESPONSE=$(curl -sS -X POST "${BASE_URL}/pix/charges" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "orderId": "${ORDER_ID}",
  "amount": 1990,
  "description": "Pedido ${ORDER_ID}",
  "payer": {
    "name": "Cliente Teste",
    "document": "12345678901"
  }
}
JSON
)

echo "${CREATE_RESPONSE}"

PAYMENT_ID=$(echo "${CREATE_RESPONSE}" | jq -r '.paymentId')
if [[ -z "${PAYMENT_ID}" || "${PAYMENT_ID}" == "null" ]]; then
  echo "Falha ao extrair paymentId."
  exit 1
fi

echo
echo "== Consultando cobranca PIX (${PAYMENT_ID}) =="
curl -sS "${BASE_URL}/pix/charges/${PAYMENT_ID}" | jq
