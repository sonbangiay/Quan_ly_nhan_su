'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { leaveApi } from '@/lib/api';
import { Plus, Check, X, Calendar, FileText, Trash2 } from 'lucide-react';

interface LeaveRequest { id: string; employeeId: string; employeeName: string; leaveType: string; startDate: string; endDate: string; reason: string; status: string; approvedById?: string; approvedByName?: string; approvalNotes?: string; createdAt: string; }

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [showApprove, setShowApprove] = useState<LeaveRequest | null>(null);
  const [approveForm, setApproveForm] = useState({ status: 'Approved', approvalNotes: '' });

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getRequests();
      setRequests(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await leaveApi.submitRequest({ ...form, employeeId: user?.id, employeeName: user?.fullName });
      setShowAdd(false); setForm({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' }); fetchRequests();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'); }
    setSaving(false);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showApprove) return; setSaving(true); setError('');
    try {
      await leaveApi.approveRequest(showApprove.id, approveForm);
      setShowApprove(null); fetchRequests();
    } catch (err: unknown) { setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'); }
    setSaving(false);
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn xin nghỉ phép này không?')) return;
    try {
      await leaveApi.deleteRequest(id);
      fetchRequests();
    } catch (err) {
      alert('Lỗi khi xóa đơn xin nghỉ phép');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <span className="badge badge-green">Đã duyệt</span>;
      case 'Rejected': return <span className="badge badge-red">Từ chối</span>;
      default: return <span className="badge badge-orange">Chờ duyệt</span>;
    }
  };

  const getLeaveTypeStr = (type: string) => {
    switch(type) {
      case 'Annual': return 'Nghỉ phép năm';
      case 'Sick': return 'Nghỉ ốm';
      case 'Unpaid': return 'Nghỉ không lương';
      default: return type;
    }
  };

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  const matchesDateFilter = (req: LeaveRequest) => {
    if (!filterStartDate && !filterEndDate) return true;
    // Set hours to 0 to compare just dates
    const reqStart = new Date(req.startDate); reqStart.setHours(0,0,0,0);
    const reqEnd = new Date(req.endDate); reqEnd.setHours(23,59,59,999);
    
    let isValid = true;
    if (filterStartDate) {
      const startFilter = new Date(filterStartDate); startFilter.setHours(0,0,0,0);
      isValid = isValid && reqEnd.getTime() >= startFilter.getTime();
    }
    if (filterEndDate) {
      const endFilter = new Date(filterEndDate); endFilter.setHours(23,59,59,999);
      isValid = isValid && reqStart.getTime() <= endFilter.getTime();
    }
    return isValid;
  };

  const myRequests = requests.filter(r => r.employeeId === user?.id && matchesDateFilter(r));
  const pendingRequests = requests.filter(r => r.status === 'Pending' && r.employeeId !== user?.id && matchesDateFilter(r));
  const handledRequests = requests.filter(r => r.status !== 'Pending' && r.employeeId !== user?.id && matchesDateFilter(r));

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý Nghỉ phép</h1>
          <p className="page-subtitle">Yêu cầu nghỉ phép và phê duyệt</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Xin nghỉ phép</button>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> Lọc theo ngày nghỉ:</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Từ ngày</label>
          <input type="date" className="form-input" style={{ padding: '6px 12px', width: 'auto' }} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đến ngày</label>
          <input type="date" className="form-input" style={{ padding: '6px 12px', width: 'auto' }} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
        </div>
        {(filterStartDate || filterEndDate) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}>
            <X size={14} /> Xóa lọc
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {isManagerOrAdmin && pendingRequests.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-orange)', display: 'inline-block' }}></span>
              Đơn xin nghỉ chờ duyệt ({pendingRequests.length})
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Loại nghỉ</th>
                    <th>Từ ngày</th>
                    <th>Đến ngày</th>
                    <th>Lý do</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600 }}>{req.employeeName}</td>
                      <td>{getLeaveTypeStr(req.leaveType)}</td>
                      <td>{new Date(req.startDate).toLocaleDateString('vi-VN')}</td>
                      <td>{new Date(req.endDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{req.reason}</td>
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => { setShowApprove(req); setApproveForm({ status: 'Approved', approvalNotes: '' }); }}>Duyệt / Từ chối</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Lịch sử xin nghỉ phép của tôi
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" style={{ width: 24, height: 24, borderWidth: 2, display: 'inline-block' }} /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loại nghỉ</th>
                    <th>Từ ngày</th>
                    <th>Đến ngày</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú duyệt</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map(req => (
                    <tr key={req.id}>
                      <td>{getLeaveTypeStr(req.leaveType)}</td>
                      <td>{new Date(req.startDate).toLocaleDateString('vi-VN')}</td>
                      <td>{new Date(req.endDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{req.reason}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{req.approvalNotes || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: 4, background: 'none', border: 'none', color: 'var(--accent-red)' }} 
                          onClick={() => handleDeleteRequest(req.id)}
                          title="Xóa đơn này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {myRequests.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có đơn xin nghỉ phép nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isManagerOrAdmin && handledRequests.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Lịch sử phê duyệt</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Thời gian nghỉ</th>
                    <th>Trạng thái</th>
                    <th>Người duyệt</th>
                    <th>Ghi chú</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {handledRequests.map(req => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600 }}>{req.employeeName}</td>
                      <td>{new Date(req.startDate).toLocaleDateString('vi-VN')} - {new Date(req.endDate).toLocaleDateString('vi-VN')}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{req.approvedByName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{req.approvalNotes}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: 4, background: 'none', border: 'none', color: 'var(--accent-red)' }} 
                          onClick={() => handleDeleteRequest(req.id)}
                          title="Xóa đơn này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Đơn xin nghỉ phép mới</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleAdd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Loại nghỉ phép</label>
                  <select className="form-input" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                    <option value="Annual">Nghỉ phép năm</option>
                    <option value="Sick">Nghỉ ốm</option>
                    <option value="Unpaid">Nghỉ không lương</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Từ ngày *</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                  <div><label className="form-label">Đến ngày *</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
                </div>
                <div><label className="form-label">Lý do *</label><textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required placeholder="Ghi rõ lý do xin nghỉ..." /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Gửi đơn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApprove && (
        <div className="modal-overlay" onClick={() => setShowApprove(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Duyệt đơn xin nghỉ: {showApprove.employeeName}</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>{error}</div>}
            <div style={{ background: 'var(--bg-hover)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              <p><strong>Loại:</strong> {getLeaveTypeStr(showApprove.leaveType)}</p>
              <p><strong>Thời gian:</strong> {new Date(showApprove.startDate).toLocaleDateString('vi-VN')} - {new Date(showApprove.endDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Lý do:</strong> {showApprove.reason}</p>
            </div>
            <form onSubmit={handleApprove}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Quyết định</label>
                  <select className="form-input" value={approveForm.status} onChange={e => setApproveForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="Approved">Chấp nhận</option>
                    <option value="Rejected">Từ chối</option>
                  </select>
                </div>
                <div><label className="form-label">Ghi chú duyệt</label><textarea className="form-input" rows={2} value={approveForm.approvalNotes} onChange={e => setApproveForm(f => ({ ...f, approvalNotes: e.target.value }))} placeholder="Lý do từ chối hoặc lời nhắn..." /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApprove(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Xác nhận'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
