<?php
require_once __DIR__ . '/../attendance.php';
header('Content-Type: application/json');

date_default_timezone_set('Africa/Accra');
$when = $_POST['when'] ?? date('Y-m-d H:i:s');
$ok = $attendanceManager->teacherCheckIn($when);
echo json_encode(['status' => $ok ? 'ok' : 'error']);
