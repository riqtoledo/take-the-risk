# Ultrapayments PIX integration

This project integrates PIX through Ultrapayments (PayEvo) with a secure PHP proxy, webhook endpoint, and React flows that generate PIX charges, display QR codes, and poll status updates until payment confirmation.

---

## Architecture overview

- **Server proxy** (`public/api/pix.php`): hides the Ultrapayments bearer token. Exposes:
  - `POST /api/pix/charges` → forwards to `/payments/api/sales/pix`.
  - `GET /api/pix/charges/{paymentId}` → forwards to `/payments/api/sales/pix/{paymentId}`.
  The proxy validates input, handles timeouts (10 s connect / 45 s total), and normalises the response (`paymentId`, `status`, `qrCodeBase64`, `copyAndPaste`, `amount`, `createdAt`, `expiresAt`).
- **Webhook receiver** (`public/api/pix-webhook.php`): accepts Ultrapayments callbacks, optionally validates `X-Ultrapayments-Signature` via `PIX_WEBHOOK_SECRET`, and appends events to `public/api/logs/pix-webhook.log.jsonl`.
- **CLI helpers**:
  - `scripts/register-pix-webhook.php` registers your webhook URL.
  - `scripts/test-pix-proxy.sh` issues a test charge and fetches its status (requires `bash`, `curl`, `jq`).
- **Frontend (Vite + React + TypeScript)**:
  - `src/lib/pixApi.ts` provides typed calls to the proxy (`createPixCharge` / `getPixCharge`).
  - `src/hooks/usePixPayment.ts` wraps charge creation and 5 s polling with automatic stop on terminal states.
  - `src/features/checkout/PixCheckout.tsx` offers a reusable widget with amount mask, QR code, copy-and-paste, countdown, accessible labels, retry handling, and redirect to `/checkout/obrigado`.
  - The existing checkout flow (`CheckoutPage` → `PixConfirmationPage`) now uses the same proxy/polling logic and persists the session in `localStorage`.

> ⚠️ **Never expose `PIX_API_KEY` in the frontend.** All requests go through `api/pix.php`, keeping the Ultrapayments secret on the server.

---

## Environment variables

Configure these variables on the hosting environment (e.g. cPanel `.htaccess` inside `public_html/checkout`):

```
SetEnv PIX_GATEWAY_BASE_URL https://api-kosmos-sandbox.ultrapayments.com.br
SetEnv PIX_API_KEY sk_like_UOjSU4FXCvvlmZWyZ1KGSKlXedCLOO7ZfEBZcgUhdYlLB0nX
# Opcional: somente se Ultrapayments fornecer um segredo para assinar webhooks
# SetEnv PIX_WEBHOOK_SECRET seu-segredo-do-webhook
```

Switch the base URL to `https://api-kosmos.ultrapayments.com.br` in production.

### Frontend build

The SPA never stores the secret. Optionally override the proxy path (default `/api/pix`) in `.env.production`:

```
VITE_PIX_PROXY_URL=/checkout/api/pix
```

This ensures requests hit `https://seu-dominio.com/checkout/api/pix/...`.

---

## Proxy endpoints

### `POST /api/pix/charges`

```json
{
  "orderId": "PED-12345",
  "amount": 1990,
  "description": "Pedido PED-12345",
  "payer": {
    "name": "Cliente Teste",
    "document": "12345678901",
    "email": "cliente@exemplo.com",
    "phone": "11999999999"
  },
  "metadata": {
    "items": ["SKU-1", "SKU-2"]
  }
}
```

### `GET /api/pix/charges/{paymentId}`

Both endpoints return:

```json
{
  "paymentId": "uuid-ultrapayments",
  "status": "PENDING",
  "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "copyAndPaste": "00020126680014BR.GOV.BCB.PIX...",
  "amount": 1990,
  "createdAt": "2025-10-22T23:59:59Z",
  "expiresAt": "2025-10-23T00:19:59Z"
}
```

Errors bubble up with the gateway payload (HTTP status + message/context).

---

## Webhook workflow

1. Deploy `public/api/pix-webhook.php` (e.g. `https://seu-dominio.com/checkout/api/pix-webhook.php`).
2. Optional: set `PIX_WEBHOOK_SECRET` to validate `X-Ultrapayments-Signature` (HMAC-SHA256).
3. Events are appended to `public/api/logs/pix-webhook.log.jsonl` for later reconciliation. Rotate/persist as needed.
4. Register the webhook:

```bash
php scripts/register-pix-webhook.php https://seu-dominio.com/checkout/api/pix-webhook.php
```

Example success payload:

```
Webhook cadastrado com sucesso.
{
  "id": "uuid",
  "eventType": "PIX",
  "url": "https://seu-dominio.com/checkout/api/pix-webhook.php",
  "status": "ACTIVE"
}
```

---

## Frontend flows

- `<PixCheckout />` (route `/checkout/pix/manual`) lets you test arbitrary charges: enter order ID + amount, create the charge, view QR code / copy-and-paste string, monitor the countdown, and keep polling until `PAID`, `PAID_OUT`, `EXPIRED`, `CANCELLED`, or `REFUNDED`.
- `CheckoutPage` persists the generated charge in `localStorage`, forwards the shopper to `/checkout/pix`, and the confirmation page keeps polling every 5 s. On success it clears the cart and redirects to `/checkout/obrigado`.
- `usePixPayment` can be reused in dashboards or admin screens to monitor existing charges.

A11y: inputs/sections provide `aria-label`s, countdown uses `aria-live`, buttons have clear focus states, and QR code alt-text is provided.

---

## Deploying on cPanel

1. Upload the built `dist/` output to `public_html/checkout` (keep `api/` inside the same directory as `index.html`).
2. Ensure `public/api` is writable if you intend to keep webhook logs there (or adjust the path inside `pix-webhook.php`).
3. Add rewrite rules to map friendly URLs to the proxy script and disable directory listing, e.g.:
   ```apacheconf
   Options -Indexes

   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteRule ^api/pix/(.*)$ api/pix.php/$1 [L,QSA]
   </IfModule>

   php_flag display_errors Off
   ```
4. Set `PIX_GATEWAY_BASE_URL` and `PIX_API_KEY` via `.htaccess` (see above) or through cPanel’s environment configuration.
5. Test everything against the sandbox (`https://api-kosmos-sandbox.ultrapayments.com.br`) before switching to the production base URL.

**Security rationale:** browser bundles are public. Embedding `PIX_API_KEY` on the client would expose it through DevTools and allow malicious use. The PHP proxy ensures only trusted server code communicates with Ultrapayments.

---

## Manual end-to-end test (sandbox)

```bash
chmod +x scripts/test-pix-proxy.sh
./scripts/test-pix-proxy.sh https://seu-dominio.com/checkout/api PED-999
```

The script creates a PIX charge, prints the proxy response, extracts `paymentId`, and immediately queries its status. Confirm the data matches the Ultrapayments dashboard and that webhook logs are generated.

---

## Next steps

- Persist webhook events in your database and reconcile orders automatically.
- Add automated monitoring (cron or background worker) to re-query pending payments close to expiration.
- Harden the webhook endpoint (IP allowlist, HTTPS-only) and rotate the access token regularly.
