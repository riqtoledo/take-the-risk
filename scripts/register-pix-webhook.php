<?php
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "Este script deve ser executado via CLI.\n");
    exit(1);
}

if ($argc < 2) {
    fwrite(STDERR, "Uso: php scripts/register-pix-webhook.php https://seu-dominio.com/checkout/api/pix-webhook.php\n");
    exit(1);
}

$webhookUrl = trim($argv[1]);
if ($webhookUrl === '') {
    fwrite(STDERR, "URL do webhook obrigatoria.\n");
    exit(1);
}

$gatewayBase = getenv('PIX_GATEWAY_BASE_URL');
if ($gatewayBase === false || trim($gatewayBase) === '') {
    fwrite(STDERR, "Erro: defina PIX_GATEWAY_BASE_URL no ambiente.\n");
    exit(1);
}
$gatewayBase = rtrim(trim($gatewayBase), '/');

$apiKey = getenv('PIX_API_KEY');
if ($apiKey === false || trim($apiKey) === '') {
    fwrite(STDERR, "Erro: defina PIX_API_KEY no ambiente.\n");
    exit(1);
}
$apiKey = trim($apiKey);

$payload = [
    'eventType' => 'PIX',
    'url' => $webhookUrl,
];

$handle = curl_init();
curl_setopt_array($handle, [
    CURLOPT_URL => $gatewayBase . '/app/api/notifications/webhooks',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$raw = curl_exec($handle);
if ($raw === false) {
    fwrite(STDERR, "Erro cURL: " . curl_error($handle) . PHP_EOL);
    exit(1);
}

$status = curl_getinfo($handle, CURLINFO_RESPONSE_CODE) ?: 0;
curl_close($handle);

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    $decoded = ['raw' => $raw];
}

if ($status >= 200 && $status < 300) {
    fwrite(STDOUT, "Webhook cadastrado com sucesso.\n");
    fwrite(STDOUT, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit(0);
}

fwrite(STDERR, "Falha ao cadastrar webhook (HTTP {$status}).\n");
fwrite(STDERR, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
exit(1);
