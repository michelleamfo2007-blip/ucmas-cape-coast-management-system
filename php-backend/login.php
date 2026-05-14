<?php
require_once __DIR__ . '/auth.php';

$error = null;
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    if ($username && $password) {
        if (login($username, $password)) {
            header('Location: admin/dashboard.php');
            exit;
        } else {
            $error = 'Invalid credentials';
        }
    } else {
        $error = 'Please enter username and password';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login - UCMAS Admin</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f9fafb; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .card { background:#fff; padding:24px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08); width: 320px; }
    h1 { font-size:20px; margin:0 0 16px; }
    label { display:block; margin:12px 0 6px; font-size:14px; color:#374151; }
    input { width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; }
    button { margin-top:16px; width:100%; background:#dc2626; color:#fff; border:none; padding:10px 12px; border-radius:8px; font-weight:600; cursor:pointer; }
    .error { color:#b91c1c; background:#fee2e2; border:1px solid #fecaca; padding:8px 10px; border-radius:8px; font-size:14px; margin-bottom:10px; }
  </style>
</head>
<body>
  <form class="card" method="post">
    <h1>UCMAS Admin Login</h1>
    <?php if ($error): ?>
      <div class="error"><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>
    <label for="username">Username</label>
    <input id="username" name="username" type="text" autocomplete="username" required />
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    <button type="submit">Login</button>
  </form>
</body>
</html>
