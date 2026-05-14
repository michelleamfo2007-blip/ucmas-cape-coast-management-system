-- Migration: Admin/Teacher focus schema adjustments
-- Run against the `ucmas` database

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(64) NULL;

ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS teacher_id INT NULL,
  ADD KEY IF NOT EXISTS idx_classes_teacher (teacher_id),
  ADD CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id);

CREATE TABLE IF NOT EXISTS student_fee_accounts (
  account_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  term_label VARCHAR(64) NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_sfa_student FOREIGN KEY (student_id) REFERENCES students(student_id),
  UNIQUE KEY uq_sfa_student_term (student_id, term_label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS term_label VARCHAR(64) NULL;

ALTER TABLE teacher_attendance
  ADD COLUMN IF NOT EXISTS check_in_time DATETIME NULL,
  ADD COLUMN IF NOT EXISTS check_out_time DATETIME NULL;
