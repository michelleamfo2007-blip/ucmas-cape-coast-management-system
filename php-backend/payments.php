<?php
// php-backend/payments.php
require_once 'auth.php';
check_auth(['Admin']);

class PaymentManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getStudentHistory($student_id) {
        $sql = "SELECT p.*, u.full_name as receiver
                FROM payments p
                LEFT JOIN users u ON p.received_by = u.user_id
                WHERE p.student_id = :student_id
                ORDER BY p.payment_date DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['student_id' => $student_id]);
        return $stmt->fetchAll();
    }

    public function recordPayment($data) {
        try {
            $this->pdo->beginTransaction();
            
            $receipt_number = 'REC-' . time() . '-' . rand(100, 999);
            $data['receipt_number'] = $receipt_number;
            $data['received_by'] = $_SESSION['user_id'];

            $sql = "INSERT INTO payments (student_id, amount, payment_date, payment_type, payment_method, term_label, receipt_number, received_by)
                    VALUES (:student_id, :amount, :payment_date, :payment_type, :payment_method, :term_label, :receipt_number, :received_by)";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($data);
            
            $this->pdo->commit();
            return [
                'status' => true,
                'id' => $this->pdo->lastInsertId(),
                'receipt_number' => $receipt_number
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['status' => false, 'error' => $e->getMessage()];
        }
    }

    // Compute outstanding balance for a student (optionally by term)
    public function getBalanceForStudent($student_id, $term_label = null) {
        $params = ['sid' => $student_id];
        $termClause = '';
        if ($term_label !== null) { $termClause = ' AND term_label = :t'; $params['t'] = $term_label; }

        // Expected
        $sqlExp = "SELECT COALESCE(SUM(expected_amount),0) AS expected
                   FROM student_fee_accounts WHERE student_id = :sid" . ($term_label !== null ? " AND term_label = :t" : "");
        $stmt = $this->pdo->prepare($sqlExp);
        $stmt->execute($params);
        $expected = (float)($stmt->fetch()['expected'] ?? 0);

        // Paid
        $sqlPaid = "SELECT COALESCE(SUM(amount),0) AS paid
                    FROM payments WHERE student_id = :sid" . $termClause;
        $stmt = $this->pdo->prepare($sqlPaid);
        $stmt->execute($params);
        $paid = (float)($stmt->fetch()['paid'] ?? 0);

        return [
            'expected' => $expected,
            'paid' => $paid,
            'outstanding' => max($expected - $paid, 0)
        ];
    }

    // List students with outstanding balances (Admin)
    public function listDebtors($term_label = null) {
        $params = [];
        $where = '';
        if ($term_label !== null) { $where = 'WHERE sfa.term_label = :t'; $params['t'] = $term_label; }
        $sql = "SELECT s.student_id, s.first_name, s.last_name, s.parent_name, s.parent_phone, 
                       COALESCE(SUM(sfa.expected_amount),0) AS expected,
                       COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.student_id" . ($term_label !== null ? " AND p.term_label = :t" : "") . "),0) AS paid
                FROM students s
                LEFT JOIN student_fee_accounts sfa ON s.student_id = sfa.student_id
                {$where}
                GROUP BY s.student_id
                HAVING expected > paid
                ORDER BY (expected - paid) DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['outstanding'] = (float)$r['expected'] - (float)$r['paid'];
        }
        return $rows;
    }

    public function getReceiptData($payment_id) {
        $sql = "SELECT p.*, s.first_name, s.last_name, u.full_name as receiver
                FROM payments p
                JOIN students s ON p.student_id = s.student_id
                LEFT JOIN users u ON p.received_by = u.user_id
                WHERE p.payment_id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $payment_id]);
        return $stmt->fetch();
    }
}

$paymentManager = new PaymentManager($pdo);
?>
