<?php
// php-backend/teachers.php
require_once 'auth.php';
check_auth(['Admin']);

class TeacherManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getAll() {
        $sql = "SELECT u.user_id, u.username, u.full_name, t.specialty, t.phone 
                FROM users u 
                JOIN teachers t ON u.user_id = t.user_id 
                WHERE u.role = 'Teacher'";
        return $this->pdo->query($sql)->fetchAll();
    }

    public function add($user_data, $teacher_data) {
        try {
            $this->pdo->beginTransaction();
            
            // Create user first
            $sql_user = "INSERT INTO users (username, password_hash, full_name, role) 
                         VALUES (:username, :pass, :name, 'Teacher')";
            $stmt_user = $this->pdo->prepare($sql_user);
            $stmt_user->execute($user_data);
            $user_id = $this->pdo->lastInsertId();

            // Create teacher record
            $sql_teacher = "INSERT INTO teachers (user_id, specialty, phone) 
                            VALUES (:user_id, :specialty, :phone)";
            $teacher_data['user_id'] = $user_id;
            $this->pdo->prepare($sql_teacher)->execute($teacher_data);

            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }
}

$teacherManager = new TeacherManager($pdo);
?>
