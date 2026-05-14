<?php
// php-backend/auth.php
require_once 'config.php';

function login($username, $password) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['username'] = $user['username'];
        return true;
    }
    return false;
}

function check_auth($allowed_roles = []) {
    if (!isset($_SESSION['user_id'])) {
        header('Location: login.php');
        exit;
    }
    if (!empty($allowed_roles) && !in_index($allowed_roles, $_SESSION['role'])) {
        die("Access Forbidden");
    }
}

function in_index($array, $val) {
    return in_array($val, $array);
}

function logout() {
    session_destroy();
    header('Location: login.php');
}

// Helper: get the teacher_id for the logged-in user, or null if not a teacher
function current_teacher_id(PDO $pdo) {
    if (!isset($_SESSION['user_id'])) return null;
    $stmt = $pdo->prepare("SELECT t.teacher_id FROM teachers t JOIN users u ON t.user_id = u.user_id WHERE u.user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();
    return $row ? (int)$row['teacher_id'] : null;
}
?>
