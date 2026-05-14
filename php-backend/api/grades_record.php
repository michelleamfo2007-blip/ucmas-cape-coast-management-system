<?php
require_once __DIR__ . '/../academic.php';
header('Content-Type: application/json');

$payload = json_decode(file_get_contents('php://input'), true) ?? [];
$date = $payload['date'] ?? date('Y-m-d');
$grades = $payload['grades'] ?? [];
$ok = $academicManager->recordGrades($date, $grades);
echo json_encode(['status' => $ok ? 'ok' : 'error']);
