<?php
// php-backend/classes.php
require_once 'auth.php';
check_auth(['Admin', 'Teacher']);

class ClassManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function listClasses() {
        if (isset($_SESSION['role']) && $_SESSION['role'] === 'Admin') {
            $sql = "SELECT c.*, l.level_name, t.teacher_id, u.full_name AS teacher_name
                    FROM classes c
                    LEFT JOIN levels l ON c.level_id = l.level_id
                    LEFT JOIN teachers t ON c.teacher_id = t.teacher_id
                    LEFT JOIN users u ON t.user_id = u.user_id
                    ORDER BY c.class_name";
            return $this->pdo->query($sql)->fetchAll();
        }
        // Teacher can see only their own classes
        $sql = "SELECT c.*, l.level_name
                FROM classes c
                LEFT JOIN levels l ON c.level_id = l.level_id
                JOIN teachers t ON c.teacher_id = t.teacher_id
                JOIN users u ON t.user_id = u.user_id
                WHERE u.user_id = :uid
                ORDER BY c.class_name";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['uid' => $_SESSION['user_id']]);
        return $stmt->fetchAll();
    }

    public function addClass($data) {
        // Admin only
        check_auth(['Admin']);
        $sql = "INSERT INTO classes (class_name, level_id, schedule_day, schedule_time, branch_id, teacher_id)
                VALUES (:class_name, :level_id, :schedule_day, :schedule_time, :branch_id, :teacher_id)";
        return $this->pdo->prepare($sql)->execute($data);
    }

    public function assignTeacher($class_id, $teacher_id) {
        check_auth(['Admin']);
        $sql = "UPDATE classes SET teacher_id = :tid WHERE class_id = :cid";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['tid' => $teacher_id, 'cid' => $class_id]);
    }

    public function enrollStudent($student_id, $class_id, $enrollment_date) {
        // Admin only
        check_auth(['Admin']);
        $sql = "INSERT INTO enrollments (student_id, class_id, enrollment_date) VALUES (?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$student_id, $class_id, $enrollment_date]);
    }

    public function getStudentsInClass($class_id) {
        // Admin or assigned Teacher only
        $role = $_SESSION['role'] ?? null;
        $params = ['cid' => $class_id];
        $restrict = '';
        if ($role === 'Teacher') {
            $restrict = ' AND c.teacher_id = :tid';
            // use helper from auth.php
            $params['tid'] = current_teacher_id($this->pdo);
        }
        $sql = "SELECT s.*
                FROM students s
                JOIN enrollments e ON s.student_id = e.student_id
                JOIN classes c ON e.class_id = c.class_id
                WHERE c.class_id = :cid{$restrict}
                ORDER BY s.last_name, s.first_name";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}

$classManager = new ClassManager($pdo);
