import dotenv from 'dotenv';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDb, withTransaction } from "./src/lib/db";

// Load environment variables from .env (project root) and fallback to CWD
dotenv.config();
if (!process.env.MYSQL_HOST && !process.env.MYSQL_USER && !process.env.MYSQL_DATABASE) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const JWT_SECRET = process.env.JWT_SECRET || "ucmas-secret-key-2026";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // --- API ROUTES ---
  app.get('/api/health', async (_req, res) => {
    try {
      const db = await getDb();
      const row = await db.get('SELECT 1 as ok');
      res.json({ ok: true, db: row?.ok === 1 });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  

  

  

  // Minimal env diagnostics (does not expose secrets)
  app.get('/api/health/env', (_req, res) => {
    res.json({
      mysql: {
        host: process.env.MYSQL_HOST || null,
        user: process.env.MYSQL_USER || null,
        database: process.env.MYSQL_DATABASE || null,
        hasPassword: !!(process.env.MYSQL_PASSWORD && process.env.MYSQL_PASSWORD.trim() !== '')
      },
      nodeEnv: process.env.NODE_ENV || 'development'
    });
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body; // 'username' may be an email too
    const identifier = String(username || '').trim();
    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1", [identifier, identifier]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role, branchId: user.branch_id ?? null },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 });
    res.json({ user: { id: user.user_id, username: user.username, role: user.role, branchId: user.branch_id ?? null } });
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  // Middleare to check Auth
  const authenticate = (roles: string[] = []) => {
    return (req: any, res: any, next: any) => {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded; // { userId, username, role, branchId }
        
        if (roles.length > 0 && !roles.includes(decoded.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        next();
      } catch (err) {
        res.status(401).json({ error: "Invalid token" });
      }
    };
  };

  const isAdmin = (req: any) => req.user?.role === 'Admin';
  const branchScopeClause = (alias: string, req: any) => {
    if (isAdmin(req)) {
      const q = (req.query?.branch_id ?? req.body?.branch_id);
      if (q) return { sql: ` AND ${alias}.branch_id = ? `, params: [q] };
      return { sql: '', params: [] };
    }
    return { sql: ` AND ${alias}.branch_id = ? `, params: [req.user.branchId] };
  };

  // --- ADMIN: SCHOOLS UNDER BRANCHES ---
  app.get('/api/admin/schools', authenticate(['Admin']), async (req: any, res) => {
    try {
      const db = await getDb();
      const branchId = req.query?.branch_id;
      const rows = await db.all(
        `SELECT * FROM schools ${branchId ? 'WHERE branch_id = ?' : ''} ORDER BY name ASC`,
        branchId ? [branchId] : []
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to load schools' });
    }
  });

  app.post('/api/admin/schools', authenticate(['Admin']), async (req: any, res) => {
    try {
      const { name, branch_id, contact_phone, contact_email } = req.body || {};
      if (!name || !branch_id) return res.status(400).json({ error: 'name and branch_id are required' });
      const db = await getDb();
      const result = await db.run(
        'INSERT INTO schools (name, branch_id, contact_phone, contact_email) VALUES (?, ?, ?, ?)',
        [name, branch_id, contact_phone || null, contact_email || null]
      );
      res.status(201).json({ school_id: result.lastID, name, branch_id });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'School with this name already exists for the branch' });
      }
      res.status(500).json({ error: 'Failed to create school' });
    }
  });

  app.put('/api/admin/schools/:id', authenticate(['Admin']), async (req: any, res) => {
    const { name, branch_id, contact_phone, contact_email } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const db = await getDb();
    try {
      if (branch_id) {
        const br = await db.get('SELECT 1 FROM branches WHERE branch_id = ? LIMIT 1', [branch_id]);
        if (!br) return res.status(400).json({ error: 'Invalid branch_id' });
      }
      await db.run(
        'UPDATE schools SET name = ?, branch_id = COALESCE(?, branch_id), contact_phone = ?, contact_email = ? WHERE school_id = ?',
        [name, branch_id ?? null, contact_phone || null, contact_email || null, req.params.id]
      );
      res.json({ school_id: Number(req.params.id), name, branch_id: branch_id ?? undefined });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'School with this name already exists for the branch' });
      }
      res.status(500).json({ error: 'Failed to update school' });
    }
  });

  app.delete('/api/admin/schools/:id', authenticate(['Admin']), async (req: any, res) => {
    const db = await getDb();
    // refuse delete if related students or classes exist
    const checks = await Promise.all([
      db.get('SELECT 1 FROM students WHERE school_id = ? LIMIT 1', [req.params.id]),
      db.get('SELECT 1 FROM classes WHERE school_id = ? LIMIT 1', [req.params.id]),
    ]);
    if (checks.some(Boolean)) return res.status(409).json({ error: 'Cannot delete school with existing related records' });
    await db.run('DELETE FROM schools WHERE school_id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  });

  // --- ADMIN: DATA REASSIGNMENT TOOL ---
  app.post('/api/admin/data/reassign-branch-to-school', authenticate(['Admin']), async (req: any, res) => {
    const { from_branch_id, to_branch_id, school_id, dry_run } = req.body || {};
    if (!from_branch_id || !to_branch_id || !school_id) {
      return res.status(400).json({ error: 'from_branch_id, to_branch_id and school_id are required' });
    }
    const db = await getDb();
    const school = await db.get('SELECT branch_id FROM schools WHERE school_id = ?', [school_id]);
    if (!school) return res.status(400).json({ error: 'Invalid school_id' });
    if (Number(school.branch_id) !== Number(to_branch_id)) {
      return res.status(400).json({ error: 'school_id does not belong to to_branch_id' });
    }

    const studentRows = await db.all('SELECT student_id FROM students WHERE branch_id = ?', [from_branch_id]);
    const classRows = await db.all('SELECT class_id FROM classes WHERE branch_id = ?', [from_branch_id]);
    const studentIds = studentRows.map((r: any) => r.student_id);
    const classIds = classRows.map((r: any) => r.class_id);

    let paymentsCount = 0;
    let studAttCount = 0;
    if (studentIds.length > 0) {
      const row = await db.get(`SELECT COUNT(*) as c FROM payments WHERE student_id IN (${studentIds.map(()=>'?').join(',')})`, studentIds);
      paymentsCount = Number((row as any)?.c || 0);
    }
    if (classIds.length > 0) {
      const row2 = await db.get(`SELECT COUNT(*) as c FROM student_attendance WHERE class_id IN (${classIds.map(()=>'?').join(',')})`, classIds);
      studAttCount = Number((row2 as any)?.c || 0);
    }

    if (dry_run) {
      return res.json({
        from_branch_id: Number(from_branch_id),
        to_branch_id: Number(to_branch_id),
        school_id: Number(school_id),
        students_to_move: studentIds.length,
        classes_to_move: classIds.length,
        payments_to_update: paymentsCount,
        student_attendance_to_update: studAttCount,
      });
    }

    try {
      await db.run('START TRANSACTION');
      await db.run('UPDATE students SET branch_id = ?, school_id = ? WHERE branch_id = ?', [to_branch_id, school_id, from_branch_id]);
      await db.run('UPDATE classes SET branch_id = ?, school_id = ? WHERE branch_id = ?', [to_branch_id, school_id, from_branch_id]);
      if (studentIds.length > 0) {
        await db.run(`UPDATE payments SET branch_id = ? WHERE student_id IN (${studentIds.map(()=>'?').join(',')})`, [to_branch_id, ...studentIds]);
      }
      if (classIds.length > 0) {
        await db.run(`UPDATE student_attendance SET branch_id = ? WHERE class_id IN (${classIds.map(()=>'?').join(',')})`, [to_branch_id, ...classIds]);
      }
      await db.run('COMMIT');
      res.json({
        moved_students: studentIds.length,
        moved_classes: classIds.length,
        updated_payments: paymentsCount,
        updated_student_attendance: studAttCount,
      });
    } catch (e) {
      try { await db.run('ROLLBACK'); } catch {}
      res.status(500).json({ error: 'Reassignment failed' });
    }
  });

  app.get('/api/auth/me', authenticate(), async (req: any, res) => {
    res.json({ user: req.user });
  });

  // Student CRUD
  app.get("/api/students", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('students', req);
    const schoolId = req.query?.school_id as any;
    const students = await db.all(
      `SELECT * FROM students WHERE 1=1 ${scope.sql} ${schoolId ? 'AND students.school_id = ?' : ''} ORDER BY student_id DESC`,
      schoolId ? [...scope.params, schoolId] : scope.params
    );
    res.json(students);
  });

  app.post("/api/students", authenticate(['Admin', 'Manager']), async (req: any, res) => {
    const { first_name, last_name, email, date_of_birth, enrollment_date, school_id } = req.body;
    const db = await getDb();
    let branchId = isAdmin(req) ? req.body.branch_id : req.user.branchId;
    if (school_id) {
      const sch = await db.get('SELECT branch_id FROM schools WHERE school_id = ?', [school_id]);
      if (!sch) return res.status(400).json({ error: 'Invalid school_id' });
      if (!isAdmin(req) && Number(sch.branch_id) !== Number(req.user.branchId)) return res.status(403).json({ error: 'Forbidden' });
      if (!branchId) branchId = sch.branch_id; // derive from school if admin omitted branch
      if (Number(branchId) !== Number(sch.branch_id)) return res.status(400).json({ error: 'branch_id does not match school branch' });
    }
    if (!branchId) return res.status(400).json({ error: 'branch_id is required' });
    const result = await db.run(
      "INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, branch_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [first_name, last_name, email, date_of_birth, enrollment_date, branchId, school_id ?? null]
    );
    res.json({ id: result.lastID });
  });

  app.put("/api/students/:id", authenticate(['Admin', 'Manager']), async (req: any, res) => {
    const { first_name, last_name, email, date_of_birth, status } = req.body;
    const db = await getDb();
    if (isAdmin(req)) {
      await db.run(
        "UPDATE students SET first_name = ?, last_name = ?, email = ?, date_of_birth = ?, status = ? WHERE student_id = ?",
        [first_name, last_name, email, date_of_birth, status, req.params.id]
      );
    } else {
      await db.run(
        "UPDATE students SET first_name = ?, last_name = ?, email = ?, date_of_birth = ?, status = ? WHERE student_id = ? AND branch_id = ?",
        [first_name, last_name, email, date_of_birth, status, req.params.id, req.user.branchId]
      );
    }
    res.json({ message: "Updated" });
  });

  app.delete("/api/students/:id", authenticate(['Admin']), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('students', req);
    await db.run(`DELETE FROM students WHERE student_id = ? ${scope.sql ? 'AND' + scope.sql.replace(' AND ', ' ') : ''}`, [req.params.id, ...scope.params]);
    res.json({ message: "Deleted" });
  });

  // Teacher Management
  app.get("/api/teachers", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('u', req); // users alias
    const teachers = await db.all(`
      SELECT u.user_id, u.username, u.full_name, t.specialty, t.phone 
      FROM users u 
      JOIN teachers t ON u.user_id = t.user_id 
      WHERE u.role = 'Teacher' ${scope.sql}
    `, scope.params);
    res.json(teachers);
  });

  // Classes
  app.get("/api/classes", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('classes', req);
    const schoolId = req.query?.school_id as any;
    const classes = await db.all(
      `SELECT * FROM classes WHERE 1=1 ${scope.sql} ${schoolId ? 'AND classes.school_id = ?' : ''} ORDER BY class_id DESC`,
      schoolId ? [...scope.params, schoolId] : scope.params
    );
    res.json(classes);
  });

  app.post("/api/classes", authenticate(['Admin', 'Manager']), async (req: any, res) => {
    const { class_name, level_id, schedule_day, schedule_time, branch_id, school_id } = req.body || {};
    const db = await getDb();
    let effectiveBranchId = isAdmin(req) ? (branch_id ?? null) : req.user.branchId;
    if (school_id) {
      const sch = await db.get('SELECT branch_id FROM schools WHERE school_id = ?', [school_id]);
      if (!sch) return res.status(400).json({ error: 'Invalid school_id' });
      if (!isAdmin(req) && Number(sch.branch_id) !== Number(req.user.branchId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!effectiveBranchId) effectiveBranchId = sch.branch_id;
      if (Number(effectiveBranchId) !== Number(sch.branch_id)) return res.status(400).json({ error: 'branch_id does not match school branch' });
    }
    if (!class_name) return res.status(400).json({ error: 'class_name is required' });
    if (!effectiveBranchId) return res.status(400).json({ error: 'branch_id is required' });
    if (!isAdmin(req) && branch_id && Number(branch_id) !== Number(req.user.branchId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await db.run(
      `INSERT INTO classes (class_name, level_id, schedule_day, schedule_time, branch_id, school_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [class_name, level_id ?? null, schedule_day ?? null, schedule_time ?? null, effectiveBranchId, school_id ?? null]
    );
    res.status(201).json({ class_id: result.lastID });
  });

  app.get('/api/levels', authenticate(), async (_req: any, res) => {
    const db = await getDb();
    const levels = await db.all('SELECT level_id, level_name FROM levels ORDER BY level_name ASC');
    res.json(levels);
  });

  app.get('/api/schools', authenticate(), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('s', req);
    const rows = await db.all(`SELECT s.* FROM schools s WHERE 1=1 ${scope.sql} ORDER BY s.name ASC`, scope.params);
    res.json(rows);
  });

  // Student Attendance
  app.get("/api/attendance/students", authenticate(), async (req: any, res) => {
    const { date, class_id } = req.query as any;
    const db = await getDb();
    const scope = branchScopeClause('c', req);
    const students = await db.all(`
      SELECT s.student_id, s.first_name, s.last_name, a.status, a.remarks
      FROM students s
      JOIN enrollments e ON s.student_id = e.student_id
      JOIN classes c ON e.class_id = c.class_id
      LEFT JOIN student_attendance a ON s.student_id = a.student_id AND a.date = ? AND a.class_id = ?
      WHERE e.class_id = ? ${scope.sql}
    `, [date, class_id, class_id, ...scope.params]);
    res.json(students);
  });

  app.post("/api/attendance/students", authenticate(['Admin', 'Manager', 'Teacher']), async (req: any, res) => {
    const { date, class_id, attendance } = req.body; // attendance is array of { student_id, status, remarks }
    const db = await getDb();
    const owning = await db.get(`SELECT branch_id FROM classes WHERE class_id = ?`, [class_id]);
    if (!owning) return res.status(400).json({ error: 'Invalid class_id' });
    if (!isAdmin(req) && owning.branch_id !== req.user.branchId) return res.status(403).json({ error: 'Forbidden' });
    const branchId = owning.branch_id;

    try {
      await withTransaction(async (conn) => {
        for (const record of attendance) {
          await conn.execute(
            "DELETE FROM student_attendance WHERE student_id = ? AND class_id = ? AND date = ?",
            [record.student_id, class_id, date]
          );
          await conn.execute(
            "INSERT INTO student_attendance (student_id, class_id, date, status, remarks, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
            [record.student_id, class_id, date, record.status, record.remarks, branchId]
          );
        }
      });
      res.json({ message: "Attendance saved" });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // Teacher Attendance
  app.get("/api/attendance/teachers", authenticate(), async (req: any, res) => {
    const { date } = req.query as any;
    const db = await getDb();
    const scope = branchScopeClause('t', req);
    const teachers = await db.all(`
      SELECT t.teacher_id, u.full_name, a.status, a.remarks
      FROM teachers t
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN teacher_attendance a ON t.teacher_id = a.teacher_id AND a.date = ?
      WHERE 1=1 ${scope.sql}
    `, [date, ...scope.params]);
    res.json(teachers);
  });

  app.post("/api/attendance/teachers", authenticate(['Admin', 'Manager']), async (req: any, res) => {
    const { date, attendance } = req.body; 
    const db = await getDb();
    try {
      await withTransaction(async (conn) => {
        for (const record of attendance) {
          const t = await db.get(`SELECT branch_id FROM teachers WHERE teacher_id = ?`, [record.teacher_id]);
          if (!t) continue;
          if (!isAdmin(req) && t.branch_id !== req.user.branchId) {
            throw new Error('FORBIDDEN');
          }
          await conn.execute("DELETE FROM teacher_attendance WHERE teacher_id = ? AND date = ?", [record.teacher_id, date]);
          await conn.execute(
            "INSERT INTO teacher_attendance (teacher_id, date, status, remarks, branch_id) VALUES (?, ?, ?, ?, ?)",
            [record.teacher_id, date, record.status, record.remarks, t.branch_id]
          );
        }
      });
      res.json({ message: "Teacher attendance saved" });
    } catch (e: any) {
      if (e && e.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      res.status(500).json({ error: 'Failed to save teacher attendance' });
    }
  });

  // Reports
  app.get("/api/reports/attendance/summary", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const scope = branchScopeClause('student_attendance', req);
    const stats = await db.all(`
      SELECT date, status, COUNT(*) as count 
      FROM student_attendance 
      WHERE 1=1 ${scope.sql}
      GROUP BY date, status 
      ORDER BY date DESC LIMIT 30
    `, scope.params);
    res.json(stats);
  });

  // Payments
  app.get("/api/payments/student/:student_id", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const student = await db.get(`SELECT branch_id FROM students WHERE student_id = ?`, [req.params.student_id]);
    if (!student) return res.json([]);
    if (!isAdmin(req) && student.branch_id !== req.user.branchId) return res.status(403).json({ error: 'Forbidden' });
    const payments = await db.all(`
      SELECT p.*, u.full_name as receiver
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.user_id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `, [req.params.student_id]);
    res.json(payments);
  });

  app.post("/api/payments", authenticate(['Admin', 'Manager']), async (req: any, res) => {
    const { student_id, amount, payment_type, payment_method, payment_date } = req.body;
    const db = await getDb();
    const stu = await db.get(`SELECT branch_id FROM students WHERE student_id = ?`, [student_id]);
    if (!stu) return res.status(400).json({ error: 'Invalid student_id' });
    if (!isAdmin(req) && stu.branch_id !== req.user.branchId) return res.status(403).json({ error: 'Forbidden' });
    const receipt_number = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const received_by = (req as any).user.userId;
    const result = await db.run(`
      INSERT INTO payments (student_id, amount, payment_date, payment_type, payment_method, receipt_number, received_by, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, amount, payment_date, payment_type, payment_method, receipt_number, received_by, stu.branch_id]);
    res.json({ id: result.lastID, receipt_number });
  });

  app.get("/api/payments/receipt/:id", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const payment = await db.get(`
      SELECT p.*, s.first_name, s.last_name, u.full_name as receiver
      FROM payments p
      JOIN students s ON p.student_id = s.student_id
      LEFT JOIN users u ON p.received_by = u.user_id
      WHERE p.payment_id = ?
    `, [req.params.id]);
    if (!payment) return res.status(404).json({ error: "Receipt not found" });
    if (req.user.role !== 'Admin' && payment.branch_id !== req.user.branchId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(payment);
  });

  // Academic Assessments
  app.get("/api/assessments/class/:class_id", authenticate(), async (req: any, res) => {
    const { date } = req.query as any;
    const db = await getDb();
    const cls = await db.get(`SELECT branch_id FROM classes WHERE class_id = ?`, [req.params.class_id]);
    if (!cls) return res.json([]);
    if (!isAdmin(req) && cls.branch_id !== req.user.branchId) return res.status(403).json({ error: 'Forbidden' });
    const students = await db.all(`
      SELECT s.student_id, s.first_name, s.last_name, e.enrollment_id, a.assessment_id, 
             a.listening_score, a.mental_score, a.abacus_score, a.vision_score, a.remarks
      FROM students s
      JOIN enrollments e ON s.student_id = e.student_id
      LEFT JOIN assessments a ON e.enrollment_id = a.enrollment_id AND a.assessment_date = ?
      WHERE e.class_id = ?
    `, [date, req.params.class_id]);
    res.json(students);
  });

  app.post("/api/assessments", authenticate(['Admin', 'Manager', 'Teacher']), async (req: any, res) => {
    const { assessment_date, grades } = req.body; // grades: array of { enrollment_id, scores }
    const db = await getDb();
    try {
      await withTransaction(async (conn) => {
        for (const record of grades) {
          const row = await db.get(`SELECT c.branch_id FROM enrollments e JOIN classes c ON e.class_id = c.class_id WHERE e.enrollment_id = ?`, [record.enrollment_id]);
          if (!row) continue;
          if (!isAdmin(req) && row.branch_id !== req.user.branchId) {
            throw new Error('FORBIDDEN');
          }
          const total = (record.listening_score || 0) + (record.mental_score || 0) + (record.abacus_score || 0) + (record.vision_score || 0);
          await conn.execute("DELETE FROM assessments WHERE enrollment_id = ? AND assessment_date = ?", [record.enrollment_id, assessment_date]);
          await conn.execute(
            "INSERT INTO assessments (enrollment_id, assessment_date, listening_score, mental_score, abacus_score, vision_score, total_score, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [record.enrollment_id, assessment_date, record.listening_score, record.mental_score, record.abacus_score, record.vision_score, total, record.remarks]
          );
        }
      });
      res.json({ message: "Grades recorded successfully" });
    } catch (e: any) {
      if (e && e.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      res.status(500).json({ error: 'Failed to save grades' });
    }
  });

  app.get("/api/report-card/:student_id", authenticate(), async (req: any, res) => {
    const db = await getDb();
    const student = await db.get(`SELECT branch_id FROM students WHERE student_id = ?`, [req.params.student_id]);
    if (!student) return res.json([]);
    if (req.user.role !== 'Admin' && student.branch_id !== req.user.branchId) return res.status(403).json({ error: 'Forbidden' });
    const reports = await db.all(`
      SELECT a.*, c.class_name, l.level_name
      FROM assessments a
      JOIN enrollments e ON a.enrollment_id = e.enrollment_id
      JOIN classes c ON e.class_id = c.class_id
      JOIN levels l ON c.level_id = l.level_id
      WHERE e.student_id = ?
      ORDER BY a.assessment_date DESC
    `, [req.params.student_id]);
    
    res.json(reports);
  });

  // --- ADMIN: BRANCH METRICS ---
  app.get('/api/admin/branches', authenticate(['Admin']), async (_req, res) => {
    const db = await getDb();
    const branches = await db.all('SELECT * FROM branches ORDER BY name ASC');
    res.json(branches);
  });

  app.post('/api/admin/account/identifier', authenticate(['Admin']), async (req: any, res) => {
    const { username, email } = req.body || {};
    if (!username && !email) return res.status(400).json({ error: 'username or email required' });
    const db = await getDb();
    try {
      if (username) {
        await db.run('UPDATE users SET username = ? WHERE user_id = ?', [username, req.user.userId]);
      }
      if (email) {
        await db.run('UPDATE users SET email = ? WHERE user_id = ?', [email, req.user.userId]);
      }
      res.json({ message: 'Updated' });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      res.status(500).json({ error: 'Failed to update identifier' });
    }
  });

  app.post('/api/admin/branches', authenticate(['Admin']), async (req: any, res) => {
    const { name, location, contact_phone, contact_email } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const db = await getDb();
    try {
      const result = await db.run(
        'INSERT INTO branches (name, location, contact_phone, contact_email) VALUES (?, ?, ?, ?)',
        [name, location || null, contact_phone || null, contact_email || null]
      );
      res.status(201).json({ branch_id: result.lastID, name, location: location || null, contact_phone: contact_phone || null, contact_email: contact_email || null });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'Branch name already exists' });
      }
      res.status(500).json({ error: 'Failed to create branch' });
    }
  });

  // Safe delete branch: refuse if dependent data exists
  app.delete('/api/admin/branches/:id', authenticate(['Admin']), async (req: any, res) => {
    const branchId = Number(req.params.id);
    const db = await getDb();
    const checks = await Promise.all([
      db.get('SELECT 1 FROM schools WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM users WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM students WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM teachers WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM classes WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM payments WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM student_attendance WHERE branch_id = ? LIMIT 1', [branchId]),
      db.get('SELECT 1 FROM teacher_attendance WHERE branch_id = ? LIMIT 1', [branchId]),
    ]);
    if (checks.some(Boolean)) {
      return res.status(409).json({ error: 'Cannot delete branch with existing related records' });
    }
    await db.run('DELETE FROM branches WHERE branch_id = ?', [branchId]);
    res.json({ message: 'Deleted' });
  });

  // ADMIN: Create user (Manager/Teacher) with hashed password and branch assignment
  app.post('/api/admin/users', authenticate(['Admin']), async (req: any, res) => {
    const { username, email, password, full_name, role, branch_id, specialty, phone } = req.body || {};
    if (!username || !password || !role) return res.status(400).json({ error: 'username, password, and role are required' });
    if (!['Manager', 'Teacher'].includes(role)) return res.status(400).json({ error: 'role must be Manager or Teacher' });
    if (!branch_id) return res.status(400).json({ error: 'branch_id is required for Manager/Teacher' });

    try {
      const db = await getDb();
      const hash = await bcrypt.hash(password, 10);
      const ins = await db.run(
        'INSERT INTO users (username, email, password_hash, full_name, role, branch_id) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email || null, hash, full_name || null, role, branch_id]
      );
      const userId = ins.lastID;
      if (role === 'Teacher') {
        await db.run(
          'INSERT INTO teachers (user_id, specialty, phone, branch_id) VALUES (?, ?, ?, ?)',
          [userId, specialty || null, phone || null, branch_id]
        );
      }
      res.status(201).json({ user_id: userId, username, role, branch_id });
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.toLowerCase().includes('duplicate')) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.get('/api/admin/branches/summary', authenticate(['Admin']), async (_req, res) => {
    const db = await getDb();
    const rows = await db.all(`
      SELECT 
        b.branch_id,
        b.name,
        IFNULL((SELECT COUNT(*) FROM students s WHERE s.branch_id = b.branch_id), 0) AS students_count,
        IFNULL((SELECT COUNT(*) FROM teachers t WHERE t.branch_id = b.branch_id), 0) AS teachers_count,
        IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.branch_id = b.branch_id), 0) AS revenue_total,
        IFNULL((SELECT SUM(p.amount) FROM payments p WHERE p.branch_id = b.branch_id AND p.payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) AS revenue_30d,
        (
          SELECT ROUND(AVG(a.total_score), 2) 
          FROM assessments a
          JOIN enrollments e ON a.enrollment_id = e.enrollment_id
          JOIN classes c ON e.class_id = c.class_id
          WHERE c.branch_id = b.branch_id AND a.assessment_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        ) AS avg_score_90d,
        (
          SELECT ROUND(100.0 * SUM(CASE WHEN ta.status='Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2)
          FROM teacher_attendance ta
          WHERE ta.branch_id = b.branch_id AND ta.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) AS teacher_attendance_rate_30d
      FROM branches b
      ORDER BY b.name ASC
    `);
    const overall = await db.get(`
      SELECT 
        IFNULL(SUM(amount),0) as revenue_total,
        IFNULL(SUM(CASE WHEN payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN amount ELSE 0 END),0) as revenue_30d
      FROM payments
    `);
    res.json({ branches: rows, overall });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
