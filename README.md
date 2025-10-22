# Take the Risk Store

## PIX integration

- **Frontend fallback**: the client-side code uses `import.meta.env.VITE_PIX_API_BASE_URL` when provided. Set this variable at build-time (for example, in `.env.production`) to point directly at your PIX provider, otherwise it falls back to the bundled PHP proxy.
- **PHP proxy**: `public/api/pix-proxy.php` (copied to `dist/api` on build) now accepts the `PIX_GATEWAY_BASE_URL` environment variable. Use it to override the default `https://api.droptify-hub.com:3029/api/pix` when your hosting environment requires a different endpoint (for example, to avoid blocked ports or to target a staging gateway).
- **Timeouts**: the proxy waits up to 10 seconds to establish the connection and up to 45 seconds for the full response, surfacing the underlying cURL error code in the JSON payload when a failure happens. This helps distinguish connectivity issues (e.g. firewall blocks) from gateway-side errors.

Set both variables to keep environments in sync and avoid the "Nao foi possivel contactar o gateway Pix" timeout error when the default gateway is unreachable from your hosting provider.

