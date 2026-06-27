'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, employeeApi } from '@/lib/api';
import { Calendar as CalIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '—';
  // Nếu backend trả về ISO datetime (ví dụ: 1899-12-30T08:53:58.000Z)
  // Lấy trực tiếp phần time tránh bị Date tự cộng 7 tiếng múi giờ
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return timePart.slice(0, 8); // "08:53:58"
  }
  return timeStr;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  // Edit State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ timeIn: '', timeOut: '' });

  // Admin View State
  const [activeTab, setActiveTab] = useState<'details' | 'summary'>('details');
  const [filterEmpId, setFilterEmpId] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getAttendanceLogs({ startDate, endDate });
      setLogs(res.data);
    } catch {}
    setLoading(false);
  };

  const handleSaveLog = async (logId: string) => {
    try {
      // Xác định lại trạng thái dựa trên giờ check-in mới (nếu sửa timeIn)
      let status = 'Present';
      if (editForm.timeIn) {
        const [h, m] = editForm.timeIn.split(':').map(Number);
        if ((h > 7) || (h === 7 && m > 30)) {
          status = 'Late';
        }
      }
      await attendanceApi.updateLog(logId, { 
        timeIn: editForm.timeIn || null, 
        timeOut: editForm.timeOut || null,
        status
      });
      setEditingLogId(null);
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu');
    }
  };

  useEffect(() => { fetchLogs(); }, [startDate, endDate]);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // For employee stats
  const processedLogs = logs.map(l => {
    let workHours = l.workHours || 0;
    if (!l.workHours && l.timeIn && l.timeOut) {
      const [hIn, mIn] = l.timeIn.split(':').map(Number);
      const [hOut, mOut] = l.timeOut.split(':').map(Number);
      if (!isNaN(hIn) && !isNaN(hOut)) {
        workHours = (hOut + mOut / 60) - (hIn + mIn / 60);
        if (workHours < 0) workHours = 0;
      }
    }
    return { ...l, checkInTime: l.timeIn || l.checkInTime, checkOutTime: l.timeOut || l.checkOutTime, workHours };
  });

  const myLogs = processedLogs.filter(l => l.employeeId === user?.id);
  
  // Lấy danh sách nhân viên có trong logs để làm bộ lọc
  const uniqueEmps = Array.from(new Set(logs.map(l => l.employeeId)))
    .map(id => logs.find(l => l.employeeId === id))
    .filter(Boolean);

  // Tính toán dữ liệu tổng hợp
  const employeeSummary = uniqueEmps.map(emp => {
    const empLogs = processedLogs.filter(l => l.employeeId === emp.employeeId);
    const totalDays = empLogs.length;
    const lateDays = empLogs.filter(l => l.status === 'Late').length;
    const totalHours = empLogs.reduce((acc, curr) => acc + (curr.workHours || 0), 0);
    return { empId: emp.employeeId, empName: emp.employeeName || '—', totalDays, lateDays, totalHours };
  });

  // Data hiển thị cho tab chi tiết
  const displayLogs = isManagerOrAdmin 
    ? (filterEmpId ? processedLogs.filter(l => l.employeeId === filterEmpId) : processedLogs)
    : myLogs;

  const getStatsLogs = () => {
    if (!isManagerOrAdmin) return myLogs;
    if (filterEmpId) return displayLogs;
    return null; // Không hiển thị stats chung nếu đang xem tất cả
  };
  const statsLogs = getStatsLogs();
  const totalDays = statsLogs ? statsLogs.length : 0;
  const lateDays = statsLogs ? statsLogs.filter(l => l.status === 'Late').length : 0;
  const totalHours = statsLogs ? statsLogs.reduce((acc, curr) => acc + (curr.workHours || 0), 0) : 0;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Present': return <span className="badge badge-green">Đúng giờ</span>;
      case 'Late': return <span className="badge badge-orange">Đi trễ</span>;
      case 'Absent': return <span className="badge badge-red">Vắng mặt</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý Chấm công</h1>
          <p className="page-subtitle">Dữ liệu giờ giấc làm việc</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Từ ngày</label>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Đến ngày</label>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {isManagerOrAdmin && activeTab === 'details' && (
          <div>
            <label className="form-label">Nhân viên</label>
            <select className="form-input" value={filterEmpId} onChange={e => setFilterEmpId(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">Tất cả nhân viên</option>
              {uniqueEmps.map(emp => (
                <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isManagerOrAdmin && (
        <div style={{ marginBottom: 20, display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          <button 
            className={`btn ${activeTab === 'details' ? 'btn-primary' : ''}`} 
            style={{ background: activeTab !== 'details' ? 'transparent' : undefined, border: 'none' }} 
            onClick={() => setActiveTab('details')}
          >
            Chi tiết chấm công
          </button>
          <button 
            className={`btn ${activeTab === 'summary' ? 'btn-primary' : ''}`} 
            style={{ background: activeTab !== 'summary' ? 'transparent' : undefined, border: 'none' }} 
            onClick={() => setActiveTab('summary')}
          >
            Tổng hợp theo nhân viên
          </button>
        </div>
      )}

      {statsLogs && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Số ngày đi làm</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={24} /> {totalDays}</p>
          </div>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Số ngày đi trễ</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={24} /> {lateDays}</p>
          </div>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Tổng giờ làm</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={24} /> {totalHours.toFixed(1)}h</p>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeTab === 'summary' && isManagerOrAdmin ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Số ngày đi làm</th>
                    <th>Số ngày đi trễ</th>
                    <th>Tổng giờ làm</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary.map(emp => (
                    <tr key={emp.empId}>
                      <td style={{ fontWeight: 600 }}>{emp.empName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{emp.totalDays} ngày</td>
                      <td style={{ fontWeight: 600, color: emp.lateDays > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>{emp.lateDays} ngày</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{emp.totalHours.toFixed(1)}h</td>
                    </tr>
                  ))}
                  {employeeSummary.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có dữ liệu tổng hợp.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {isManagerOrAdmin && <th>Nhân viên</th>}
                    <th>Ngày</th>
                    <th>Giờ Check-in</th>
                    <th>Giờ Check-out</th>
                    <th>Số giờ làm</th>
                    <th>Trạng thái</th>
                    {isManagerOrAdmin && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map(log => (
                    <tr key={log.id}>
                      {isManagerOrAdmin && <td style={{ fontWeight: 600 }}>{log.employeeName || '—'}</td>}
                      <td>{new Date(log.date).toLocaleDateString('vi-VN')}</td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 14 }}>
                        {editingLogId === log.id ? (
                          <input type="time" step="1" className="form-input" style={{ padding: '2px 6px', height: 28 }} value={editForm.timeIn} onChange={e => setEditForm({...editForm, timeIn: e.target.value})} />
                        ) : formatTime(log.checkInTime)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 14 }}>
                        {editingLogId === log.id ? (
                          <input type="time" step="1" className="form-input" style={{ padding: '2px 6px', height: 28 }} value={editForm.timeOut} onChange={e => setEditForm({...editForm, timeOut: e.target.value})} />
                        ) : formatTime(log.checkOutTime)}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{log.workHours ? `${log.workHours.toFixed(1)}h` : '—'}</td>
                      <td>{getStatusBadge(log.status)}</td>
                      {isManagerOrAdmin && (
                        <td>
                          {editingLogId === log.id ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-success btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleSaveLog(log.id)}>Lưu</button>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => setEditingLogId(null)}>Hủy</button>
                            </div>
                          ) : (
                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => { setEditingLogId(log.id); setEditForm({ timeIn: log.checkInTime || '', timeOut: log.checkOutTime || '' }); }}>Sửa</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {displayLogs.length === 0 && (
                    <tr><td colSpan={isManagerOrAdmin ? 7 : 6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có dữ liệu chấm công.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
