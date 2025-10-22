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

$remoteBase = 'https://api.droptify-hub.com:3029/api/pix/transactions';

$sendError = function (int $status, string $message, array $context = []): void {
    http_response_code($status);
    echo json_encode([
        'message' => $message,
        'context' => $context,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
};

$executeRequest = function (array $curlOptions) use ($sendError) {
    $handle = curl_init();
    curl_setopt_array($handle, $curlOptions + [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);

    $rawResponse = curl_exec($handle);

    if ($rawResponse === false) {
        $error = curl_error($handle);
        curl_close($handle);
        $sendError(502, 'Nao foi possivel contactar o gateway Pix.', ['error' => $error]);
    }

    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE) ?: 500;
    curl_close($handle);

    http_response_code($status);
    echo $rawResponse;
    exit;
};

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === false || $body === '') {
        $sendError(400, 'Payload do cartao ausente.');
    }

    $executeRequest([
        CURLOPT_URL => $remoteBase,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
}

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if ($id === null || $id === '') {
        $sendError(400, 'Informe o identificador da transacao Pix.');
    }

    $executeRequest([
        CURLOPT_URL => $remoteBase . '/' . rawurlencode($id),
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
        ],
    ]);
}

$sendError(405, 'Metodo nao permitido.');
