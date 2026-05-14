<?php
require_once __DIR__ . '/../dashboard.php';
header('Content-Type: application/json');

$totals = $dashboardService->totals();
$recent = $dashboardService->recentExamResults(5);
echo json_encode(['totals' => $totals, 'recent_results' => $recent]);
