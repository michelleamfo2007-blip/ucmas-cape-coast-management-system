<?php
require_once __DIR__ . '/../auth.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Use POST']);
  exit;
}

// Accept form-data or JSON
$username = $_POST['username'] ?? null;
$password = $_POST['password'] ?? null;
if ($username === null || $password === null) {
  $payload = json_decode(file_get_contents('php://input'), true) ?? [];
  $username = $payload['username'] ?? null;
  $password = $payload['password'] ?? null;
}

if (!$username || !$password) {
  http_response_code(400);
  echo json_encode(['error' => 'Missing username or password']);
  exit;
}

$ok = login($username, $password);
if ($ok) {
  echo json_encode(['ok' => true, 'role' => $_SESSION['role'] ?? null, 'user_id' => $_SESSION['user_id'] ?? null]);
} else {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Invalid credentials']);
}
