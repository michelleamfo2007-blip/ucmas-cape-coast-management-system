import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, History, Printer, Save, Search, User, DollarSign, X, CheckCircle2, QrCode, AlertTriangle, Info } from "lucide-react";

interface Payment {
  payment_id: number;
  amount: number;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  receipt_number: string;
  receiver: string;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
}

export default function Payments() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | ''>('');
  const [history, setHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'all' | number>('all');
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<'all' | number>('all');
  
  // New Payment Form
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Tuition');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  
  // Receipt View
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);

  // Toasts
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

  const fetchStudents = async () => {
    const params = new URLSearchParams();
    if (user?.role === 'Admin' && selectedBranch !== 'all') params.set('branch_id', String(selectedBranch));
    if (selectedSchool !== 'all') params.set('school_id', String(selectedSchool));
    const qs = params.toString();
    const data = await fetch(`/api/students${qs ? `?${qs}` : ''}`).then(r=>r.json());
    setStudents(data || []);
  };

  useEffect(() => {
    if (!user) return;
    setSelectedStudent('');
    setHistory([]);
    fetchStudents();
  }, [user, selectedBranch, selectedSchool]);

  useEffect(() => {
    if (selectedStudent) {
      setLoadingHistory(true);
      fetch(`/api/payments/student/${selectedStudent}`)
        .then(r => r.json())
        .then(setHistory)
        .finally(() => setLoadingHistory(false));
    } else {
      setHistory([]);
    }
  }, [selectedStudent]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent,
          amount: Number(amount),
          payment_type: type,
          payment_method: method,
          payment_date: date
        })
      });
      if (!res.ok) {
        try { const j = await res.json(); pushToast({ type: 'error', message: j.error || 'Failed to record payment' }); } catch { pushToast({ type: 'error', message: 'Failed to record payment' }); }
        return;
      }
      const data = await res.json();
      
      // Fetch history again
      const histRes = await fetch(`/api/payments/student/${selectedStudent}`);
      const histData = await histRes.json();
      setHistory(histData);
      
      // Show receipt for the new payment
      setShowReceipt(histData[0]);
      pushToast({ type: 'success', message: 'Payment recorded' });
      
      // Reset form
      setAmount('');
    } finally {
      setSaving(false);
    }
  };

  const currentStudentData = students.find(s => s.student_id === selectedStudent);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Treasury</h2>
          <p className="text-sm text-slate-500 font-medium">Record fees and generate official tax-compliant receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3">
            <DollarSign size={16} className="text-green-600" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global Revenue</p>
              <p className="text-sm font-bold text-slate-800">GH₵ 12,450.00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recording Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <CreditCard size={16} className="text-red-600" />
              Collect Fees
            </h3>
            
            <form onSubmit={handleRecordPayment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                  <select 
                    disabled={user && user.role !== 'Admin'}
                    value={String(selectedBranch)}
                    onChange={(e)=> setSelectedBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
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
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">School</label>
                  <select 
                    disabled={schools.length === 0}
                    value={String(selectedSchool)}
                    onChange={(e)=> setSelectedSchool(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
                  >
                    <option value="all">All Schools</option>
                    {schools.map((s:any)=> <option key={s.school_id} value={s.school_id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Student</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(Number(e.target.value) || '')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none appearance-none"
                  >
                    <option value="">Search for student...</option>
                    {students.map(s => (
                      <option key={s.student_id} value={s.student_id}>{s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (GH₵)</label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold select-none text-sm">₵</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  >
                    {['Registration', 'Tuition', 'Textbook', 'Abacus', 'Competition'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Method</label>
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
                  >
                    {['Cash', 'Mobile Money', 'Bank Transfer'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>

              <button 
                type="submit"
                disabled={saving || !selectedStudent}
                className="w-full btn-primary py-4"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                Record & Print Receipt
              </button>
            </form>
          </div>
        </div>

        {/* Right: History View */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white flex-1 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <History size={16} className="text-slate-400" />
                Payment Ledger
              </h3>
              {selectedStudent && (
                <span className="text-[10px] font-bold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                  Current: {currentStudentData?.first_name} {currentStudentData?.last_name}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {!selectedStudent ? (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40">
                  <Search size={48} className="mb-4" />
                  <p className="text-sm font-bold uppercase">No Student Selected</p>
                  <p className="text-xs">Select a student from the form on the left to view their payment records.</p>
                </div>
              ) : loadingHistory ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center text-slate-400 italic">
                  <p className="text-sm uppercase font-bold mb-1">Clean Slate</p>
                  <p className="text-xs font-medium">This student has no archived payments yet.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((p) => (
                      <tr key={p.payment_id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">{p.payment_date}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded border border-red-100 uppercase tracking-tighter">
                            {p.payment_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.payment_method}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900 font-mono">GH₵ {p.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setShowReceipt(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          >
                            <Printer size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Receipt Visuals */}
              <div className="p-8 pb-0">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl">U</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tighter">UCMAS GHANA</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Management System</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Receipt</p>
                    <p className="text-xs font-mono font-bold text-slate-900 uppercase">{showReceipt.receipt_number}</p>
                  </div>
                </div>

                <div className="flex justify-center mb-10 relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-slate-200"></div></div>
                  <div className="relative bg-white px-8">
                    <QrCode size={48} className="text-slate-300 opacity-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 mb-10 px-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payer (Student)</p>
                    <p className="text-sm font-bold text-slate-900">{currentStudentData?.first_name} {currentStudentData?.last_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
                    <p className="text-sm font-bold text-slate-900">{showReceipt.payment_date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason for Payment</p>
                    <p className="text-xs font-bold text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded inline-block">{showReceipt.payment_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Mode</p>
                    <p className="text-sm font-bold text-slate-900">{showReceipt.payment_method}</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-2xl text-center text-white relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-red-600 rounded-tl-full opacity-20"></div>
                  <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Total Paid Amount</p>
                  <p className="text-3xl font-bold tracking-tight">GH₵ {showReceipt.amount.toFixed(2)}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} className="text-green-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Confirmed & Processed by System</span>
                  </div>
                </div>
              </div>

              <div className="p-8 flex gap-3">
                <button 
                  onClick={() => setShowReceipt(null)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Close Window
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 btn-primary py-3"
                >
                  <Printer size={16} />
                  Print Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
  );
}
