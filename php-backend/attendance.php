<?php
// php-backend/attendance.php
require_once 'auth.php';
check_auth(['Admin', 'Teacher']);

class AttendanceManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Student Attendance
    public function getStudentAttendance($date, $class_id) {
        $params = ['date' => $date, 'class_id' => $class_id];
        $restrict = '';
        if (($_SESSION['role'] ?? null) === 'Teacher') {
            $restrict = ' AND c.teacher_id = :tid';
            $params['tid'] = current_teacher_id($this->pdo);
        }
        $sql = "SELECT s.student_id, s.first_name, s.last_name, a.status, a.remarks
                FROM students s
                JOIN enrollments e ON s.student_id = e.student_id
                JOIN classes c ON e.class_id = c.class_id
                LEFT JOIN student_attendance a ON s.student_id = a.student_id AND a.date = :date AND a.class_id = :class_id
                WHERE e.class_id = :class_id{$restrict}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function markStudentAttendance($date, $class_id, $attendance) {
        try {
            $this->pdo->beginTransaction();
            if (($_SESSION['role'] ?? null) === 'Teacher') {
                $tid = current_teacher_id($this->pdo);
                $chk = $this->pdo->prepare("SELECT 1 FROM classes WHERE class_id = ? AND teacher_id = ?");
                $chk->execute([$class_id, $tid]);
                if ($chk->fetchColumn() != 1) { $this->pdo->rollBack(); return false; }
            }
            foreach ($attendance as $record) {
                // Delete existing first (SQL version of upsert)
                $sql_del = "DELETE FROM student_attendance WHERE student_id = ? AND class_id = ? AND date = ?";
                $this->pdo->prepare($sql_del)->execute([$record['student_id'], $class_id, $date]);
                
                $sql_ins = "INSERT INTO student_attendance (student_id, class_id, date, status, remarks) 
                            VALUES (?, ?, ?, ?, ?)";
                $this->pdo->prepare($sql_ins)->execute([
                    $record['student_id'], 
                    $class_id, 
                    $date, 
                    $record['status'], 
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

    // Teacher Attendance
    public function getTeacherAttendance($date, $teacher_id = null) {
        $params = ['date' => $date];
        $where = '';
        if ($teacher_id) {
            $where = ' AND t.teacher_id = :tid';
            $params['tid'] = $teacher_id;
        }
        $sql = "SELECT t.teacher_id, u.full_name, a.status, a.remarks, a.check_in_time, a.check_out_time
                FROM teachers t
                JOIN users u ON t.user_id = u.user_id
                LEFT JOIN teacher_attendance a ON t.teacher_id = a.teacher_id AND a.date = :date
                WHERE 1=1{$where}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function markTeacherAttendance($date, $attendance) {
        // Admin can mark multiple; Teacher can only mark self
        try {
            $this->pdo->beginTransaction();
            $role = $_SESSION['role'] ?? null;
            $self_tid = current_teacher_id($this->pdo);
            foreach ($attendance as $record) {
                if ($role === 'Teacher') {
                    if (!$self_tid || (int)$record['teacher_id'] !== (int)$self_tid) continue; // ignore others
                } else {
                    check_auth(['Admin']);
                }
                $sql_del = "DELETE FROM teacher_attendance WHERE teacher_id = ? AND date = ?";
                $this->pdo->prepare($sql_del)->execute([$record['teacher_id'], $date]);
                
                $sql_ins = "INSERT INTO teacher_attendance (teacher_id, date, status, remarks) 
                            VALUES (?, ?, ?, ?)";
                $this->pdo->prepare($sql_ins)->execute([
                    $record['teacher_id'], 
                    $date, 
                    $record['status'], 
                    $record['remarks'] ?? ''
                ]);
            }
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }

    public function teacherCheckIn($when) {
        // Teachers can check themselves in
        check_auth(['Teacher', 'Admin']);
        $tid = current_teacher_id($this->pdo);
        if (!$tid) return false;
        $date = substr($when, 0, 10);
        $this->pdo->beginTransaction();
        try {
            $sql_del = "DELETE FROM teacher_attendance WHERE teacher_id = ? AND date = ?";
            $this->pdo->prepare($sql_del)->execute([$tid, $date]);
            $sql_ins = "INSERT INTO teacher_attendance (teacher_id, date, status, remarks, check_in_time) VALUES (?, ?, ?, ?, ?)";
            $this->pdo->prepare($sql_ins)->execute([$tid, $date, 'Present', '', $when]);
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }

    public function teacherCheckOut($when) {
        check_auth(['Teacher', 'Admin']);
        $tid = current_teacher_id($this->pdo);
        if (!$tid) return false;
        $date = substr($when, 0, 10);
        $sql = "UPDATE teacher_attendance SET check_out_time = :out WHERE teacher_id = :tid AND date = :date";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['out' => $when, 'tid' => $tid, 'date' => $date]);
    }
}

$attendanceManager = new AttendanceManager($pdo);
?>
