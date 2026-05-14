import React from 'react';
import { motion } from "motion/react";
import { Users, GraduationCap, DollarSign, Activity, ArrowUpRight, TrendingUp, Calendar, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const [branches, setBranches] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any | null>(null);
  const [selected, setSelected] = React.useState<'all' | number>('all');
  const [schools, setSchools] = React.useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = React.useState<'all' | number>('all');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [user, setUser] = React.useState<any | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bRes, sRes] = await Promise.all([
          fetch('/api/admin/branches'),
          fetch('/api/admin/branches/summary')
        ]);
        if (!bRes.ok || !sRes.ok) throw new Error('Failed to load metrics');
        const [bJson, sJson] = await Promise.all([bRes.json(), sRes.json()]);
        if (!cancelled) {
          setBranches(bJson);
          setSummary(sJson);
        }
      } catch {
        // ignore, keeps placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch('/api/auth/me').then(r=>r.json());
        if (!cancelled) {
          setUser(me.user || null);
          if (me.user && me.user.role !== 'Admin') {
            // Lock to user's branch
            setSelected(me.user.branchId);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setSelectedSchool('all');
    if (!user) return;
    if (user.role === 'Admin') {
      if (selected === 'all') {
        (async () => {
          try {
            const res = await fetch(`/api/admin/schools`);
            if (!res.ok) { setSchools([]); return; }
            const data = await res.json();
            if (!cancelled) setSchools(data);
          } catch {
            if (!cancelled) setSchools([]);
          }
        })();
        return;
      }
      (async () => {
        try {
          const res = await fetch(`/api/admin/schools?branch_id=${selected}`);
          if (!res.ok) { setSchools([]); return; }
          const data = await res.json();
          if (!cancelled) setSchools(data);
        } catch {
          if (!cancelled) setSchools([]);
        }
      })();
    } else {
      // Non-admin sees schools in their branch via scoped endpoint
      (async () => {
        try {
          const res = await fetch(`/api/schools`);
          if (!res.ok) { setSchools([]); return; }
          const data = await res.json();
          if (!cancelled) setSchools(data);
        } catch {
          if (!cancelled) setSchools([]);
        }
      })();
    }
    (async () => {
      // no-op placeholder to satisfy pattern, removed above
    })();
    return () => { cancelled = true; };
  }, [selected, user]);

  const selectedRow = React.useMemo(() => {
    if (!summary || selected === 'all') return null;
    return (summary.branches || []).find((b: any) => b.branch_id === selected) || null;
  }, [summary, selected]);

  const studentsTotal = React.useMemo(() => {
    if (!summary) return 0;
    if (selected === 'all') return (summary.branches || []).reduce((a: number, b: any) => a + (Number(b.students_count) || 0), 0);
    return Number(selectedRow?.students_count || 0);
  }, [summary, selected, selectedRow]);

  const teachersTotal = React.useMemo(() => {
    if (!summary) return 0;
    if (selected === 'all') return (summary.branches || []).reduce((a: number, b: any) => a + (Number(b.teachers_count) || 0), 0);
    return Number(selectedRow?.teachers_count || 0);
  }, [summary, selected, selectedRow]);

  const revenue30 = React.useMemo(() => {
    if (!summary) return 0;
    if (selected === 'all') return Number(summary.overall?.revenue_30d || 0);
    return Number(selectedRow?.revenue_30d || 0);
  }, [summary, selected, selectedRow]);

  const stats = [
    { label: "Total Students", value: loading ? '—' : String(studentsTotal), icon: GraduationCap, trend: "" },
    { label: "Staff Members", value: loading ? '—' : String(teachersTotal), icon: Users, trend: "" },
    { label: "Monthly Revenue", value: loading ? '—' : `GH₵${Number(revenue30).toFixed(2)}`, icon: DollarSign, trend: "" },
    { label: "Active Batches", value: "—", icon: Activity, trend: "" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium">
            {selectedSchool !== 'all'
              ? (() => {
                  const s = schools.find(s=>s.school_id===selectedSchool);
                  const bname = s ? (branches.find(b=>b.branch_id===s.branch_id)?.name) : (branches.find(b=>b.branch_id===selected)?.name);
                  return `School view: ${(s?.name) || '—'} — ${bname || '—'}`;
                })()
              : (selected === 'all'
                  ? 'All branches overview'
                  : `Branch activity overview for ${(branches.find(b=>b.branch_id===selected)?.name) || '—'}`
                )
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Calendar size={14} />
            Term 1, 2026
          </button>
          <select
            disabled={user && user.role !== 'Admin'}
            value={String(selected)}
            onChange={(e) => {
              const v = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setSelected(v as any);
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {user && user.role === 'Admin' ? (
              <>
                <option value="all">All Branches</option>
                {branches.map((b:any) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </>
            ) : (
              <option value={String(selected)}>My Branch</option>
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
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-700 shadow-md shadow-red-100 transition-all">
            Quick Report
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                {stat.trend}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Performance Trends</h3>
              <p className="text-xs text-slate-500 font-medium italic">Mental arithmetic proficiency across levels</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mental</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Abacus</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-2 group">
            {/* Visual Bar Chart Placeholder */}
            {[45, 65, 55, 85, 75, 95, 60, 40, 80, 90, 70, 88].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className="w-full bg-red-500 rounded-t shadow-sm relative group"
                >
                  <div className="absolute inset-0 bg-red-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.div>
                <span className="text-[9px] text-slate-400 font-bold uppercase">M{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-6 flex items-center justify-between">
            Recent Students
            <button className="text-blue-600 hover:underline text-[10px] font-bold uppercase">View All</button>
          </h3>
          
          <div className="space-y-4">
            {[
              { name: "Kofi Owusu", date: "2 mins ago", level: "Foundation" },
              { name: "Ama Boateng", date: "1 hour ago", level: "Basic 1" },
              { name: "Yaw Mensah", date: "Yesterday", level: "Basic 3" },
              { name: "Esi Koranteng", date: "Yesterday", level: "Foundation" },
              { name: "Kwabena Appiah", date: "2 days ago", level: "Elementary" },
            ].map((student, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs uppercase group-hover:bg-red-600 group-hover:text-white transition-all">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{student.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{student.level}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  {student.date}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-red-600" />
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-tight">Goal Progress</span>
            </div>
            <div className="w-full h-1.5 bg-red-200 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-red-600"></div>
            </div>
            <p className="text-[10px] text-red-600 font-medium mt-2">75% of enrollment target reached</p>
          </div>
        </div>
      </div>
    </div>
  );
}
