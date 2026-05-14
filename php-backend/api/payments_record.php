<?php
require_once __DIR__ . '/../payments.php';
header('Content-Type: application/json');

$payload = json_decode(file_get_contents('php://input'), true) ?? [];
$required = ['student_id','amount','payment_date','payment_type','payment_method'];
foreach ($required as $r) { if (!isset($payload[$r])) { http_response_code(400); echo json_encode(['error'=>"Missing $r"]); exit; } }
$data = [
  'student_id' => (int)$payload['student_id'],
  'amount' => (float)$payload['amount'],
  'payment_date' => $payload['payment_date'],
  'payment_type' => $payload['payment_type'],
  'payment_method' => $payload['payment_method'],
  'term_label' => $payload['term_label'] ?? null,
];
$res = $paymentManager->recordPayment($data);
echo json_encode($res);
