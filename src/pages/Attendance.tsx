import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Save, Download, Filter, Users, UserCheck, Info } from "lucide-react";

type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | 'Late';

interface AttendanceRecord {
  student_id?: number;
  teacher_id?: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  status: AttendanceStatus | null;
  remarks: string;
}

export default function Attendance() {
  const [activeTab, setActiveTab ] = useState<'students' | 'teachers'>('students');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        try { const b = await fetch('/api/admin/branches').then(r=>r.json()); setBranches(b||[]); } catch { setBranches([]); }
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
          try { const s = await fetch('/api/admin/schools').then(r=>r.json()); setSchools(s||[]); setSelectedSchool('all'); } catch { setSchools([]); setSelectedSchool('all'); }
        } else {
          try { const s = await fetch(`/api/admin/schools?branch_id=${selectedBranch}`).then(r=>r.json()); setSchools(s||[]); setSelectedSchool('all'); } catch { setSchools([]); setSelectedSchool('all'); }
        }
      } else {
        try { const s = await fetch('/api/schools').then(r=>r.json()); setSchools(s||[]); } catch { setSchools([]); }
      }
    })();
  }, [user, selectedBranch]);

  useEffect(() => {
    if (activeTab === 'students' && selectedClass) {
      fetchStudentAttendance();
    } else if (activeTab === 'teachers') {
      fetchTeacherAttendance();
    }
  }, [date, selectedClass, activeTab]);

  const fetchClasses = async () => {
    const params = new URLSearchParams();
    if (user?.role === 'Admin' && selectedBranch !== 'all') params.set('branch_id', String(selectedBranch));
    if (selectedSchool !== 'all') params.set('school_id', String(selectedSchool));
    const qs = params.toString();
    const res = await fetch(`/api/classes${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    setClasses(data);
    if (data.length > 0) setSelectedClass(data[0].class_id);
  };

  useEffect(() => { fetchClasses(); }, [user, selectedBranch, selectedSchool]);

  const fetchStudentAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/students?date=${date}&class_id=${selectedClass}`);
      const data = await res.json();
      setRecords(data.map((r: any) => ({
        ...r,
        status: r.status || null,
        remarks: r.remarks || ''
      })));
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (user?.role === 'Admin' && selectedBranch !== 'all') {
        params.set('branch_id', String(selectedBranch));
      }
      const res = await fetch(`/api/attendance/teachers?${params.toString()}`);
      const data = await res.json();
      setRecords(data.map((r: any) => ({
        ...r,
        status: r.status || null,
        remarks: r.remarks || ''
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: number, status: AttendanceStatus) => {
    setRecords(records.map(r => {
      const rId = activeTab === 'students' ? r.student_id : r.teacher_id;
      if (rId === id) return { ...r, status };
      return r;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const endpoint = activeTab === 'students' ? '/api/attendance/students' : '/api/attendance/teachers';
    const payload = activeTab === 'students' 
      ? { date, class_id: selectedClass, attendance: records.filter(r => r.status) }
      : { date, attendance: records.filter(r => r.status) };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        try { const j = await res.json(); pushToast({ type: 'error', message: j.error || 'Failed to save attendance' }); } catch { pushToast({ type: 'error', message: 'Failed to save attendance' }); }
        return;
      }
      pushToast({ type: 'success', message: 'Attendance saved' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Tracking</h2>
          <p className="text-sm text-slate-500 font-medium">Mark presence and track tardiness for the center.</p>
          {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg text-xs font-semibold ${t.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : t.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            {t.type === 'success' ? <CheckCircle2 size={14} /> : t.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'students' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Students
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'teachers' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Teachers
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="space-y-2 w-full md:w-48">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Session Date</label>
          <div className="relative group">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none"
            />
          </div>
        </div>

        {activeTab === 'students' && (
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Batch/Class</label>
            <div className="relative group">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none appearance-none"
              >
                <option value="">Choose a class...</option>
                {classes.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 ml-auto w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-tight hover:bg-slate-50 transition-all">
            <Download size={14} />
            Export CSV
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || (activeTab === 'students' && !selectedClass)}
            className="flex-1 md:flex-none btn-primary px-8 py-2 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={14} />}
            Save Attendance
          </button>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Personnel...</p>
          </div>
        ) : (activeTab === 'students' && !selectedClass) ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
              <Users size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No batch selected</p>
              <p className="text-xs text-slate-400">Please select a class session to view student list.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => {
                const id = activeTab === 'students' ? record.student_id : record.teacher_id;
                const name = activeTab === 'students' ? `${record.first_name} ${record.last_name}` : record.full_name;
                
                return (
                  <tr key={id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs">
                          <UserCheck size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {[
                          { val: 'Present', icon: CheckCircle2, color: 'green' },
                          { val: 'Absent', icon: XCircle, color: 'red' },
                          { val: activeTab === 'students' ? 'Excused' : 'Late', icon: AlertCircle, color: 'amber' },
                        ].map((btn) => (
                          <button
                            key={btn.val}
                            onClick={() => handleStatusChange(id!, btn.val as AttendanceStatus)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${record.status === btn.val ? `bg-${btn.color}-50 border-${btn.color}-200 text-${btn.color}-700 ring-2 ring-${btn.color}-100` : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                          >
                            <btn.icon size={14} />
                            {btn.val}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <input 
                        type="text"
                        placeholder="Add optional note..."
                        value={record.remarks}
                        onChange={(e) => {
                          const newRecords = [...records];
                          const idx = newRecords.findIndex(r => (activeTab === 'students' ? r.student_id : r.teacher_id) === id);
                          newRecords[idx].remarks = e.target.value;
                          setRecords(newRecords);
                        }}
                        className="w-full max-w-[200px] bg-transparent border-b border-slate-100 focus:border-red-500 outline-none text-[11px] py-1 text-slate-600 placeholder:text-slate-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Simple Report/Legend Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-600 p-6 rounded-2xl text-white shadow-xl">
          <h4 className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-4">Summary Stats</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs">Marked Today</span>
              <span className="text-sm font-bold">{records.filter(r => r.status).length} / {records.length}</span>
            </div>
            <div className="w-full h-1 bg-red-400 rounded-full">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500" 
                style={{ width: `${(records.filter(r => r.status).length / (records.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Legend & Tips</p>
          <div className="flex flex-wrap gap-6 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Present: Students physically in the classroom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Absent: Unexcused absence from session</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Excused: Authorized leave or sickness</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
