import React from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function SchoolsAdmin() {
  const [user, setUser] = React.useState<any | null>(null);
  const [branches, setBranches] = React.useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = React.useState<'all' | number>('all');
  const [schools, setSchools] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Toasts state
  const [toasts, setToasts] = React.useState<Array<{ id: number; type: 'success' | 'error' | 'info'; message: string }>>([]);
  const pushToast = React.useCallback((t: { type: 'success' | 'error' | 'info'; message: string }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  // Create / Edit form state
  const [newSchool, setNewSchool] = React.useState({ name: '', branch_id: '' as any, contact_phone: '', contact_email: '' });
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editRow, setEditRow] = React.useState<any>({});

  // Reassignment tool state
  const [fromBranch, setFromBranch] = React.useState<number | ''>('');
  const [toBranch, setToBranch] = React.useState<number | ''>('');
  const [targetSchools, setTargetSchools] = React.useState<any[]>([]);
  const [targetSchoolId, setTargetSchoolId] = React.useState<number | ''>('');
  const [reassignPreview, setReassignPreview] = React.useState<any | null>(null);
  const [working, setWorking] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch('/api/auth/me').then(r=>r.json());
        if (!cancelled) setUser(me.user || null);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await fetch('/api/admin/branches').then(r=>r.json());
        if (!cancelled) setBranches(b||[]);
      } catch {
        if (!cancelled) setBranches([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadSchools = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedBranch === 'all' ? '/api/admin/schools' : `/api/admin/schools?branch_id=${selectedBranch}`;
      const data = await fetch(url).then(r=>r.json());
      setSchools(data || []);
    } catch (e: any) {
      setError('Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  React.useEffect(() => { loadSchools(); }, [loadSchools]);

  React.useEffect(() => {
    // load target schools for reassignment based on toBranch
    (async () => {
      if (!toBranch) { setTargetSchools([]); setTargetSchoolId(''); return; }
      try {
        const data = await fetch(`/api/admin/schools?branch_id=${toBranch}`).then(r=>r.json());
        setTargetSchools(data || []);
        setTargetSchoolId('');
      } catch { setTargetSchools([]); setTargetSchoolId(''); }
    })();
  }, [toBranch]);

  // Auto-bind form branch to selected filter when applicable
  React.useEffect(() => {
    if (selectedBranch !== 'all' && !newSchool.branch_id) {
      setNewSchool((s) => ({ ...s, branch_id: selectedBranch }));
    }
  }, [selectedBranch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool.name) { pushToast({ type: 'error', message: 'Please enter a school name' }); return; }
    if (!(newSchool.branch_id || selectedBranch !== 'all')) { pushToast({ type: 'error', message: 'Please choose a Branch (use Branch Filter or select a Branch in the form)' }); return; }
    const payload = {
      name: newSchool.name,
      branch_id: newSchool.branch_id || selectedBranch,
      contact_phone: newSchool.contact_phone || null,
      contact_email: newSchool.contact_email || null,
    };
    try {
      setCreating(true);
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (!res.ok) { pushToast({ type: 'error', message: j.error || 'Failed to create school' }); return; }
      setNewSchool({ name: '', branch_id: '' as any, contact_phone: '', contact_email: '' });
      loadSchools();
      pushToast({ type: 'success', message: 'School created successfully' });
    } catch (e) {
      pushToast({ type: 'error', message: 'Network error while creating school' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (s: any) => {
    setEditingId(s.school_id);
    setEditRow({ ...s });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/schools/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRow.name,
          branch_id: editRow.branch_id,
          contact_phone: editRow.contact_phone || null,
          contact_email: editRow.contact_email || null,
        })
      });
      const j = await res.json();
      if (!res.ok) { pushToast({ type: 'error', message: j.error || 'Failed to update school' }); return; }
      setEditingId(null);
      loadSchools();
      pushToast({ type: 'success', message: 'School updated' });
    } catch {}
  };

  const deleteSchool = async (id: number) => {
    if (!confirm('Delete this school? This is permanent.')) return;
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) { pushToast({ type: 'error', message: j.error || 'Failed to delete school' }); return; }
      loadSchools();
      pushToast({ type: 'success', message: 'School deleted' });
    } catch {}
  };

  const previewReassign = async () => {
    if (!fromBranch || !toBranch || !targetSchoolId) { pushToast({ type: 'error', message: 'Please select From Branch, To Branch and Target School' }); return; }
    setWorking(true);
    try {
      const res = await fetch('/api/admin/data/reassign-branch-to-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_branch_id: fromBranch, to_branch_id: toBranch, school_id: targetSchoolId, dry_run: true })
      });
      const j = await res.json();
      if (!res.ok) { pushToast({ type: 'error', message: j.error || 'Preview failed' }); return; }
      setReassignPreview(j);
      pushToast({ type: 'info', message: 'Preview ready below' });
    } finally {
      setWorking(false);
    }
  };

  const executeReassign = async () => {
    if (!fromBranch || !toBranch || !targetSchoolId) { pushToast({ type: 'error', message: 'Please select From Branch, To Branch and Target School' }); return; }
    if (!confirm('Move all data from the source branch into the selected school?')) return;
    setWorking(true);
    try {
      const res = await fetch('/api/admin/data/reassign-branch-to-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_branch_id: fromBranch, to_branch_id: toBranch, school_id: targetSchoolId, dry_run: false })
      });
      const j = await res.json();
      if (!res.ok) { pushToast({ type: 'error', message: j.error || 'Reassignment failed' }); return; }
      pushToast({ type: 'success', message: `Reassigned: students ${j.moved_students}, classes ${j.moved_classes}` });
      setReassignPreview(null);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Partner Schools Management</h2>
          <p className="text-sm text-slate-500 font-medium">Create, edit, and manage schools under branches. Admin only.</p>
        </div>
        <button onClick={loadSchools} className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters & Create */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch Filter</label>
            <select
              value={String(selectedBranch)}
              onChange={(e)=> setSelectedBranch(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
            >
              <option value="all">All Branches</option>
              {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">School Name</label>
              <input
                required
                value={newSchool.name}
                onChange={(e)=> setNewSchool({...newSchool, name: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
              <select
                value={String(newSchool.branch_id || (selectedBranch !== 'all' ? selectedBranch : ''))}
                onChange={(e)=> setNewSchool({...newSchool, branch_id: e.target.value ? Number(e.target.value) : ''})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
              >
                <option value="">{selectedBranch === 'all' ? 'Choose Branch' : 'Use Selected Branch'}</option>
                {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
              <input
                value={newSchool.contact_phone}
                onChange={(e)=> setNewSchool({...newSchool, contact_phone: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
              <input
                type="email"
                value={newSchool.contact_email}
                onChange={(e)=> setNewSchool({...newSchool, contact_email: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-600 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                disabled={creating || !newSchool.name || (selectedBranch === 'all' && !newSchool.branch_id)}
                className="w-full btn-primary py-2"
              >
                {creating ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : <Plus size={14} />}
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">School</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((s:any) => (
                <tr key={s.school_id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3">
                    {editingId === s.school_id ? (
                      <input
                        value={editRow.name || ''}
                        onChange={(e)=> setEditRow({...editRow, name: e.target.value})}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-800">{s.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {editingId === s.school_id ? (
                      <select
                        value={String(editRow.branch_id)}
                        onChange={(e)=> setEditRow({...editRow, branch_id: Number(e.target.value)})}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm"
                      >
                        {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-600">{branches.find(b=>b.branch_id===s.branch_id)?.name || s.branch_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-600">
                    {editingId === s.school_id ? (
                      <div className="flex gap-2">
                        <input
                          placeholder="Phone"
                          value={editRow.contact_phone || ''}
                          onChange={(e)=> setEditRow({...editRow, contact_phone: e.target.value})}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm w-32"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={editRow.contact_email || ''}
                          onChange={(e)=> setEditRow({...editRow, contact_email: e.target.value})}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm w-40"
                        />
                      </div>
                    ) : (
                      <span>{s.contact_phone || '—'} {s.contact_email ? `• ${s.contact_email}` : ''}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    {editingId === s.school_id ? (
                      <>
                        <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Save size={16} /></button>
                        <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>startEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                        <button onClick={()=>deleteSchool(s.school_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {(!loading && schools.length === 0) && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm italic">No schools found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Data Reassignment Tool */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Data Reassignment Tool</h3>
        <p className="text-xs text-slate-500">Move all data from a mistaken branch into a specific school under a (target) branch. Use Preview first.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">From Branch</label>
            <select value={String(fromBranch)} onChange={(e)=> setFromBranch(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              <option value="">Select...</option>
              {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">To Branch</label>
            <select value={String(toBranch)} onChange={(e)=> setToBranch(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              <option value="">Select...</option>
              {branches.map((b:any)=> <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target School</label>
            <select value={String(targetSchoolId)} onChange={(e)=> setTargetSchoolId(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" disabled={!toBranch || targetSchools.length===0}>
              <option value="">Select...</option>
              {targetSchools.map((s:any)=> <option key={s.school_id} value={s.school_id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button disabled={working || !fromBranch || !toBranch || !targetSchoolId} onClick={previewReassign} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase hover:bg-slate-50">Preview</button>
            <button disabled={working || !fromBranch || !toBranch || !targetSchoolId} onClick={executeReassign} className="flex-1 btn-primary py-2">Execute</button>
          </div>
        </div>
        {reassignPreview && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="font-bold text-slate-700 mb-2">Preview</div>
            <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(reassignPreview, null, 2)}</pre>
          </div>
        )}
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
    </div>
  );
}
