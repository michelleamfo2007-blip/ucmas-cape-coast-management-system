<?php
// php-backend/dashboard.php
require_once 'auth.php';
check_auth(['Admin']);

class DashboardService {
    private $pdo;
    public function __construct($pdo) { $this->pdo = $pdo; }

    public function totals() {
        $totalStudents = (int)$this->pdo->query("SELECT COUNT(*) AS c FROM students")->fetch()['c'];
        $totalTeachers = (int)$this->pdo->query("SELECT COUNT(*) AS c FROM teachers")->fetch()['c'];
        $today = date('Y-m-d');
        $att = $this->pdo->prepare("SELECT 
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent
            FROM teacher_attendance WHERE date = :d");
        $att->execute(['d' => $today]);
        $attRow = $att->fetch() ?: ['present'=>0, 'absent'=>0];
        $present = (int)($attRow['present'] ?? 0);
        $absent = (int)($attRow['absent'] ?? 0);
        
        // Students with outstanding balances (any term)
        $sql = "SELECT COUNT(*) AS debtors FROM (
                  SELECT s.student_id,
                         COALESCE(SUM(sfa.expected_amount),0) AS expected,
                         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.student_id),0) AS paid
                  FROM students s
                  LEFT JOIN student_fee_accounts sfa ON s.student_id = sfa.student_id
                  GROUP BY s.student_id
                  HAVING expected > paid
                ) x";
        $debtors = (int)$this->pdo->query($sql)->fetch()['debtors'];

        return [
            'students' => $totalStudents,
            'teachers' => $totalTeachers,
            'teacher_attendance_today' => [ 'present' => $present, 'absent' => $absent ],
            'students_with_outstanding' => $debtors,
        ];
    }

    public function recentExamResults($limit = 10) {
        $sql = "SELECT s.first_name, s.last_name, c.class_name, a.assessment_date, a.total_score
                FROM assessments a
                JOIN enrollments e ON a.enrollment_id = e.enrollment_id
                JOIN students s ON e.student_id = s.student_id
                JOIN classes c ON e.class_id = c.class_id
                ORDER BY a.assessment_date DESC, a.assessment_id DESC
                LIMIT :lim";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':lim', (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}

$dashboardService = new DashboardService($pdo);
