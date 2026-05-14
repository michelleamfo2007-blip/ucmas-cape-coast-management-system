import React from 'react';
import { motion } from "motion/react";
import { Database, Layout as LayoutIcon, List, Users, ShieldCheck, ChevronRight, LogOut, Home, GraduationCap, UserSquare2, UserCheck, CreditCard, BookOpen } from "lucide-react";
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!cancelled) {
          if (res.status === 401) {
            navigate('/login');
          } else {
            try { const j = await res.json(); setUser(j.user || null); } catch {}
          }
        }
      } catch {
        if (!cancelled) navigate('/login');
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: GraduationCap, label: "Student Management", path: "/students" },
    { icon: UserSquare2, label: "Teacher Management", path: "/teachers" },
    { icon: UserCheck, label: "Attendance Tracking", path: "/attendance" },
    { icon: BookOpen, label: "Academic Records", path: "/academic" },
    { icon: CreditCard, label: "Fee Treasury", path: "/payments" },
    ...(user?.role === 'Admin' ? [{ icon: List, label: 'Schools Admin', path: '/admin/schools' }] : []),
  ];

  return (
    <div className="geometric-grid">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="flex items-center gap-4">
          <img
            src="https://tse4.mm.bing.net/th/id/OIP.iqaT_YtHzdCao02M6gF4lgAAAA?w=460&h=460&rs=1&pid=ImgDetMain&o=7&rm=3"
            alt="UCMAS Ghana Logo"
            className="w-9 h-9 rounded shadow-lg object-contain bg-white"
          />
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">UCMAS GHANA</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[11px] font-semibold text-green-700 uppercase tracking-tighter">System Online</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={18} />
            <span className="text-xs font-bold uppercase tracking-tight">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar flex flex-col">
        <div className="mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Navigation</h2>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer group ${isActive ? 'bg-red-600 text-white shadow-md shadow-red-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-500'} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight size={14} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">System Console</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-red-600" />
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">Admin Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">Latency</span>
                <span className="text-[10px] font-mono text-green-600">12ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase">DB Version</span>
                <span className="text-[10px] font-mono text-slate-700">v2.4.0-sqlite</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 bg-slate-900 rounded-xl text-white shadow-xl overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-600 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity"></div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Metrics</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold">148</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight">Active Students</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-green-400">99%</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight">Attendance</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="canvas bg-slate-100 overflow-y-auto">
        <motion.div 
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="max-w-6xl mx-auto p-4 lg:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Detail Inspector (Contextual) */}
      <aside className="inspector">
        <div className="h-full flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Database size={16} className="text-red-600" />
            <span>Activity Log</span>
          </h2>
          
          <div className="space-y-4 overflow-y-auto pr-2">
            {[
              { time: '10:45 AM', event: 'Payment Received', meta: 'Student #2401' },
              { time: '09:30 AM', event: 'Student Enrolled', meta: 'Foundation Level' },
              { time: '09:00 AM', event: 'Attendance Marked', meta: 'Saturday Batch A' },
              { time: 'Yesterday', event: 'Term Report Generated', meta: '24 Students' },
            ].map((activity, idx) => (
              <div key={idx} className="relative pl-6 pb-4 border-l border-slate-100">
                <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-white"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activity.time}</p>
                <p className="text-xs font-bold text-slate-800">{activity.event}</p>
                <p className="text-[11px] text-slate-500 italic">{activity.meta}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <div className="p-4 bg-red-600 rounded-xl text-white shadow-xl">
              <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-1">Upcoming Milestone</p>
              <h4 className="text-sm font-bold mb-2 uppercase tracking-tight">Regional Competition</h4>
              <p className="text-[11px] text-red-50 leading-relaxed mb-4">
                Registration closes in 4 days. Ensure all Intermediate level packets are ready.
              </p>
              <button className="w-full py-2 bg-white text-red-600 rounded-lg text-xs font-bold uppercase tracking-tight transition-all hover:bg-red-50 active:scale-95">
                View Event details
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
