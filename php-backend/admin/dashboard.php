<?php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../dashboard.php';
check_auth(['Admin']);
$totals = $dashboardService->totals();
$recent = $dashboardService->recentExamResults(10);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UCMAS Admin Dashboard</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f3f4f6; margin:0; }
    header { background:#991b1b; color:#fff; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; }
    h1 { margin:0; font-size:18px; }
    .wrap { padding:20px; max-width:1100px; margin:0 auto; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .card { background:#fff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); padding:16px; }
    .kpi { font-size:28px; font-weight:700; color:#111827; }
    .label { font-size:13px; color:#6b7280; margin-top:6px; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:12px; text-align:left; border-bottom:1px solid #e5e7eb; }
    th { position:sticky; top:0; background:#fff; }
    a.btn { background:#dc2626; color:#fff; padding:8px 12px; border-radius:8px; text-decoration:none; font-weight:600; }
  </style>
</head>
<body>
  <header>
    <h1>UCMAS Admin Dashboard</h1>
    <nav>
      <a class="btn" href="../logout.php">Logout</a>
    </nav>
  </header>
  <div class="wrap">
    <div class="grid">
      <div class="card"><div class="kpi"><?= (int)$totals['students'] ?></div><div class="label">Total Students</div></div>
      <div class="card"><div class="kpi"><?= (int)$totals['teachers'] ?></div><div class="label">Total Teachers</div></div>
      <div class="card"><div class="kpi"><?= (int)$totals['teacher_attendance_today']['present'] ?></div><div class="label">Teachers Present Today</div></div>
      <div class="card"><div class="kpi"><?= (int)$totals['students_with_outstanding'] ?></div><div class="label">Students With Outstanding Fees</div></div>
    </div>

    <div class="card" style="margin-top:20px;">
      <h2 style="margin:0 0 12px; font-size:16px;">Recent Exam Results</h2>
      <div style="max-height:360px; overflow:auto;">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Date</th>
              <th>Total Score</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($recent as $row): ?>
              <tr>
                <td><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></td>
                <td><?= htmlspecialchars($row['class_name']) ?></td>
                <td><?= htmlspecialchars($row['assessment_date']) ?></td>
                <td><?= htmlspecialchars($row['total_score']) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
