'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { departmentApi, employeeApi, initApi } from '@/lib/api';
import { Plus, Edit, Trash2, Building2, Users } from 'lucide-react';

interface Department { id: string; name: string; description?: string; managerName?: string; managerId?: string; employeeCount?: number; }
interface Employee { id: string; fullName: string; role: string; }

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const initRes = await initApi.getDepartmentsData();
      const { departments: deptData, employees: empData } = initRes.data;
      setDepartments(deptData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await departmentApi.create({ ...form, managerId: form.managerId || undefined });
      setShowAdd(false); setForm({ name: '', description: '', managerId: '' }); fetchAll();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'); }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editDept) return; setSaving(true); setError('');
    try {
      await departmentApi.update(editDept.id, { ...form, managerId: form.managerId || undefined });
      setEditDept(null); fetchAll();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'); }
    setSaving(false);
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '', managerId: dept.managerId || '' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa phòng ban "${name}"?`)) return;
    try { await departmentApi.delete(id); fetchAll(); } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi xóa'); }
  };

  const renderModal = (onClose: () => void, onSubmit: (e: React.FormEvent) => void, title: string) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{title}</h2>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
        <form onSubmit={onSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Tên phòng ban *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="form-label">Mô tả</label><textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <label className="form-label">Trưởng phòng</label>
              <select className="form-input" value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
                <option value="">-- Chọn trưởng phòng --</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.role})</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý Phòng ban</h1>
          <p className="page-subtitle">Cơ cấu tổ chức của công ty</p>
        </div>
        {user?.role === 'Admin' && (
          <button className="btn btn-primary" onClick={() => { setForm({ name: '', description: '', managerId: '' }); setShowAdd(true); }}><Plus size={16} /> Thêm phòng ban</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {departments.map(dept => (
            <div key={dept.id} className="glass-card" style={{ padding: 20, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, background: 'rgba(79,142,247,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} color="var(--accent-blue)" />
                </div>
                {user?.role === 'Admin' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(dept)}><Edit size={13} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dept.id, dept.name)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{dept.name}</h3>
              {dept.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{dept.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {dept.managerName ? `👤 ${dept.managerName}` : 'Chưa có trưởng phòng'}
                </span>
                <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} /> {dept.employeeCount ?? 0}
                </span>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <Building2 size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Chưa có phòng ban nào.</p>
            </div>
          )}
        </div>
      )}
      {showAdd && renderModal(() => setShowAdd(false), handleAdd, "Thêm phòng ban mới")}
      {editDept && renderModal(() => setEditDept(null), handleEdit, `Chỉnh sửa: ${editDept.name}`)}
    </div>
  );
}
