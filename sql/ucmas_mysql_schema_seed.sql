-- UCMAS School Management - MySQL schema and seed
-- Safe to run on MySQL 8+. Creates DB/tables if missing and seeds base data.

CREATE DATABASE IF NOT EXISTS `ucmas`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `ucmas`;

-- Branches (Franchise schools)
CREATE TABLE IF NOT EXISTS `branches` (
  `branch_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255),
  `contact_phone` VARCHAR(64),
  `contact_email` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_branches_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Users (Auth)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255),
  `role` VARCHAR(32) NOT NULL,
  `branch_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students
CREATE TABLE IF NOT EXISTS `students` (
  `student_id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `parent_name` VARCHAR(255),
  `parent_phone` VARCHAR(64),
  `date_of_birth` DATE,
  `enrollment_date` DATE,
  `status` VARCHAR(32) DEFAULT 'Active',
  `branch_id` INT NOT NULL,
  CONSTRAINT `fk_students_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_students_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student fee accounts (expected fees per term/period)
CREATE TABLE IF NOT EXISTS `student_fee_accounts` (
  `account_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `term_label` VARCHAR(64) NOT NULL,
  `expected_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT `fk_sfa_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`),
  UNIQUE KEY `uq_sfa_student_term` (`student_id`, `term_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Teachers (linked to users)
CREATE TABLE IF NOT EXISTS `teachers` (
  `teacher_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `specialty` VARCHAR(255),
  `phone` VARCHAR(64),
  `branch_id` INT,
  CONSTRAINT `fk_teachers_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`),
  CONSTRAINT `fk_teachers_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_teachers_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Levels
CREATE TABLE IF NOT EXISTS `levels` (
  `level_id` INT AUTO_INCREMENT PRIMARY KEY,
  `level_name` VARCHAR(255) NOT NULL,
  UNIQUE KEY `uq_levels_name` (`level_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Classes
CREATE TABLE IF NOT EXISTS `classes` (
  `class_id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_name` VARCHAR(255) NOT NULL,
  `level_id` INT,
  `schedule_day` VARCHAR(32),
  `schedule_time` VARCHAR(32),
  `branch_id` INT,
  `teacher_id` INT,
  CONSTRAINT `fk_classes_level` FOREIGN KEY (`level_id`) REFERENCES `levels`(`level_id`),
  CONSTRAINT `fk_classes_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  CONSTRAINT `fk_classes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`teacher_id`),
  KEY `idx_classes_branch` (`branch_id`),
  KEY `idx_classes_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Enrollments (student to class)
CREATE TABLE IF NOT EXISTS `enrollments` (
  `enrollment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT,
  `class_id` INT,
  `enrollment_date` DATE,
  CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`),
  CONSTRAINT `fk_enrollments_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_type` VARCHAR(32) NOT NULL,
  `payment_method` VARCHAR(32) NOT NULL,
  `term_label` VARCHAR(64) NULL,
  `receipt_number` VARCHAR(64) UNIQUE,
  `received_by` INT,
  `branch_id` INT,
  CONSTRAINT `fk_payments_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`),
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`received_by`) REFERENCES `users`(`user_id`),
  CONSTRAINT `fk_payments_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_payments_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student Attendance
CREATE TABLE IF NOT EXISTS `student_attendance` (
  `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT,
  `class_id` INT,
  `date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `remarks` TEXT,
  `branch_id` INT,
  CONSTRAINT `fk_sa_student` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`),
  CONSTRAINT `fk_sa_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`class_id`),
  CONSTRAINT `fk_sa_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_student_att_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Teacher Attendance
CREATE TABLE IF NOT EXISTS `teacher_attendance` (
  `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT,
  `date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `remarks` TEXT,
  `check_in_time` DATETIME NULL,
  `check_out_time` DATETIME NULL,
  `branch_id` INT,
  CONSTRAINT `fk_ta_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`teacher_id`),
  CONSTRAINT `fk_ta_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_teacher_att_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assessments (Grades)
CREATE TABLE IF NOT EXISTS `assessments` (
  `assessment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `enrollment_id` INT,
  `assessment_date` DATE NOT NULL,
  `listening_score` INT DEFAULT 0,
  `mental_score` INT DEFAULT 0,
  `abacus_score` INT DEFAULT 0,
  `vision_score` INT DEFAULT 0,
  `total_score` INT DEFAULT 0,
  `remarks` TEXT,
  CONSTRAINT `fk_assess_enroll` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`enrollment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inventory (optional module)
CREATE TABLE IF NOT EXISTS `inventory` (
  `item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(64),
  `quantity` INT DEFAULT 0,
  `unit_cost` DECIMAL(10,2) DEFAULT 0,
  `branch_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inventory_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  KEY `idx_inventory_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed branches (includes Great Montessori located in Cape Coast)
INSERT INTO `branches` (`name`, `location`, `contact_phone`, `contact_email`)
VALUES
  ('Cape Coast', 'Cape Coast', '0200000001', 'capecoast@example.com'),
  ('Great Montessori', 'Cape Coast', '0200000010', 'greatmontessori@example.com'),
  ('Accra', 'Accra', '0200000002', 'accra@example.com'),
  ('Kumasi', 'Kumasi', '0200000003', 'kumasi@example.com'),
  ('Takoradi', 'Takoradi', '0200000004', 'takoradi@example.com'),
  ('Tamale', 'Tamale', '0200000005', 'tamale@example.com')
ON DUPLICATE KEY UPDATE `location`=VALUES(`location`);

-- Seed levels
INSERT INTO `levels` (`level_name`) VALUES
  ('Basic'), ('Elementary A'), ('Elementary B'),
  ('Intermediate A'), ('Intermediate B'),
  ('Higher A'), ('Higher B'), ('Advance')
ON DUPLICATE KEY UPDATE `level_name`=`level_name`;

-- Note: Admin user is auto-seeded by the server on first run (username: admin, password: admin123).
-- If you must insert manually, compute a bcrypt hash for 'admin123' and insert into users.
