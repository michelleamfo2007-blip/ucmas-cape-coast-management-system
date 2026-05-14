import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, Search, Filter, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, X, Mail, Calendar, UserCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  enrollment_date: string;
  status: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'all' | number>('all');
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<'all' | number>('all');
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error' | 'info'; message: string }>>([]);
  const pushToast = React.useCallback((t: { type: 'success' | 'error' | 'info'; message: string }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me').then(r=>r.json());
        setUser(me.user || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (user.role === 'Admin') {
        try {
          const b = await fetch('/api/admin/branches').then(r=>r.json());
          setBranches(b || []);
        } catch { setBranches([]); }
      } else {
        setSelectedBranch(user.branchId);
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (user.role === 'Admin') {
        if (selectedBranch === 'all') {
          try {
            const s = await fetch(`/api/admin/schools`).then(r=>r.json());
            setSchools(s || []);
            setSelectedSchool('all');
          } catch { setSchools([]); setSelectedSchool('all'); }
          return;
        }
        try {
          const s = await fetch(`/api/admin/schools?branch_id=${selectedBranch}`).then(r=>r.json());
          setSchools(s || []);
          setSelectedSchool('all');
        } catch { setSchools([]); setSelectedSchool('all'); }
      } else {
        try {
          const s = await fetch(`/api/schools`).then(r=>r.json());
          setSchools(s || []);
        } catch { setSchools([]); }
      }
    })();
  }, [user, selectedBranch]);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.role === 'Admin' && selectedBranch !== 'all') params.set('branch_id', String(selectedBranch));
      if (selectedSchool !== 'all') params.set('school_id', String(selectedSchool));
      const qs = params.toString();
      const res = await fetch(`/api/students${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchStudents();
  }, [user, selectedBranch, selectedSchool]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = currentStudent?.student_id ? 'PUT' : 'POST';
    const url = currentStudent?.student_id 
      ? `/api/students/${currentStudent.student_id}` 
      : '/api/students';

    try {
      let body: any = { ...currentStudent };
      if (method === 'POST') {
        const schoolIdToUse = selectedSchool !== 'all' ? selectedSchool : null;
        const branchIdToUse = user?.role === 'Admin' ? (selectedBranch !== 'all' ? selectedBranch : null) : user?.branchId;
        // Allow server to derive branch from school when Admin hasn't selected a branch
        body = { ...body, school_id: schoolIdToUse };
        if (branchIdToUse) body.branch_id = branchIdToUse as number;
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        try { const j = await res.json(); pushToast({ type: 'error', message: j.error || 'Failed to save student' }); } catch { pushToast({ type: 'error', message: 'Failed to save student' }); }
        return;
      }
      fetchStudents();
      setShowModal(false);
      pushToast({ type: 'success', message: currentStudent?.student_id ? 'Student updated' : 'Student created' });
    } catch (err) {
      console.error(err);
      pushToast({ type: 'error', message: 'Network error while saving student' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student profile?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        try { const j = await res.json(); pushToast({ type: 'error', message: j.error || 'Failed to delete student' }); } catch { pushToast({ type: 'error', message: 'Failed to delete student' }); }
        return;
      }
      fetchStudents();
      pushToast({ type: 'success', message: 'Student removed' });
    } catch (err) {
      console.error(err);
      pushToast({ type: 'error', message: 'Network error while deleting student' });
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Registrar</h2>
          <p className="text-sm text-slate-500 font-medium">Manage and monitor student enrollments across all batches.</p>
          {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg text-xs font-semibold ${t.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : t.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            {t.type === 'success' ? <CheckCircle2 size={14} /> : t.type === 'error' ? <AlertTriangle size={14} /> : <Info size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
        <button 
          onClick={() => { setCurrentStudent({}); setShowModal(true); }}
          className="btn-primary"
        >
          <UserPlus size={16} />
          Add New Student
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96 group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search students by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 transition-all"
          />
        </div>
        <select
          disabled={user?.role !== 'Admin'}
          value={String(selectedBranch)}
          onChange={(e)=>{
            const v = e.target.value === 'all' ? 'all' : Number(e.target.value);
            setSelectedBranch(v as any);
          }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          {user?.role === 'Admin' ? (
            <>
              <option value="all">All Branches</option>
              {branches.map((b:any)=> (
                <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
              ))}
            </>
          ) : (
            <option value={String(user?.branchId || '')}>My Branch</option>
          )}
        </select>
        <select
          disabled={schools.length === 0}
          value={String(selectedSchool)}
          onChange={(e)=>{
            const v = e.target.value === 'all' ? 'all' : Number(e.target.value);
            setSelectedSchool(v as any);
          }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <option value="all">All Schools</option>
          {schools.map((s:any)=> (
            <option key={s.school_id} value={s.school_id}>{s.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 relative">
            <Filter size={18} />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 border border-white"></div>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredStudents.length} Students found</span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50"></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium italic">No students found matching your criteria.</td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase border border-red-100">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{student.first_name} {student.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium font-mono">ID: #{String(student.student_id).padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">{student.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700">{student.enrollment_date || 'TBD'}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Batch #01-SAT</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${student.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {student.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => { setCurrentStudent(student); setShowModal(true); }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(student.student_id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page 1 of 12</p>
          <div className="flex items-center gap-1">
            <button className="p-1 border border-slate-200 rounded bg-white text-slate-400 hover:text-red-600 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
            <button className="p-1 border border-slate-200 rounded bg-white text-slate-400 hover:text-red-600"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200"
            >
              <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
                <h3 className="font-bold tracking-tight uppercase text-sm">
                  {currentStudent?.student_id ? 'Edit Profile' : 'New Enrollment'}
                </h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-white/10 p-1 rounded transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</label>
                    <input 
                      required
                      value={currentStudent?.first_name || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, first_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                    <input 
                      required
                      value={currentStudent?.last_name || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, last_name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Email</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                    <input 
                      type="email"
                      value={currentStudent?.email || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium font-mono" 
                      placeholder="parent-email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date of Birth</label>
                    <div className="relative group">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="date"
                        value={currentStudent?.date_of_birth || ''}
                        onChange={(e) => setCurrentStudent({...currentStudent, date_of_birth: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all font-medium" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment Date</label>
                    <div className="relative group">
                      <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="date"
                        value={currentStudent?.enrollment_date || ''}
                        onChange={(e) => setCurrentStudent({...currentStudent, enrollment_date: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 font-bold uppercase tracking-widest text-[#94a3b8] rounded-xl text-[10px] hover:bg-slate-50 transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary py-2.5"
                  >
                    Persist Records
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
