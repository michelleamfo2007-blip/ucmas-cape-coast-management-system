import 'dotenv/config';
import { createPool, Pool, ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

type DB = {
  all: (sql: string, params?: any[]) => Promise<any[]>;
  get: (sql: string, params?: any[]) => Promise<any | null>;
  run: (sql: string, params?: any[]) => Promise<{ lastID: number; changes: number }>;
};

let pool: Pool | null = null;
let db: DB | null = null;

export async function getDb(): Promise<DB> {
  if (db) return db;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'ucmas';

  pool = createPool({ host, port, user, password, database, connectionLimit: 10, multipleStatements: true });

  try {
    await setupDatabase(pool);
  } catch (err: any) {
    const msg = String(err?.message || '');
    const code = (err as any)?.code;
    if (code === 'ER_BAD_DB_ERROR' || msg.toLowerCase().includes('unknown database')) {
      const adminPool = createPool({ host, port, user, password, connectionLimit: 5, multipleStatements: true });
      await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      // Recreate pool targeting the new database and retry
      pool = createPool({ host, port, user, password, database, connectionLimit: 10, multipleStatements: true });
      await setupDatabase(pool);
    } else {
      throw err;
    }
  }

  db = {
    all: async (sql: string, params: any[] = []) => {
      const [rows] = await pool!.query(sql, params);
      return rows as any[];
    },
    get: async (sql: string, params: any[] = []) => {
      const [rows] = await pool!.query(sql, params);
      const arr = rows as any[];
      return arr[0] ?? null;
    },
    run: async (sql: string, params: any[] = []) => {
      const [result] = await pool!.execute(sql, params);
      const r = result as ResultSetHeader;
      return { lastID: r.insertId || 0, changes: r.affectedRows || 0 };
    }
  };

  return db;
}

async function columnExists(mysql: Pool, dbName: string, table: string, column: string) {
  const [rows] = await mysql.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [dbName, table, column]
  );
  return (rows as any[]).length > 0;
}

async function addColumnIfNotExists(mysql: Pool, dbName: string, table: string, column: string, definition: string) {
  if (!(await columnExists(mysql, dbName, table, column))) {
    await mysql.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureIndex(mysql: Pool, dbName: string, table: string, indexName: string, columns: string) {
  const [rows] = await mysql.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [dbName, table, indexName]
  );
  if ((rows as any[]).length === 0) {
    await mysql.execute(`CREATE INDEX ${indexName} ON ${table} (${columns})`);
  }
}

async function ensureUniqueIndex(mysql: Pool, dbName: string, table: string, indexName: string, columns: string) {
  const [rows] = await mysql.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [dbName, table, indexName]
  );
  if ((rows as any[]).length === 0) {
    await mysql.execute(`CREATE UNIQUE INDEX ${indexName} ON ${table} (${columns})`);
  }
}

