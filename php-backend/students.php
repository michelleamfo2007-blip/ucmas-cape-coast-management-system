<?php
// php-backend/students.php
require_once 'auth.php';
check_auth(['Admin', 'Teacher']);

class StudentManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        if (isset($_SESSION['role']) && $_SESSION['role'] === 'Admin') {
            return $this->pdo->query("SELECT * FROM students")->fetchAll();
        }
        if (isset($_SESSION['role']) && $_SESSION['role'] === 'Teacher') {
            $sql = "SELECT DISTINCT s.*
                    FROM students s
                    JOIN enrollments e ON s.student_id = e.student_id
                    JOIN classes c ON e.class_id = c.class_id
                    JOIN teachers t ON c.teacher_id = t.teacher_id
                    JOIN users u ON t.user_id = u.user_id
                    WHERE u.user_id = :uid";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['uid' => $_SESSION['user_id']]);
            return $stmt->fetchAll();
        }
        return [];
    }

    public function add($data) {
        check_auth(['Admin']);
        $sql = "INSERT INTO students (first_name, last_name, email, parent_name, parent_phone, date_of_birth, enrollment_date, branch_id) 
                VALUES (:first_name, :last_name, :email, :parent_name, :parent_phone, :dob, :enrollment_date, :branch_id)";
        return $this->pdo->prepare($sql)->execute($data);
    }

    public function update($id, $data) {
        check_auth(['Admin']);
        $sql = "UPDATE students SET first_name = :first_name, last_name = :last_name, 
                email = :email, parent_name = :parent_name, parent_phone = :parent_phone, status = :status WHERE student_id = :id";
        $data['id'] = $id;
        return $this->pdo->prepare($sql)->execute($data);
    }

    public function delete($id) {
        check_auth(['Admin']); // Only admin can delete
        return $this->pdo->prepare("DELETE FROM students WHERE student_id = ?")->execute([$id]);
    }
}

$studentManager = new StudentManager($pdo);
?>
