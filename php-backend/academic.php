<?php
// php-backend/academic.php
require_once 'auth.php';
check_auth(['Admin', 'Teacher']);

class AcademicManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAssessmentsByClass($class_id, $date) {
        // If Teacher, ensure the class belongs to them
        $role = $_SESSION['role'] ?? null;
        $params = ['date' => $date, 'class_id' => $class_id];
        $restrict = '';
        if ($role === 'Teacher') {
            $restrict = ' AND c.teacher_id = :tid';
            $params['tid'] = current_teacher_id($this->pdo);
        }
        $sql = "SELECT s.student_id, s.first_name, s.last_name, e.enrollment_id, a.assessment_id, 
                       a.listening_score, a.mental_score, a.abacus_score, a.vision_score, a.remarks
                FROM students s
                JOIN enrollments e ON s.student_id = e.student_id
                JOIN classes c ON e.class_id = c.class_id
                LEFT JOIN assessments a ON e.enrollment_id = a.enrollment_id AND a.assessment_date = :date
                WHERE e.class_id = :class_id{$restrict}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function recordGrades($date, $grades) {
        try {
            $this->pdo->beginTransaction();
            $role = $_SESSION['role'] ?? null;
            $self_tid = current_teacher_id($this->pdo);
            foreach ($grades as $record) {
                // If Teacher, verify this enrollment is under a class taught by them
                if ($role === 'Teacher') {
                    $chk = $this->pdo->prepare("SELECT 1 FROM enrollments e JOIN classes c ON e.class_id = c.class_id WHERE e.enrollment_id = ? AND c.teacher_id = ?");
                    $chk->execute([$record['enrollment_id'], $self_tid]);
                    if ($chk->fetchColumn() != 1) { continue; }
                }
                $total = ($record['listening_score'] ?? 0) + ($record['mental_score'] ?? 0) + 
                         ($record['abacus_score'] ?? 0) + ($record['vision_score'] ?? 0);
                
                // Delete existing
                $sql_del = "DELETE FROM assessments WHERE enrollment_id = ? AND assessment_date = ?";
                $this->pdo->prepare($sql_del)->execute([$record['enrollment_id'], $date]);
                
                $sql_ins = "INSERT INTO assessments (enrollment_id, assessment_date, listening_score, mental_score, abacus_score, vision_score, total_score, remarks)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $this->pdo->prepare($sql_ins)->execute([
                    $record['enrollment_id'], 
                    $date, 
                    $record['listening_score'], 
                    $record['mental_score'], 
                    $record['abacus_score'], 
                    $record['vision_score'], 
                    $total, 
                    $record['remarks']
                ]);
            }
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }

    // Admin filter across results by teacher/class/date
    public function getResultsFiltered($filters = []) {
        check_auth(['Admin']);
        $clauses = [];
        $params = [];
        if (!empty($filters['teacher_id'])) { $clauses[] = 'c.teacher_id = :tid'; $params['tid'] = $filters['teacher_id']; }
        if (!empty($filters['class_id'])) { $clauses[] = 'c.class_id = :cid'; $params['cid'] = $filters['class_id']; }
        if (!empty($filters['date'])) { $clauses[] = 'a.assessment_date = :adate'; $params['adate'] = $filters['date']; }
        $where = $clauses ? ('WHERE ' . implode(' AND ', $clauses)) : '';
        $sql = "SELECT s.student_id, s.first_name, s.last_name, c.class_name, a.assessment_date, a.total_score
                FROM assessments a
                JOIN enrollments e ON a.enrollment_id = e.enrollment_id
                JOIN students s ON e.student_id = s.student_id
                JOIN classes c ON e.class_id = c.class_id
                {$where}
                ORDER BY a.assessment_date DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getStudentReport($student_id) {
        $sql = "SELECT a.*, c.class_name, l.level_name
                FROM assessments a
                JOIN enrollments e ON a.enrollment_id = e.enrollment_id
                JOIN classes c ON e.class_id = c.class_id
                JOIN levels l ON c.level_id = l.level_id
                WHERE e.student_id = :id
                ORDER BY a.assessment_date DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $student_id]);
        return $stmt->fetchAll();
    }
}

$academicManager = new AcademicManager($pdo);
?>