async function setupDatabase(mysql: Pool) {
  const dbName = process.env.MYSQL_DATABASE || 'ucmas';
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS branches (
      branch_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      location VARCHAR(255),
      contact_phone VARCHAR(64),
      contact_email VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Schools (Partner schools under a branch)
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS schools (
      school_id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(64),
      contact_email VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_schools_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
      UNIQUE KEY uq_school_branch_name (branch_id, name),
      KEY idx_schools_branch (branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Users Table (Auth)
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(32) NOT NULL,
      branch_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Students Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS students (
      student_id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      date_of_birth DATE,
      enrollment_date DATE,
      status VARCHAR(32) DEFAULT 'Active',
      school_id INT NULL,
      branch_id INT,
      CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
      CONSTRAINT fk_students_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Teachers Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      teacher_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      specialty VARCHAR(255),
      phone VARCHAR(64),
      branch_id INT,
      CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(user_id),
      CONSTRAINT fk_teachers_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Levels Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS levels (
      level_id INT AUTO_INCREMENT PRIMARY KEY,
      level_name VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Classes Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS classes (
      class_id INT AUTO_INCREMENT PRIMARY KEY,
      class_name VARCHAR(255) NOT NULL,
      level_id INT,
      schedule_day VARCHAR(32),
      schedule_time VARCHAR(32),
      school_id INT NULL,
      branch_id INT,
      CONSTRAINT fk_classes_level FOREIGN KEY (level_id) REFERENCES levels(level_id),
      CONSTRAINT fk_classes_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
      CONSTRAINT fk_classes_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Enrollments Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS enrollments (
      enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      class_id INT,
      enrollment_date DATE,
      CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students(student_id),
      CONSTRAINT fk_enrollments_class FOREIGN KEY (class_id) REFERENCES classes(class_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Student Attendance Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS student_attendance (
      attendance_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      class_id INT,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL,
      remarks TEXT,
      branch_id INT,
      CONSTRAINT fk_sa_student FOREIGN KEY (student_id) REFERENCES students(student_id),
      CONSTRAINT fk_sa_class FOREIGN KEY (class_id) REFERENCES classes(class_id),
      CONSTRAINT fk_sa_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Teacher Attendance Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS teacher_attendance (
      attendance_id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL,
      remarks TEXT,
      branch_id INT,
      CONSTRAINT fk_ta_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
      CONSTRAINT fk_ta_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Payments Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      amount DECIMAL(10, 2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_type VARCHAR(32) NOT NULL,
      payment_method VARCHAR(32) NOT NULL,
      receipt_number VARCHAR(64) UNIQUE,
      received_by INT,
      branch_id INT,
      CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students(student_id),
      CONSTRAINT fk_payments_user FOREIGN KEY (received_by) REFERENCES users(user_id),
      CONSTRAINT fk_payments_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Assessments (Grades) Table
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS assessments (
      assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      enrollment_id INT,
      assessment_date DATE NOT NULL,
      listening_score INT DEFAULT 0,
      mental_score INT DEFAULT 0,
      abacus_score INT DEFAULT 0,
      vision_score INT DEFAULT 0,
      total_score INT DEFAULT 0,
      remarks TEXT,
      CONSTRAINT fk_assess_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Inventory Table (optional module)
  await mysql.execute(`
    CREATE TABLE IF NOT EXISTS inventory (
      item_id INT AUTO_INCREMENT PRIMARY KEY,
      item_name VARCHAR(255) NOT NULL,
      category VARCHAR(64),
      quantity INT DEFAULT 0,
      unit_cost DECIMAL(10,2) DEFAULT 0,
      branch_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_inventory_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await addColumnIfNotExists(mysql, dbName, 'users', 'branch_id', 'INT NULL');
  await addColumnIfNotExists(mysql, dbName, 'users', 'email', 'VARCHAR(255) NULL');
  await addColumnIfNotExists(mysql, dbName, 'students', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'students', 'school_id', 'INT NULL');
  await addColumnIfNotExists(mysql, dbName, 'teachers', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'classes', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'classes', 'school_id', 'INT NULL');
  await addColumnIfNotExists(mysql, dbName, 'payments', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'student_attendance', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'teacher_attendance', 'branch_id', 'INT');
  await addColumnIfNotExists(mysql, dbName, 'inventory', 'branch_id', 'INT');

  await ensureIndex(mysql, dbName, 'users', 'idx_users_branch', 'branch_id');
  await ensureUniqueIndex(mysql, dbName, 'users', 'uniq_users_email', 'email');
  await ensureIndex(mysql, dbName, 'students', 'idx_students_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'students', 'idx_students_school', 'school_id');
  await ensureIndex(mysql, dbName, 'teachers', 'idx_teachers_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'classes', 'idx_classes_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'classes', 'idx_classes_school', 'school_id');
  await ensureIndex(mysql, dbName, 'payments', 'idx_payments_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'student_attendance', 'idx_student_att_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'teacher_attendance', 'idx_teacher_att_branch', 'branch_id');
  await ensureIndex(mysql, dbName, 'inventory', 'idx_inventory_branch', 'branch_id');

  // Create default admin if not exists
  const adminExists = await mysql.query('SELECT 1 FROM users WHERE username = ? LIMIT 1', ['admin']);
  if ((adminExists[0] as any[]).length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await mysql.execute(
      'INSERT INTO users (username, password_hash, full_name, role, branch_id) VALUES (?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'System Administrator', 'Admin', null]
    );
  }

  const [bCountRows] = await mysql.query('SELECT COUNT(*) as count FROM branches');
  const bCount = (bCountRows as any[])[0]?.count ?? 0;
  if (bCount === 0) {
    await mysql.execute("INSERT INTO branches (name, location, contact_phone, contact_email) VALUES ('Cape Coast', 'Cape Coast', '0200000001', 'capecoast@example.com')");
    await mysql.execute("INSERT INTO branches (name, location, contact_phone, contact_email) VALUES ('Accra', 'Accra', '0200000002', 'accra@example.com')");
    await mysql.execute("INSERT INTO branches (name, location, contact_phone, contact_email) VALUES ('Kumasi', 'Kumasi', '0200000003', 'kumasi@example.com')");
    await mysql.execute("INSERT INTO branches (name, location, contact_phone, contact_email) VALUES ('Takoradi', 'Takoradi', '0200000004', 'takoradi@example.com')");
    await mysql.execute("INSERT INTO branches (name, location, contact_phone, contact_email) VALUES ('Tamale', 'Tamale', '0200000005', 'tamale@example.com')");
  }

  // Seed sample data for attendance tracking demo
  const [sCountRows] = await mysql.query('SELECT COUNT(*) as count FROM students');
  const sCount = (sCountRows as any[])[0]?.count ?? 0;
  if (sCount === 0) {
    const [bRow] = await mysql.query("SELECT branch_id FROM branches WHERE name = 'Cape Coast' LIMIT 1");
    const branchId = (bRow as any[])[0]?.branch_id;
    await mysql.execute("INSERT INTO students (first_name, last_name, email, status, branch_id) VALUES ('Kofi', 'Owusu', 'kofi@example.com', 'Active', ?)", [branchId]);
    await mysql.execute("INSERT INTO students (first_name, last_name, email, status, branch_id) VALUES ('Ama', 'Boateng', 'ama@example.com', 'Active', ?)", [branchId]);
    await mysql.execute("INSERT INTO students (first_name, last_name, email, status, branch_id) VALUES ('Yaw', 'Mensah', 'yaw@example.com', 'Active', ?)", [branchId]);
  }

  const [clsCountRows] = await mysql.query('SELECT COUNT(*) as count FROM classes');
  const clsCount = (clsCountRows as any[])[0]?.count ?? 0;
  if (clsCount === 0) {
    const [bRow] = await mysql.query("SELECT branch_id FROM branches WHERE name = 'Cape Coast' LIMIT 1");
    const branchId = (bRow as any[])[0]?.branch_id;
    await mysql.execute("INSERT INTO classes (class_name, schedule_day, schedule_time, branch_id) VALUES ('Saturday Batch A', 'Saturday', '09:00', ?)", [branchId]);
    await mysql.execute("INSERT INTO classes (class_name, schedule_day, schedule_time, branch_id) VALUES ('Saturday Batch B', 'Saturday', '11:00', ?)", [branchId]);
    const [stuRows] = await mysql.query("SELECT student_id FROM students");
    const [class1Rows] = await mysql.query("SELECT class_id FROM classes WHERE class_name = 'Saturday Batch A' LIMIT 1");
    const class1Id = (class1Rows as any[])[0]?.class_id;
    for (const s of (stuRows as any[])) {
      await mysql.execute("INSERT INTO enrollments (student_id, class_id, enrollment_date) VALUES (?, ?, '2026-01-01')", [s.student_id, class1Id]);
    }
  }

  const [lvlCountRows] = await mysql.query('SELECT COUNT(*) as count FROM levels');
  const lvlCount = (lvlCountRows as any[])[0]?.count ?? 0;
  if (lvlCount === 0) {
    const ucmasLevels = ['Basic', 'Elementary A', 'Elementary B', 'Intermediate A', 'Intermediate B', 'Higher A', 'Higher B', 'Advance'];
    for (const lvl of ucmasLevels) {
      await mysql.execute("INSERT INTO levels (level_name) VALUES (?)", [lvl]);
    }
    
    // Update existing classes with a default level
    const [flv] = await mysql.query("SELECT level_id FROM levels WHERE level_name = 'Basic' LIMIT 1");
    const firstLevel = (flv as any[])[0]?.level_id;
    await mysql.execute("UPDATE classes SET level_id = ? WHERE level_id IS NULL", [firstLevel]);
  }

  const [teacherRows] = await mysql.query('SELECT * FROM users WHERE role = "Teacher" LIMIT 1');
  if ((teacherRows as any[]).length === 0) {
    const teacherPass = await bcrypt.hash('teacher123', 10);
    const [bRow] = await mysql.query("SELECT branch_id FROM branches WHERE name = 'Cape Coast' LIMIT 1");
    const branchId = (bRow as any[])[0]?.branch_id;
    const [ins] = await mysql.execute("INSERT INTO users (username, password_hash, full_name, role, branch_id) VALUES ('tutor1', ?, 'Kwame Adjei', 'Teacher', ?)", [teacherPass, branchId]);
    const resH = ins as ResultSetHeader;
    await mysql.execute("INSERT INTO teachers (user_id, specialty, phone, branch_id) VALUES (?, 'Mental Arithmetic', '024 123 4567', ?)", [resH.insertId, branchId]);
  }

  await mysql.execute("UPDATE students SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM branches WHERE name = 'Cape Coast' LIMIT 1)) WHERE branch_id IS NULL");
  await mysql.execute("UPDATE classes SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM branches WHERE name = 'Cape Coast' LIMIT 1)) WHERE branch_id IS NULL");
  await mysql.execute("UPDATE teachers SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM users u WHERE u.user_id = teachers.user_id LIMIT 1)) WHERE branch_id IS NULL");
  await mysql.execute("UPDATE payments SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM students s WHERE s.student_id = payments.student_id LIMIT 1)) WHERE branch_id IS NULL");
  await mysql.execute("UPDATE student_attendance SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM classes c WHERE c.class_id = student_attendance.class_id LIMIT 1)) WHERE branch_id IS NULL");
  await mysql.execute("UPDATE teacher_attendance SET branch_id = COALESCE(branch_id, (SELECT branch_id FROM teachers t WHERE t.teacher_id = teacher_attendance.teacher_id LIMIT 1)) WHERE branch_id IS NULL");
}

export async function withTransaction<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  if (!pool) {
    await getDb();
  }
  const conn = await pool!.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}
