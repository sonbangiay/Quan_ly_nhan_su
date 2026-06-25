'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { kpiApi, employeeApi } from '@/lib/api';
import { Target, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

export default function KpiPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [period, setPeriod] = useState('Monthly');
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ employeeId: '', employeeName: '', targetName: '', targetValue: 0, unit: '', period: 'Monthly', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  // Edit current value
  const [editingId, setEditingId] = useState('');
  const [editValue, setEditValue] = useState(0);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    if (isManagerOrAdmin) employeeApi.getAll().then(r => setEmployees(r.data)).catch(() => {});
  }, [isManagerOrAdmin]);

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const res = await kpiApi.getKpis(period);
      setKpis(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchKpis(); }, [period]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await kpiApi.createKpi(form);
      setShowAdd(false); fetchKpis();
    } catch { alert('Lỗi tạo KPI'); }
    setSaving(false);
  };

  const handleUpdateValue = async (id: string) => {
    try {
      await kpiApi.updateValue(id, editValue);
      setEditingId(''); fetchKpis();
    } catch { alert('Lỗi cập nhật'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa mục tiêu KPI này?')) return;
    try { await kpiApi.deleteKpi(id); fetchKpis(); } catch { alert('Lỗi xóa'); }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'var(--accent-green)';
    if (pct >= 70) return 'var(--accent-blue)';
    if (pct >= 40) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const myKpis = kpis.filter(k => k.employeeId === user?.id);
  const displayKpis = isManagerOrAdmin ? kpis : myKpis;

  const chartData = isManagerOrAdmin ? Array.from(new Set(kpis.map(k => k.employeeName))).map(name => {
    const empKpis = kpis.filter(k => k.employeeName === name);
    const avg = empKpis.length > 0 ? empKpis.reduce((acc, curr) => acc + (curr.targetValue > 0 ? (curr.currentValue / curr.targetValue * 100) : 0), 0) / empKpis.length : 0;
    return { name, progress: Math.round(avg) };
  }) : [];

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý KPI</h1>
          <p className="page-subtitle">Theo dõi mục tiêu và hiệu suất</p>
        </div>
        {isManagerOrAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setForm({ employeeId: '', employeeName: '', targetName: '', targetValue: 0, unit: '', period: period, startDate: '', endDate: '' });
            setShowAdd(true);
          }}><Plus size={16} /> Giao KPI mới</button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          {['Weekly', 'Monthly', 'Yearly'].map(p => (
            <button key={p} className={`btn ${period === p ? 'btn-primary' : ''}`} style={{ background: period !== p ? 'transparent' : undefined, border: 'none' }} onClick={() => setPeriod(p)}>
              {p === 'Weekly' ? 'Tuần' : p === 'Monthly' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      {isManagerOrAdmin && chartData.length > 0 && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tiến độ KPI trung bình theo nhân viên</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip 
                cursor={{ fill: 'var(--bg-hover)' }}
                contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: any) => [`${value}%`, 'Tiến độ trung bình']}
                labelStyle={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}
              />
              <Bar dataKey="progress" fill="url(#colorProgress)" barSize={56} radius={[6, 6, 0, 0]} animationDuration={1000}>
                <LabelList dataKey="progress" position="top" formatter={(val: any) => `${val}%`} style={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {displayKpis.map(kpi => {
              const pct = kpi.targetValue > 0 ? Math.min(((kpi.currentValue ?? 0) / kpi.targetValue) * 100, 100) : 0;
              const color = getProgressColor(pct);
              return (
                <div key={kpi.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} color="var(--accent-blue)" /> {kpi.targetName}</h4>
                      {isManagerOrAdmin && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Nhân viên: <strong>{kpi.employeeName}</strong></div>}
                      {(kpi.startDate || kpi.endDate) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Thời hạn: {kpi.startDate ? new Date(kpi.startDate).toLocaleDateString('vi-VN') : '...'} - {kpi.endDate ? new Date(kpi.endDate).toLocaleDateString('vi-VN') : '...'}
                        </div>
                      )}
                    </div>
                    {isManagerOrAdmin && (
                      <button className="btn btn-secondary btn-sm" style={{ padding: 4, background: 'none', border: 'none', color: 'var(--text-muted)' }} onClick={() => handleDelete(kpi.id)}><Trash2 size={14} /></button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tiến độ</span>
                    <span style={{ fontWeight: 700, color }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 12 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Mục tiêu: <strong>{kpi.targetValue.toLocaleString()}</strong> {kpi.unit}
                    </div>
                    
                    {editingId === kpi.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" className="form-input" style={{ width: 80, padding: '4px 8px' }} value={editValue} onChange={e => setEditValue(Number(e.target.value))} />
                        <button className="btn btn-success btn-sm" style={{ padding: 4 }} onClick={() => handleUpdateValue(kpi.id)}><CheckCircle size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(kpi.currentValue ?? 0).toLocaleString()} {kpi.unit}
                        <button className="btn btn-secondary btn-sm" style={{ padding: 4, background: 'none', border: 'none' }} onClick={() => { setEditingId(kpi.id); setEditValue(kpi.currentValue ?? 0); }}><Edit2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {displayKpis.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có mục tiêu KPI nào cho kỳ này.</div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Giao KPI mới</h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Nhân viên *</label>
                  <select className="form-input" value={form.employeeId} onChange={e => {
                    const selected = employees.find((emp: any) => emp.id === e.target.value);
                    setForm({...form, employeeId: e.target.value, employeeName: selected?.fullName || ''});
                  }} required>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Loại KPI *</label>
                  <select className="form-input" value={form.period} onChange={e => setForm({...form, period: e.target.value})} required>
                    <option value="Weekly">KPI Tuần</option>
                    <option value="Monthly">KPI Tháng</option>
                    <option value="Yearly">KPI Năm</option>
                  </select>
                </div>
                <div><label className="form-label">Tên mục tiêu *</label><input className="form-input" value={form.targetName} onChange={e => setForm({...form, targetName: e.target.value})} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Chỉ tiêu (số) *</label><input type="number" className="form-input" value={form.targetValue} onChange={e => setForm({...form, targetValue: Number(e.target.value)})} required /></div>
                  <div><label className="form-label">Đơn vị (vd: Khách, VNĐ) *</label><input className="form-input" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} required /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Từ ngày *</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required /></div>
                  <div><label className="form-label">Đến ngày *</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required /></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Giao việc'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
