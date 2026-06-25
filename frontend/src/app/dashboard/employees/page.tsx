'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employeeApi, authApi, initApi } from '@/lib/api';
import { Plus, Edit, Trash2, Search, User, Camera, Lock, Mail, Phone } from 'lucide-react';

interface Employee { id: string; fullName: string; email: string; phone: string; role: string; departmentId?: string; departmentName?: string; positionId?: string; positionName?: string; isActive: boolean; createdAt: string; avatar?: string; dob?: string; }
interface Department { id: string; name: string; }
interface Position { id: string; name: string; }

const ROLE_COLORS: Record<string, string> = { Admin: 'badge-purple', Manager: 'badge-blue', Employee: 'badge-green', Instructor: 'badge-orange' };

function MyProfile({ user }: { user: any }) {
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  
  const [form, setForm] = useState({ fullName: '', phone: '', dob: '' });
  const [credForm, setCredForm] = useState({ email: '', password: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    employeeApi.getById(user.id).then(res => {
      if (res.data) {
        setEmp(res.data);
        setForm({ fullName: res.data.fullName, phone: res.data.phone || '', dob: res.data.dob || '' });
        setCredForm(f => ({ ...f, email: res.data.email }));
      }
      setLoading(false);
    });
  }, [user.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await employeeApi.update(user.id, { avatar: data.fileUrl });
      setEmp(prev => prev ? { ...prev, avatar: data.fileUrl } : null);
    } catch (err: any) {
      alert('Lỗi tải ảnh: ' + err.message);
    }
    setUploading(false);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await employeeApi.update(user.id, { fullName: form.fullName, phone: form.phone, dob: form.dob });
      alert('Cập nhật thông tin thành công!');
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      u.fullName = form.fullName;
      localStorage.setItem('user', JSON.stringify(u));
      setEmp(prev => prev ? { ...prev, fullName: form.fullName, phone: form.phone, dob: form.dob } : null);
    } catch (err) {
      alert('Lỗi cập nhật thông tin');
    }
    setSavingInfo(false);
  };

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setError('');
    try {
      if (credForm.email !== emp?.email) {
        await employeeApi.update(user.id, { email: credForm.email });
      }
      await authApi.updateCredentials(credForm.email !== emp?.email ? credForm.email : undefined, credForm.password || undefined);
      alert('Cập nhật tài khoản thành công!');
      setCredForm(f => ({ ...f, password: '' }));
      setEmp(prev => prev ? { ...prev, email: credForm.email } : null);
    } catch (err: any) {
      if (err?.response?.data?.error === 'requires-recent-login') {
        alert('Vì lý do bảo mật, bạn cần phải đăng nhập lại để thay đổi Email/Mật khẩu.');
        logout();
      } else {
        setError(err?.response?.data?.error || 'Lỗi cập nhật tài khoản');
      }
    }
    setSavingCreds(false);
  };

  if (loading || !emp) return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <div className="glass-card" style={{ padding: 32, marginBottom: 32, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(135deg, var(--accent-blue), #9b88ed)', zIndex: 0 }} />
        
        {/* Subtle pattern overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 2px, transparent 0)', backgroundSize: '40px 40px', zIndex: 0, opacity: 0.5 }} />

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative', zIndex: 1, marginTop: 50 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'var(--bg-primary)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 800, overflow: 'hidden', border: '5px solid var(--bg-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              {emp.avatar ? <img src={emp.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emp.fullName.charAt(0)}
            </div>
            <label style={{ position: 'absolute', bottom: 4, right: 4, width: 40, height: 40, background: 'var(--bg-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid var(--border)', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.1)' } } as React.CSSProperties}>
              {uploading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Camera size={20} color="var(--accent-blue)" />}
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
            </label>
          </div>
          <div style={{ flex: 1, paddingTop: 16 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{emp.fullName}</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <span className={`badge ${ROLE_COLORS[emp.role] || 'badge-gray'}`} style={{ padding: '6px 12px', fontSize: 13 }}>{emp.role}</span>
              <span className="badge badge-gray" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '6px 12px', fontSize: 13 }}>{emp.departmentName || 'Chưa xếp phòng'}</span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 20 }}><Mail size={16} color="var(--accent-blue)" /> {emp.email}</p>
              <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 20 }}><Phone size={16} color="var(--accent-green)" /> {emp.phone || 'Chưa cập nhật SĐT'}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div className="glass-card" style={{ padding: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(79,142,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="var(--accent-blue)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Thông tin cá nhân</h3>
          </div>
          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Họ và tên</label>
              <input className="form-input" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Ngày tháng năm sinh</label>
              <input type="date" className="form-input" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} value={form.dob} onChange={e => setForm(f => ({...f, dob: e.target.value}))} />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Số điện thoại</label>
              <input type="tel" className="form-input" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingInfo} style={{ alignSelf: 'flex-start', marginTop: 12, padding: '10px 24px', fontWeight: 600 }}>
              {savingInfo ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Lưu thông tin'}
            </button>
          </form>
        </div>

        <div className="glass-card" style={{ padding: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} color="var(--accent-orange)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Tài khoản đăng nhập</h3>
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, marginBottom: 20, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <form onSubmit={handleSaveCreds} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Email đăng nhập (Tên đăng nhập)</label>
              <input type="email" className="form-input" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} value={credForm.email} onChange={e => setCredForm(f => ({...f, email: e.target.value}))} required />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Mật khẩu mới</label>
              <input type="password" className="form-input" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} placeholder="••••••••" value={credForm.password} onChange={e => setCredForm(f => ({...f, password: e.target.value}))} minLength={6} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Bỏ trống nếu không muốn đổi mật khẩu</p>
            </div>
            <button type="submit" className="btn btn-secondary" disabled={savingCreds} style={{ alignSelf: 'flex-start', marginTop: 12, padding: '10px 24px', fontWeight: 600 }}>
              {savingCreds ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Cập nhật tài khoản'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '', dob: '', role: 'Employee', departmentId: '', positionId: '' });
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', dob: '', role: 'Employee', departmentId: '', positionId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const fetchAll = async () => {
    if (!isManagerOrAdmin) return;
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

  useEffect(() => { 
    if (isManagerOrAdmin) fetchAll(); 
  }, [isManagerOrAdmin]);

  if (!isManagerOrAdmin) {
    return (
      <div className="section">
        <div className="section-header">
          <div>
            <h1 className="page-title">Hồ sơ cá nhân</h1>
            <p className="page-subtitle">Quản lý thông tin cá nhân và tài khoản của bạn</p>
          </div>
        </div>
        <MyProfile user={user} />
      </div>
    );
  }

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await authApi.register({ ...form, departmentId: form.departmentId || undefined, positionId: form.positionId || undefined });
      setShowAdd(false);
      setForm({ fullName: '', email: '', password: '', phone: '', dob: '', role: 'Employee', departmentId: '', positionId: '' });
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
    setEditForm({ fullName: emp.fullName, phone: emp.phone, dob: emp.dob || '', role: emp.role, departmentId: emp.departmentId || '', positionId: emp.positionId || '', isActive: emp.isActive });
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
                  <th>Nhân viên</th><th>Email</th><th>Điện thoại</th><th>Ngày sinh</th>
                  <th>Phòng ban</th><th>Chức vụ</th><th>Vai trò</th>
                  <th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                          {emp.avatar ? <img src={emp.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{emp.fullName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.phone}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.dob ? new Date(emp.dob).toLocaleDateString('vi-VN') : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
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
                {[['fullName', 'Họ tên *', 'text'], ['email', 'Email *', 'email'], ['password', 'Mật khẩu *', 'password'], ['phone', 'Điện thoại', 'text'], ['dob', 'Ngày sinh', 'date']].map(([field, label, type]) => (
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
                <div><label className="form-label">Ngày sinh</label><input type="date" className="form-input" value={editForm.dob} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} /></div>
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
