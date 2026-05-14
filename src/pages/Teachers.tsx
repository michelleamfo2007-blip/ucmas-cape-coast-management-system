import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { UserPlus, Search, Phone, BookOpen, Star, Mail, MapPin } from "lucide-react";

interface Teacher {
  user_id: number;
  username: string;
  full_name: string;
  specialty: string;
  phone: string;
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Directory</h2>
          <p className="text-sm text-slate-500 font-medium">Core team of mental arithmetic specialists.</p>
        </div>
        <button className="btn-primary">
          <UserPlus size={16} />
          Onboard Teacher
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-64"></div>
          ))
        ) : (
          teachers.map((teacher) => (
            <motion.div
              key={teacher.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-[100px] -z-0 opacity-50"></div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl uppercase shadow-lg select-none">
                  {teacher.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{teacher.full_name}</h3>
                  <div className="flex items-center gap-1.5 text-red-600">
                    <Star size={12} fill="currentColor" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{teacher.specialty || 'Senior Tutor'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 relative z-10">
                <div className="flex items-center gap-3 text-slate-600 group cursor-pointer hover:text-red-600 transition-colors">
                  <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-red-50">
                    <Phone size={14} />
                  </div>
                  <span className="text-xs font-semibold">{teacher.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 group">
                  <div className="p-1.5 bg-slate-50 rounded-lg">
                    <BookOpen size={14} />
                  </div>
                  <span className="text-xs font-semibold">Multiple Batches</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2 relative z-10">
                <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">
                  Profile
                </button>
                <button className="flex-1 py-2 bg-white text-red-600 border border-red-100 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">
                  Schedule
                </button>
              </div>
            </motion.div>
          ))
        )}

        {/* Action Card Placeholder */}
        <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 hover:bg-white transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 group-hover:border-red-600 group-hover:text-red-600 transition-all mb-4">
            <UserPlus size={24} />
          </div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Expand Faculty</p>
          <p className="text-[10px] text-slate-400 font-medium max-w-[150px] mt-1 italic">Click here to register a new UCMAS instructor profile.</p>
        </div>
      </div>
    </div>
  );
}
