<?php
require_once __DIR__ . '/../payments.php';
header('Content-Type: application/json');

$term = isset($_GET['term_label']) ? $_GET['term_label'] : null;
$rows = $paymentManager->listDebtors($term);
echo json_encode(['data' => $rows]);
