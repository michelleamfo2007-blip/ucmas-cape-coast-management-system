<?php
require_once __DIR__ . '/../academic.php';
header('Content-Type: application/json');

$filters = [
  'teacher_id' => isset($_GET['teacher_id']) ? (int)$_GET['teacher_id'] : null,
  'class_id'   => isset($_GET['class_id']) ? (int)$_GET['class_id'] : null,
  'date'       => $_GET['date'] ?? null,
];
$rows = $academicManager->getResultsFiltered($filters);
echo json_encode(['data' => $rows]);
