<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Metodo nao permitido.']);
    exit;
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false) {
    http_response_code(400);
    echo json_encode(['message' => 'Corpo da requisicao ausente.']);
    exit;
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['message' => 'JSON invalido.']);
    exit;
}

$webhookSecret = getenv('PIX_WEBHOOK_SECRET');
$signatureHeader = $_SERVER['HTTP_X_ULTRAPAYMENTS_SIGNATURE'] ?? $_SERVER['HTTP_X_SIGNATURE'] ?? null;

if ($webhookSecret !== false && $webhookSecret !== null && $webhookSecret !== '') {
    if ($signatureHeader === null) {
        http_response_code(401);
        echo json_encode(['message' => 'Assinatura ausente.']);
        exit;
    }

    $calculatedSignature = hash_hmac('sha256', $rawBody, $webhookSecret);
    if (!hash_equals($calculatedSignature, trim($signatureHeader))) {
        http_response_code(401);
        echo json_encode(['message' => 'Assinatura invalida.']);
        exit;
    }
}

$logDirectory = __DIR__ . '/logs';
if (!is_dir($logDirectory)) {
    mkdir($logDirectory, 0755, true);
}

$logEntry = [
    'receivedAt' => gmdate('c'),
    'headers' => [
        'signature' => $signatureHeader,
    ],
    'payload' => $payload,
];

$logFile = $logDirectory . '/pix-webhook.log.jsonl';
file_put_contents($logFile, json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);

http_response_code(200);
echo json_encode(['message' => 'Webhook recebido.']);
