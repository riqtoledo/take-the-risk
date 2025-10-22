<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$sendJson = static function (int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
};

$abort = static function (int $status, string $message, array $context = []) use ($sendJson): void {
    $sendJson($status, [
        'message' => $message,
        'context' => $context,
    ]);
};

$startsWith = static function (string $haystack, string $needle): bool {
    if ($needle === '') {
        return true;
    }
    return strncmp($haystack, $needle, strlen($needle)) === 0;
};

$gatewayBase = getenv('PIX_GATEWAY_BASE_URL');
if ($gatewayBase === false || trim($gatewayBase) === '') {
    $abort(500, 'PIX_GATEWAY_BASE_URL nao configurado.');
}
$gatewayBase = rtrim(trim($gatewayBase), '/');

$apiKey = getenv('PIX_API_KEY');
if ($apiKey === false || trim($apiKey) === '') {
    $abort(500, 'PIX_API_KEY nao configurado.');
}
$apiKey = trim($apiKey);

$pathInfo = $_SERVER['PATH_INFO'] ?? '';

if ($pathInfo === '') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

    if ($scriptName !== '' && $startsWith($requestPath, $scriptName)) {
        $pathInfo = substr($requestPath, strlen($scriptName));
    } else {
        $dirName = rtrim(dirname($scriptName), '/\\');
        if ($dirName !== '' && $startsWith($requestPath, $dirName)) {
            $pathInfo = substr($requestPath, strlen($dirName));
        }
    }
}

$segments = array_values(array_filter(explode('/', trim((string) $pathInfo, '/'))));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$normalizeCharge = static function (array $charge) {
    $map = static fn (array $source, array $keys, $default = null) => array_reduce(
        $keys,
        static function ($carry, $key) use ($source) {
            if ($carry !== null) {
                return $carry;
            }
            if (isset($source[$key])) {
                return $source[$key];
            }
            return null;
        },
        $default
    );

    $pixData = $charge['pix'] ?? $charge['pixPayload'] ?? [];

    return [
        'paymentId' => (string) ($charge['paymentId'] ?? $charge['id'] ?? ''),
        'status' => strtoupper((string) ($charge['status'] ?? 'UNKNOWN')),
        'qrCodeBase64' => (string) $map($charge, ['qrCodeBase64', 'qr_code_base64'], $map($pixData, ['qrCodeBase64', 'qrCode', 'qrcode'])),
        'copyAndPaste' => (string) $map($charge, ['copyAndPaste', 'copy_paste'], $map($pixData, ['copyAndPaste', 'copyAndPasteText', 'copy_paste'])),
        'amount' => (int) ($charge['amount'] ?? 0),
        'createdAt' => $charge['createdAt'] ?? null,
        'expiresAt' => $charge['expiresAt'] ?? ($pixData['expiresAt'] ?? null),
    ];
};

$execute = static function (string $url, array $curlOptions, int $expectedSuccess = 299) use ($abort) {
    $handle = curl_init();
    curl_setopt_array($handle, $curlOptions + [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
    ]);

    $raw = curl_exec($handle);

    if ($raw === false) {
        $error = curl_error($handle);
        $errno = curl_errno($handle);
        curl_close($handle);
        $abort(502, 'Falha ao contactar o gateway PIX.', [
            'error' => $error,
            'code' => $errno,
        ]);
    }

    $status = curl_getinfo($handle, CURLINFO_RESPONSE_CODE) ?: 500;
    curl_close($handle);

    $decoded = null;
    if ($raw !== '') {
        $decoded = json_decode($raw, true);
    }

    if ($decoded === null || !is_array($decoded)) {
        $decoded = ['raw' => $raw];
    }

    if ($status > $expectedSuccess) {
        $abort($status, $decoded['message'] ?? 'Erro retornado pelo gateway PIX.', [
            'body' => $decoded,
        ]);
    }

    return $decoded;
};

if ($method === 'POST' && count($segments) === 1 && $segments[0] === 'charges') {
    $body = file_get_contents('php://input');
    if ($body === false || trim($body) === '') {
        $abort(400, 'Payload obrigatorio.');
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        $abort(400, 'JSON invalido.');
    }

    if (!isset($decoded['orderId']) || trim((string) $decoded['orderId']) === '') {
        $abort(422, 'orderId obrigatorio.');
    }

    if (!isset($decoded['amount']) || !is_numeric($decoded['amount']) || (float) $decoded['amount'] <= 0) {
        $abort(422, 'amount deve ser maior que zero.');
    }

    $payload = [
        'orderId' => (string) $decoded['orderId'],
        'amount' => $decoded['amount'],
        'description' => isset($decoded['description']) ? (string) $decoded['description'] : null,
        'payer' => isset($decoded['payer']) && is_array($decoded['payer']) ? $decoded['payer'] : null,
        'metadata' => isset($decoded['metadata']) && is_array($decoded['metadata']) ? $decoded['metadata'] : null,
    ];

    $payload = array_filter($payload, static fn ($value) => $value !== null);

    $response = $execute(
        $gatewayBase . '/payments/api/sales/pix',
        [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
        ]
    );

    $charge = $normalizeCharge($response);
    if ($charge['paymentId'] === '') {
        $abort(502, 'Resposta inesperada do gateway.', ['body' => $response]);
    }

    $sendJson(201, $charge);
}

if ($method === 'GET' && count($segments) === 2 && $segments[0] === 'charges') {
    $paymentId = trim($segments[1]);
    if ($paymentId === '') {
        $abort(400, 'paymentId obrigatorio.');
    }

    $response = $execute(
        $gatewayBase . '/payments/api/sales/pix/' . rawurlencode($paymentId),
        [
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
        ]
    );

    $charge = $normalizeCharge($response);
    if ($charge['paymentId'] === '') {
        $charge['paymentId'] = $paymentId;
    }

    $sendJson(200, $charge);
}

$abort(404, 'Rota nao encontrada.', ['path' => $segments, 'method' => $method]);
