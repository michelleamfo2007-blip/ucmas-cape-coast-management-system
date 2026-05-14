# UCMAS Cape Coast Management System Architecture

## 1. System Overview
The system is designed to manage the specific workflows of a UCMAS (Universal Concept of Mental Arithmetic System) franchise. This includes tracking student progress through various levels, managing complex fee structures (registration, books, tuition), and recording performance in mental arithmetic.

## 2. Entity-Relationship Diagram (ERD)

### Entities:
1. **Users**: System access for Admins and Staff.
2. **Levels**: Master list of UCMAS levels (e.g., Foundation, Basic 1-9, Elementary, Intermediate, Higher, Advance).
3. **Parents**: Contact information for guardians.
4. **Students**: Core profile data.
5. **Classes**: Specific batches organized by level and scheduled time.
6. **Enrollments**: Links students to classes for a specific term/period.
7. **Attendance**: Daily tracking of student presence.
8. **Payments**: Financial records for tuition and materials.
9. **Assessments**: Performance scores in Listening, Mental, and Abacus arithmetic.

### Relationships:
- **Parent (1) <---> Multi (N) Student**: One parent can register multiple children.
- **Level (1) <---> Multi (N) Class**: Multiple classes can exist for the same level (e.g., Saturday morning Basic 1, Monday afternoon Basic 1).
- **Student (1) <---> Multi (N) Enrollment**: A student moves through multiple classes/levels over time.
- **Class (1) <---> Multi (N) Enrollment**: A class contains multiple students.
- **Student (1) <---> Multi (N) Payment**: Tracking fee history.
- **Enrollment (1) <---> Multi (N) Attendance/Assessment**: Tracking performance and presence within a specific class context.

---

## 3. SQL Schema (MySQL)

```sql
-- Disable foreign key checks to allow clean creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Levels Master Table
CREATE TABLE levels (
    level_id INT AUTO_INCREMENT PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL, -- e.g., 'Foundation', 'Basic 1'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Parents Table
CREATE TABLE parents (
    parent_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    home_address TEXT,
    occupation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Students Table
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('Male', 'Female'),
    enrollment_date DATE,
    status ENUM('Active', 'Inactive', 'Graduated') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES parents(parent_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Staff/Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('Admin', 'Instructor') NOT NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Classes Table
CREATE TABLE classes (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    level_id INT,
    instructor_id INT,
    class_name VARCHAR(100), -- e.g., 'Saturday Batch A'
    schedule_day VARCHAR(20), -- e.g., 'Saturday'
    schedule_time TIME,
    max_capacity INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (level_id) REFERENCES levels(level_id),
    FOREIGN KEY (instructor_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- 6. Enrollments (Linking Students to Classes)
CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    class_id INT,
    start_date DATE,
    completion_date DATE NULL,
    status ENUM('Ongoing', 'Completed', 'Dropped') DEFAULT 'Ongoing',
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
) ENGINE=InnoDB;

-- 7. Payments Table
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type ENUM('Registration', 'Tuition', 'Textbook', 'Abacus', 'Competition'),
    payment_method ENUM('Cash', 'Mobile Money', 'Bank Transfer'),
    reference_number VARCHAR(50), -- Receipt # or MoMo Transaction ID
    remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
) ENGINE=InnoDB;

-- 8. Attendance Table
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT,
    session_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Excused') DEFAULT 'Present',
    remarks TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
) ENGINE=InnoDB;

-- 9. Assessments Table
CREATE TABLE assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT,
    assessment_date DATE NOT NULL,
    listening_score INT,
    vision_score INT,
    mental_score INT,
    abacus_score INT,
    total_score INT,
    remarks TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
```

## 4. Relationship Explanation

1. **Student & Parent**: A one-to-many relationship ensures that communication can be sent to one parent for multiple students.
2. **Enrollment Pattern**: Instead of linking Student directly to Class, the `enrollments` table acts as a bridge. This allows a student to have a history of classes as they progress from Foundation to Advance levels.
3. **Financial Tracking**: The `payments` table is linked directly to the student. This allows the admin to see the total lifetime value and outstanding balance of a student regardless of which class they are currently in.
4. **Performance Monitoring**: The `assessments` table is linked to the enrollment. This is crucial because it tracks the student's performance *within a specific level*, making it easy to generate progress cards for each UCMAS stage.
