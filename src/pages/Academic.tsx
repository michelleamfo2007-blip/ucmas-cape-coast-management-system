import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Award, BookOpen, Calculator, Eye, Headphones, Save, Printer, ChevronDown, CheckCircle2, User, FileText, Download, AlertTriangle, Info } from "lucide-react";

interface Assessment {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_id: number;
  listening_score: number;
  mental_score: number;
  abacus_score: number;
  vision_score: number;
  remarks: string;
}

export default function Academic() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showReportCard, setShowReportCard] = useState<Assessment | null>(null);
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
    if (selectedClass) {
      setLoading(true);
      fetch(`/api/assessments/class/${selectedClass}?date=${date}`)
        .then(r => r.json())
        .then(data => setAssessments(data.map((d: any) => ({
          ...d,
          listening_score: d.listening_score || 0,
          mental_score: d.mental_score || 0,
          abacus_score: d.abacus_score || 0,
          vision_score: d.vision_score || 0,
          remarks: d.remarks || ''
        }))))
        .finally(() => setLoading(false));
    }
  }, [selectedClass, date]);

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

  const fetchClasses = async () => {
    const params = new URLSearchParams();
    if (user?.role === 'Admin' && selectedBranch !== 'all') params.set('branch_id', String(selectedBranch));
    if (selectedSchool !== 'all') params.set('school_id', String(selectedSchool));
    const qs = params.toString();
    const data = await fetch(`/api/classes${qs ? `?${qs}` : ''}`).then(r=>r.json());
    setClasses(data);
    setSelectedClass(data.length > 0 ? data[0].class_id : '');
  };

  useEffect(() => { if (user) fetchClasses(); }, [user, selectedBranch, selectedSchool]);

  const handleScoreChange = (enrollmentId: number, field: keyof Assessment, value: any) => {
    setAssessments(prev => prev.map(a => 
      a.enrollment_id === enrollmentId ? { ...a, [field]: value } : a
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_date: date,
          grades: assessments
        })
      });
      if (!res.ok) {
        try { const j = await res.json(); pushToast({ type: 'error', message: j.error || 'Failed to save grades' }); } catch { pushToast({ type: 'error', message: 'Failed to save grades' }); }
        return;
      }
      pushToast({ type: 'success', message: 'Grades saved' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Records</h2>
          <p className="text-sm text-slate-500 font-medium">Record and analyze UCMAS proficiency scores.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-tight hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download size={14} />
            Export Results
          </button>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg text-xs font-semibold ${t.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : t.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            {t.type === 'success' ? <CheckCircle2 size={14} /> : t.type === 'error' ? <AlertTriangle size={14} /> : <Info size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full md:w-auto">
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
            <select 
              disabled={user && user.role !== 'Admin'}
              value={String(selectedBranch)}
              onChange={(e)=> setSelectedBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none appearance-none disabled:opacity-50"
            >
              {user && user.role === 'Admin' ? (
                <>
                  <option value="all">All Branches</option>
                  {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                </>
              ) : (
                <option value={String(selectedBranch)}>My Branch</option>
              )}
            </select>
          </div>
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">School</label>
            <select 
              disabled={schools.length === 0}
              value={String(selectedSchool)}
              onChange={(e)=> setSelectedSchool(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none appearance-none disabled:opacity-50"
            >
              <option value="all">All Schools</option>
              {schools.map((s:any)=> <option key={s.school_id} value={s.school_id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assessment Date</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none"
            />
          </div>
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none appearance-none"
            >
              {classes.map(c => (
                <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || assessments.length === 0}
          className="ml-auto w-full md:w-auto px-10 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
          Save Final Grades
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Name</th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                <div className="flex flex-col items-center gap-1">
                  <Headphones size={14} className="text-blue-500" />
                  Listening
                </div>
              </th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                <div className="flex flex-col items-center gap-1">
                  <BookOpen size={14} className="text-indigo-500" />
                  Mental
                </div>
              </th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                <div className="flex flex-col items-center gap-1">
                  <Calculator size={14} className="text-orange-500" />
                  Abacus
                </div>
              </th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                <div className="flex flex-col items-center gap-1">
                  <Eye size={14} className="text-green-500" />
                  Vision
                </div>
              </th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Total</th>
              <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assessments.map((a) => {
              const total = (Number(a.listening_score) || 0) + (Number(a.mental_score) || 0) + (Number(a.abacus_score) || 0) + (Number(a.vision_score) || 0);
              return (
                <tr key={a.enrollment_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </div>
                      <div className="flex flex-col cursor-pointer hover:text-red-600" onClick={() => setShowReportCard(a)}>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{a.first_name} {a.last_name}</span>
                        <span className="text-[10px] font-medium text-slate-400 font-mono">ID: {a.student_id}</span>
                      </div>
                    </div>
                  </td>
                  {['listening_score', 'mental_score', 'abacus_score', 'vision_score'].map((field) => (
                    <td key={field} className="px-4 py-4">
                      <input 
                        type="number"
                        value={a[field as keyof Assessment] as number}
                        onChange={(e) => handleScoreChange(a.enrollment_id, field as keyof Assessment, Number(e.target.value))}
                        className="w-16 mx-auto bg-slate-50 border border-slate-100 rounded px-2 py-1 text-center text-xs font-bold text-slate-700 focus:border-red-500 outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-bold text-red-600 font-mono">{total}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                   <div className="flex items-center gap-2 justify-end">
                      <input 
                        type="text"
                        placeholder="..."
                        value={a.remarks}
                        onChange={(e) => handleScoreChange(a.enrollment_id, 'remarks', e.target.value)}
                        className="bg-transparent border-b border-slate-100 focus:border-red-500 outline-none text-[10px] text-right text-slate-500 w-32"
                      />
                      <button 
                        onClick={() => setShowReportCard(a)}
                        className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
                      >
                        <FileText size={14} />
                      </button>
                   </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Report Card Modal */}
      <AnimatePresence>
        {showReportCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-10">
                {/* School Branding */}
                <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl">U</div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 leading-tight">UCMAS GHANA</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Academic Excellence Centre</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="inline-block px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-100 mb-2">Authenticated Report</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{date}</p>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="grid grid-cols-2 gap-8 mb-12 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Student Name</p>
                    <p className="text-base font-bold text-slate-900 uppercase">{showReportCard.first_name} {showReportCard.last_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Academic Batch</p>
                    <p className="text-base font-bold text-slate-900 uppercase">{classes.find(c => c.class_id === selectedClass)?.class_name || 'N/A'}</p>
                  </div>
                </div>

                {/* Score Matrix */}
                <div className="grid grid-cols-4 gap-4 mb-12">
                  {[
                    { label: 'Listening', score: showReportCard.listening_score, icon: Headphones, color: 'blue' },
                    { label: 'Mental', score: showReportCard.mental_score, icon: BookOpen, color: 'indigo' },
                    { label: 'Abacus', score: showReportCard.abacus_score, icon: Calculator, color: 'orange' },
                    { label: 'Vision', score: showReportCard.vision_score, icon: Eye, color: 'green' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
                      <div className={`w-8 h-8 mx-auto mb-3 rounded-lg flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-500`}>
                        <stat.icon size={16} />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-xl font-mono font-bold text-slate-900 leading-none">{stat.score}</p>
                      <p className="text-[8px] text-slate-300 font-bold uppercase mt-1">/ 100</p>
                    </div>
                  ))}
                </div>

                {/* Summary & Recommendations */}
                <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden mb-12">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-red-600 rounded-tl-full opacity-20"></div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-4 max-w-[60%]">
                        <div>
                          <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-2">Teacher's Remarks</p>
                          <p className="text-xs text-slate-300 italic leading-relaxed">"{showReportCard.remarks || 'No specific remarks provided. Excellent performance overall.'}"</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Award size={14} className="text-red-200" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merit Badge Awarded</span>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Cumulative Total</p>
                         <p className="text-4xl font-bold tracking-tighter">
                            {(Number(showReportCard.listening_score) || 0) + (Number(showReportCard.mental_score) || 0) + (Number(showReportCard.abacus_score) || 0) + (Number(showReportCard.vision_score) || 0)}
                         </p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">out of 400</p>
                      </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button 
                  onClick={() => setShowReportCard(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
                  >
                    Back to List
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 btn-primary py-3 gap-3 font-sans"
                  >
                    <Printer size={16} />
                    Issue Physical Report
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
