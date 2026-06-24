'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employeeApi, authApi, departmentApi, positionApi, initApi } from '@/lib/api';
import { Plus, Edit, Trash2, Search, User } from 'lucide-react';

interface Employee { id: string; fullName: string; email: string; phone: string; role: string; departmentId?: string; departmentName?: string; positionId?: string; positionName?: string; isActive: boolean; createdAt: string; }
interface Department { id: string; name: string; }
interface Position { id: string; name: string; }

const ROLE_COLORS: Record<string, string> = { Admin: 'badge-purple', Manager: 'badge-blue', Employee: 'badge-green', Instructor: 'badge-orange' };

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '', role: 'Employee', departmentId: '', positionId: '' });
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', role: 'Employee', departmentId: '', positionId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const initRes = await initApi.getEmployeesData();
      const { employees: empData, departments: deptData, positions: posData } = initRes.data;
      setEmployees(empData);
      setDepartments(deptData);
      setPositions(posData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await authApi.register({ ...form, departmentId: form.departmentId || undefined, positionId: form.positionId || undefined });
      setShowAdd(false);
      setForm({ fullName: '', email: '', password: '', phone: '', role: 'Employee', departmentId: '', positionId: '' });
      fetchAll();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi thêm nhân viên'); }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editEmployee) return; setSaving(true); setError('');
    try {
      await employeeApi.update(editEmployee.id, { ...editForm, departmentId: editForm.departmentId || undefined, positionId: editForm.positionId || undefined });
      setEditEmployee(null); fetchAll();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi cập nhật'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa nhân viên "${name}"?`)) return;
    try { await employeeApi.delete(id); fetchAll(); } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi xóa'); }
  };

  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setEditForm({ fullName: emp.fullName, phone: emp.phone, role: emp.role, departmentId: emp.departmentId || '', positionId: emp.positionId || '', isActive: emp.isActive });
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý Nhân viên</h1>
          <p className="page-subtitle">Danh sách tất cả nhân viên trong hệ thống</p>
        </div>
        {user?.role === 'Admin' && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Thêm nhân viên</button>
        )}
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={16} color="var(--text-muted)" />
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="Tìm theo tên, email..." value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} nhân viên</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th><th>Email</th><th>Điện thoại</th>
                  <th>Phòng ban</th><th>Chức vụ</th><th>Vai trò</th>
                  <th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{emp.fullName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.phone}</td>
                    <td>{emp.departmentName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{emp.positionName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td><span className={`badge ${ROLE_COLORS[emp.role] || 'badge-gray'}`}>{emp.role}</span></td>
                    <td><span className={`badge ${emp.isActive ? 'badge-green' : 'badge-red'}`}>{emp.isActive ? 'Hoạt động' : 'Vô hiệu'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(user?.role !== 'Employee' || emp.id === user?.id) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}><Edit size={14} /></button>
                        )}
                        {user?.role === 'Admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id, emp.fullName)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Không có nhân viên nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Thêm nhân viên mới</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['fullName', 'Họ tên *', 'text'], ['email', 'Email *', 'email'], ['password', 'Mật khẩu *', 'password'], ['phone', 'Điện thoại', 'text']].map(([field, label, type]) => (
                  <div key={field}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input" value={(form as Record<string, string>)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required={label.includes('*')} />
                  </div>
                ))}
                <div>
                  <label className="form-label">Vai trò</label>
                  <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option>Admin</option><option>Manager</option><option>Employee</option><option>Instructor</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Phòng ban</label>
                  <select className="form-input" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Chức vụ</label>
                  <select className="form-input" value={form.positionId} onChange={e => setForm(f => ({ ...f, positionId: e.target.value }))}>
                    <option value="">-- Chọn chức vụ --</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Tạo tài khoản'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEmployee && (
        <div className="modal-overlay" onClick={() => setEditEmployee(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Chỉnh sửa: {editEmployee.fullName}</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Họ tên</label><input className="form-input" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></div>
                <div><label className="form-label">Điện thoại</label><input className="form-input" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                {user?.role === 'Admin' && <>
                  <div>
                    <label className="form-label">Vai trò</label>
                    <select className="form-input" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option>Admin</option><option>Manager</option><option>Employee</option><option>Instructor</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Phòng ban</label>
                    <select className="form-input" value={editForm.departmentId} onChange={e => setEditForm(f => ({ ...f, departmentId: e.target.value }))}>
                      <option value="">-- Chọn phòng ban --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Chức vụ</label>
                    <select className="form-input" value={editForm.positionId} onChange={e => setEditForm(f => ({ ...f, positionId: e.target.value }))}>
                      <option value="">-- Chọn chức vụ --</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Trạng thái</label>
                    <select className="form-input" value={editForm.isActive ? 'true' : 'false'} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                      <option value="true">Hoạt động</option><option value="false">Vô hiệu hóa</option>
                    </select>
                  </div>
                </>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditEmployee(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
